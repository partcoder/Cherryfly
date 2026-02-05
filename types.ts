export interface Movie {
  id: string;
  title: string;
  description: string;
  searchContext: string; // Hidden field for deep AI search (transcriptions, details)
  thumbnailUrl: string; // The generated AI poster
  videoUrl: string; // The URL for the uploaded video or photo
  comicPages?: string[]; // Array of base64 images for the comic
  matchScore: number; // Fake "98% Match"
  year: number;
  duration: string;
  genre: string[];
  createdAt: string; // ISO Date string
  mediaType: 'VIDEO' | 'PHOTO' | 'COMIC';
  folderName?: string; // Custom folder name
  aiStatus: 'COMPLETED' | 'PENDING' | 'FAILED'; // New field for fallback handling
}

export interface GeneratedMetadata {
  title: string;
  description: string;
  searchContext: string;
  genre: string[];
  mood: string;
}

export enum AnalysisStage {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING', // Extracting frame
  ANALYZING = 'ANALYZING',   // Gemini analyzing text
  GENERATING = 'GENERATING', // Gemini generating image
  GENERATING_COMIC = 'GENERATING_COMIC', // Gemini generating comic pages
  SAVING = 'SAVING',         // Uploading to Supabase
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type ViewMode = 'STREAM' | 'TIMELINE' | 'FOLDERS';