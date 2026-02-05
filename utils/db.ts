import { Movie } from '../types';
import { supabase } from './supabaseClient';

// Delimiters for packing metadata into the single 'description' column
const META_SEP = "|||META|||";
const FIELD_SEP = ":::";

const base64ToBlob = (dataURI: string): Blob => {
  const splitDataURI = dataURI.split(',');
  const byteString = atob(splitDataURI[1]);
  const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ia], { type: mimeString });
};

const uploadToStorage = async (path: string, blob: Blob): Promise<string> => {
  const sanitizedPath = path.replace(/[^a-zA-Z0-9\/._-]/g, '_');
  const { error } = await supabase.storage.from('media').upload(sanitizedPath, blob, { upsert: true });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from('media').getPublicUrl(sanitizedPath);
  return publicData.publicUrl;
};

export const saveMovieToStorage = async (movie: Movie, mainFile?: File): Promise<void> => {
  // 1. Upload assets
  let thumbnailUrl = movie.thumbnailUrl;
  // Only upload if it's a base64 string (newly generated), otherwise keep existing URL
  if (movie.thumbnailUrl && movie.thumbnailUrl.startsWith('data:')) {
    const thumbnailBlob = base64ToBlob(movie.thumbnailUrl);
    thumbnailUrl = await uploadToStorage(`${movie.id}/thumb.png`, thumbnailBlob);
  }
  
  let mediaUrl = movie.videoUrl;
  if (mainFile) {
    const ext = mainFile.name.split('.').pop() || 'file';
    mediaUrl = await uploadToStorage(`${movie.id}/main.${ext}`, mainFile);
  }

  // 2. Pack ALL metadata into the description string
  // This essentially turns the description column into a NoSQL JSON-like store
  // We do this to ensure the app works even if the Supabase table lacks columns like 'video_url'
  const packedMeta = [
    `TYPE${FIELD_SEP}${movie.mediaType}`,
    `STATUS${FIELD_SEP}${movie.aiStatus}`,
    `SEARCH${FIELD_SEP}${movie.searchContext || ''}`,
    `FOLDER${FIELD_SEP}${movie.folderName || ''}`,
    `VIDEO${FIELD_SEP}${mediaUrl || ''}`,
    `THUMB${FIELD_SEP}${thumbnailUrl || ''}`,
    `YEAR${FIELD_SEP}${movie.year}`,
    `MATCH${FIELD_SEP}${movie.matchScore}`,
    `GENRE${FIELD_SEP}${JSON.stringify(movie.genre)}`,
    `COMIC${FIELD_SEP}${JSON.stringify(movie.comicPages || [])}`,
    `DESC${FIELD_SEP}${movie.description || ''}`
  ].join(META_SEP);

  // 3. Upsert using ONLY the core columns that are guaranteed to exist in a basic table
  // We strictly avoid 'video_url', 'thumbnail_url', etc. in the top-level keys
  const { error } = await supabase.from('movies').upsert({
    id: movie.id,
    title: movie.title,
    description: packedMeta,
    created_at: movie.createdAt
  });

  if (error) {
    console.error("Supabase Upsert Error:", error);
    throw new Error(`Database Error: ${error.message}.`);
  }
};

export const getMoviesFromStorage = async (): Promise<Movie[]> => {
  const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error("Supabase Select Error:", error);
    return [];
  }
  if (!data) return [];

  return data.map((row: any) => {
    const raw = row.description || '';
    const meta: Record<string, string> = {};
    
    if (raw.includes(META_SEP)) {
      raw.split(META_SEP).forEach((part: string) => {
        // Handle values that might contain the separator (e.g. URLs or JSON)
        const [key, ...rest] = part.split(FIELD_SEP);
        const val = rest.join(FIELD_SEP);
        if (key && val !== undefined) meta[key] = val;
      });
    }

    // Helper parsers
    const parseJSON = (str: string | undefined, fallback: any) => {
        try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
    };

    const parseNumber = (str: string | undefined, fallback: number) => {
        const num = parseInt(str || '');
        return isNaN(num) ? fallback : num;
    };

    return {
      id: row.id,
      title: row.title,
      description: meta.DESC || raw,
      searchContext: meta.SEARCH || '',
      // Prefer packed metadata, fallback to column if it exists (legacy support)
      thumbnailUrl: meta.THUMB || row.thumbnail_url || '',
      videoUrl: meta.VIDEO || row.video_url || '',
      matchScore: parseNumber(meta.MATCH, row.match_score || 0),
      year: parseNumber(meta.YEAR, row.year || new Date().getFullYear()),
      genre: parseJSON(meta.GENRE, row.genre || []),
      comicPages: parseJSON(meta.COMIC, []),
      createdAt: row.created_at,
      mediaType: (meta.TYPE as any) || 'VIDEO',
      folderName: meta.FOLDER || undefined,
      aiStatus: (meta.STATUS as any) || 'COMPLETED'
    };
  });
};

export const updateMovieInStorage = async (id: string, updates: Partial<Movie>): Promise<void> => {
  // Fetch current state to preserve existing packed data
  const movies = await getMoviesFromStorage();
  const current = movies.find(m => m.id === id);
  if (!current) throw new Error("Movie not found");

  const updatedMovie = { ...current, ...updates };
  
  // Re-save using the safe packing logic
  // Pass undefined for file since we aren't uploading new media here
  await saveMovieToStorage(updatedMovie);
};

export const deleteMovieFromStorage = async (id: string): Promise<void> => {
  const { error } = await supabase.from('movies').delete().eq('id', id);
  if (error) throw error;
};