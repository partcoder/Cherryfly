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

export const saveMovieToStorage = async (movie: Movie, mainFile?: File): Promise<Movie> => {
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

  // 1.1 Upload Comic Pages
  const finalComicPages: string[] = [];
  if (movie.comicPages && movie.comicPages.length > 0) {
    for (let i = 0; i < movie.comicPages.length; i++) {
      let page = movie.comicPages[i];

      // Ensure data: prefix for raw base64
      if (!page.startsWith('data:') && !page.startsWith('http') && page.length > 100) {
        page = `data:image/jpeg;base64,${page}`;
      }

      if (page.startsWith('data:')) {
        const pageBlob = base64ToBlob(page);
        // Use a random suffix to avoid index-based collisions during rearrangements
        const uniqueId = Math.random().toString(36).substring(2, 9);
        const pageUrl = await uploadToStorage(`${movie.id}/page_${uniqueId}_${i}.png`, pageBlob);
        finalComicPages.push(pageUrl);
      } else {
        finalComicPages.push(page);
      }
    }
  }

  // Deduplicate URLs (defensive)
  const uniquePages = Array.from(new Set(finalComicPages));

  // 2. Pack ALL metadata into the description string
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
    `COMIC${FIELD_SEP}${JSON.stringify(uniquePages)}`,
    `DESC${FIELD_SEP}${movie.description || ''}`
  ].join(META_SEP);

  console.log("Saving Movie Metadata:", {
    id: movie.id,
    title: movie.title,
    count: uniquePages.length,
    thumb: thumbnailUrl
  });

  // 3. Upsert
  const { error } = await supabase.from('movies').upsert({
    id: movie.id,
    title: movie.title,
    description: packedMeta,
    created_at: movie.createdAt
  });

  if (error) {
    console.error("Supabase Upsert Error:", error);
    throw new Error(`Database Error: ${error.message} (Code: ${error.code})`);
  }

  // Return the movie with REAL URLs
  return {
    ...movie,
    thumbnailUrl,
    videoUrl: mediaUrl,
    comicPages: uniquePages
  };
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

    let comicPages = parseJSON(meta.COMIC, []);
    let mediaType: 'VIDEO' | 'PHOTO' | 'COMIC' = (meta.TYPE as any) || 'VIDEO';

    if (comicPages.length > 0) {
      console.log(`Parsed Album: ${row.title} - Count: ${comicPages.length} - Type: ${mediaType}`);
    }

    // Robust Inference: If it has comic pages, it COULD be a comic or a photo album
    // We only force COMIC if it's not already explicitly a PHOTO
    if (comicPages && comicPages.length > 0 && mediaType !== 'PHOTO') {
      mediaType = 'COMIC';
    }

    // Repair Mechanism: Specific titles reported by the user
    const comicTitles = [
      "Vision Life", "God of tomorrow", "verdant breach",
      "last scion:the convergence", "the after image",
      "mindshift:1984", "element zero", "the convergence of kings"
    ];

    const photoTitles = [
      "vandal hearts scribble '26", "vandal hearts scribble 26"
    ];

    const normalize = (s: string) => s.toLowerCase().replace(/[-\s]/g, '');
    const normTitle = normalize(row.title || '');

    if (comicTitles.some(t => normTitle.includes(normalize(t)))) {
      mediaType = 'COMIC';
    }

    let videoUrl = meta.VIDEO || row.video_url || '';
    let thumbnailUrl = meta.THUMB || row.thumbnail_url || '';

    if (photoTitles.some(t => normTitle.includes(normalize(t)))) {
      mediaType = 'PHOTO';
    }

    if (comicPages.length > 0) {
      console.log(`Unpacked Album: ${row.title} | Type: ${mediaType} | Pages: ${comicPages.length} | Thumb: ${thumbnailUrl.substring(0, 50)}...`);
    }

    if (mediaType === 'COMIC' && comicPages.length === 0) {
      const { data: publicData } = supabase.storage.from('media').getPublicUrl(`${row.id}/page_0.png`);
      // We link at least 4 pages defensively if it's a comic
      comicPages = [
        publicData.publicUrl,
        publicData.publicUrl.replace('page_0.png', 'page_1.png'),
        publicData.publicUrl.replace('page_0.png', 'page_2.png'),
        publicData.publicUrl.replace('page_0.png', 'page_3.png'),
      ];
    }

    return {
      id: row.id,
      title: row.title,
      description: meta.DESC || raw,
      searchContext: meta.SEARCH || '',
      // Prefer packed metadata, fallback to column if it exists (legacy support)
      thumbnailUrl: thumbnailUrl,
      videoUrl: videoUrl,
      matchScore: parseNumber(meta.MATCH, row.match_score || 0),
      year: parseNumber(meta.YEAR, row.year || new Date().getFullYear()),
      duration: meta.DUR || (mediaType === 'COMIC' ? "Comic Issue" : "Unknown"),
      genre: parseJSON(meta.GENRE, row.genre || []),
      comicPages: comicPages,
      createdAt: row.created_at,
      mediaType: mediaType,
      folderName: meta.FOLDER || undefined,
      aiStatus: (meta.STATUS as any) || 'COMPLETED'
    };
  });
};

export const updateMovieInStorage = async (id: string, updates: Partial<Movie>): Promise<Movie> => {
  // 1. Fetch current row directly to avoid side-effects from global repairs
  const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();
  if (error || !data) throw new Error(`Movie not found: ${id}`);

  // 2. Unpack ONLY this movie's metadata
  const raw = data.description || '';
  const meta: Record<string, string> = {};
  if (raw.includes(META_SEP)) {
    raw.split(META_SEP).forEach((part: string) => {
      const [key, ...rest] = part.split(FIELD_SEP);
      const val = rest.join(FIELD_SEP);
      if (key && val !== undefined) meta[key] = val;
    });
  }

  const parseJSON = (str: string | undefined, fallback: any) => {
    try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
  };

  const currentMovie: Movie = {
    id: data.id,
    title: data.title,
    description: meta.DESC || raw,
    searchContext: meta.SEARCH || '',
    thumbnailUrl: meta.THUMB || data.thumbnail_url || '',
    videoUrl: meta.VIDEO || data.video_url || '',
    matchScore: parseInt(meta.MATCH || '0'),
    year: parseInt(meta.YEAR || '2024'),
    duration: meta.DUR || "Unknown",
    genre: parseJSON(meta.GENRE, []),
    comicPages: parseJSON(meta.COMIC, []),
    createdAt: data.created_at,
    mediaType: (meta.TYPE as any) || 'VIDEO',
    folderName: meta.FOLDER || undefined,
    aiStatus: (meta.STATUS as any) || 'COMPLETED'
  };

  const updatedMovie = { ...currentMovie, ...updates };

  console.log("Updating Movie Storage:", {
    id,
    updates: Object.keys(updates),
    finalPageCount: updatedMovie.comicPages?.length
  });

  // Re-save using the safe packing logic
  return await saveMovieToStorage(updatedMovie);
};

export const deleteMovieFromStorage = async (id: string): Promise<void> => {
  const { error } = await supabase.from('movies').delete().eq('id', id);
  if (error) throw error;
};