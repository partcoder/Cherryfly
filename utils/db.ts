import { Movie } from '../types';
import { supabase } from './supabaseClient';

const SEARCH_SEPARATOR = "|||SEARCH_CTX|||";
const FOLDER_SEPARATOR = "|||FOLDER|||";

/**
 * Helper to convert a Base64 Data URI to a Blob for uploading.
 */
const base64ToBlob = (dataURI: string): Blob => {
  const splitDataURI = dataURI.split(',');
  const byteString = splitDataURI[0].indexOf('base64') >= 0 
    ? atob(splitDataURI[1]) 
    : decodeURI(splitDataURI[1]);
  
  const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
  const ia = new Uint8Array(byteString.length);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ia], { type: mimeString });
};

/**
 * Uploads a file (blob) to Supabase Storage and returns the public URL.
 */
const uploadToStorage = async (path: string, blob: Blob): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from('media')
    .getPublicUrl(path);

  return publicData.publicUrl;
};

export const saveMovieToStorage = async (movie: Movie, mainFile?: File): Promise<void> => {
  try {
    // 1. Upload Thumbnail (Poster)
    const thumbnailBlob = base64ToBlob(movie.thumbnailUrl);
    const thumbnailPath = `${movie.id}/poster.png`;
    const publicThumbnailUrl = await uploadToStorage(thumbnailPath, thumbnailBlob);

    // 2. Upload Comic Pages (if any)
    let publicComicUrls: string[] = [];
    if (movie.comicPages && movie.comicPages.length > 0) {
      const uploadPromises = movie.comicPages.map(async (pageBase64, index) => {
        const pageBlob = base64ToBlob(pageBase64);
        const pagePath = `${movie.id}/page_${index + 1}.png`;
        return await uploadToStorage(pagePath, pageBlob);
      });
      publicComicUrls = await Promise.all(uploadPromises);
    }

    // 3. Upload Main Media File (Video or Photo)
    let publicMediaUrl = '';
    if (mainFile) {
        const extension = mainFile.name.split('.').pop() || 'dat';
        const mediaPath = `${movie.id}/main.${extension}`;
        publicMediaUrl = await uploadToStorage(mediaPath, mainFile);
    }

    // 3. Save Metadata to DB
    // Format: description |||SEARCH_CTX||| searchContext |||FOLDER||| folderName
    let combinedDescription = `${movie.description}${SEARCH_SEPARATOR}${movie.searchContext || ''}`;
    if (movie.folderName) {
        combinedDescription += `${FOLDER_SEPARATOR}${movie.folderName}`;
    }

    const { error } = await supabase
      .from('movies')
      .insert({
        id: movie.id,
        title: movie.title,
        description: combinedDescription,
        thumbnail_url: publicThumbnailUrl,
        video_url: publicMediaUrl, // Using video_url column for both video and photo URL
        comic_pages: publicComicUrls,
        match_score: movie.matchScore,
        year: movie.year,
        genre: movie.genre,
        created_at: movie.createdAt || new Date().toISOString(),
        media_type: movie.mediaType || (movie.comicPages?.length ? 'COMIC' : 'VIDEO') // Default fallback
      });

    if (error) throw error;

  } catch (error) {
    console.error('Error saving to Supabase:', error);
    throw new Error('Failed to save to cloud storage.');
  }
};

export const updateMovieInStorage = async (id: string, updates: Partial<Movie>): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  
  // We need to fetch the current record to properly construct the description string if we are updating parts of it
  // But for simplicity in this demo, we assume the UI passes the full object or we just handle what we have.
  // Ideally, we'd read -> merge -> save.
  
  if (updates.description !== undefined || updates.searchContext !== undefined || updates.folderName !== undefined) {
      // Since the caller usually has the full movie object state in the EditModal, 
      // we expect them to pass the *current* state of the other fields if they aren't changing,
      // OR we fetch here. Let's rely on the passed updates having what we need if it's a "save" operation.
      // However, `updates` is Partial. 
      
      // Let's do a quick fetch to get current state if we are doing a partial update on these fields
      const { data: current } = await supabase.from('movies').select('description').eq('id', id).single();
      if (current) {
          const fullDesc = current.description || '';
          const [visibleDesc, rest] = fullDesc.split(SEARCH_SEPARATOR);
          let searchCtx = '';
          let folderName = '';
          
          if (rest) {
              const [s, f] = rest.split(FOLDER_SEPARATOR);
              searchCtx = s || '';
              folderName = f || '';
          }

          const newDesc = updates.description !== undefined ? updates.description : visibleDesc;
          const newSearchCtx = updates.searchContext !== undefined ? updates.searchContext : searchCtx;
          const newFolderName = updates.folderName !== undefined ? updates.folderName : folderName;

          let finalDesc = `${newDesc}${SEARCH_SEPARATOR}${newSearchCtx}`;
          if (newFolderName) {
              finalDesc += `${FOLDER_SEPARATOR}${newFolderName}`;
          }
          dbUpdates.description = finalDesc;
      }
  }
  
  if (updates.createdAt) dbUpdates.created_at = updates.createdAt;
  
  const { error } = await supabase
    .from('movies')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error("Error updating movie:", error);
    throw error;
  }
};

export const deleteMovieFromStorage = async (id: string): Promise<void> => {
    // 1. Delete record from DB
    const { error } = await supabase
      .from('movies')
      .delete()
      .eq('id', id);
  
    if (error) {
      console.error("Error deleting movie from DB:", error);
      throw error;
    }

    // 2. Cleanup Storage (Optional but recommended)
    const filesToDelete = [`${id}/poster.png`, `${id}/main.mp4`, `${id}/main.png`, `${id}/main.jpg`, `${id}/main.jpeg`, `${id}/main.mov`];
    for(let i=1; i<=4; i++) filesToDelete.push(`${id}/page_${i}.png`);
    
    await supabase.storage.from('media').remove(filesToDelete);
};

export const getMoviesFromStorage = async (): Promise<Movie[]> => {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching from Supabase:', error);
    return [];
  }

  return data.map((row: any) => {
    const fullDesc = row.description || '';
    
    // Parse our custom format: desc |||SEARCH||| context |||FOLDER||| folderName
    const [visibleDesc, rest] = fullDesc.split(SEARCH_SEPARATOR);
    let hiddenSearch = '';
    let folderName = '';

    if (rest) {
        const [search, folder] = rest.split(FOLDER_SEPARATOR);
        hiddenSearch = search || '';
        folderName = folder || '';
    }

    // Determine media type if missing (migration compat)
    let mType = row.media_type;
    if (!mType) {
        if (row.comic_pages && row.comic_pages.length > 0) mType = 'COMIC';
        else mType = 'VIDEO'; // Assume video for old records
    }

    return {
        id: row.id,
        title: row.title,
        description: visibleDesc || fullDesc,
        searchContext: hiddenSearch,
        folderName: folderName,
        thumbnailUrl: row.thumbnail_url,
        videoUrl: row.video_url || '', 
        comicPages: row.comic_pages,
        matchScore: row.match_score,
        year: row.year,
        duration: mType === 'COMIC' ? "Comic Issue" : (mType === 'PHOTO' ? "Photo" : "Video"),
        genre: row.genre || [],
        createdAt: row.created_at,
        mediaType: mType
    };
  });
};