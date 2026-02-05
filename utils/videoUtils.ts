/**
 * Extracts a specific frame from a video file as a Base64 string.
 * @param videoFile The video file object.
 * @param timeInSeconds The timestamp to capture (default 1s to avoid black frames).
 */
export const extractFrame = async (videoFile: File, timeInSeconds: number = 2): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(videoFile);
  
      // Basic attributes to ensure background loading works
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      
      // Do NOT set crossOrigin for local object URLs as it can sometimes cause CORS errors unnecessarily
      // video.crossOrigin = 'anonymous'; 

      // Timeout safety
      const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Video processing timed out. The file might be corrupted or incompatible."));
      }, 10000);

      const cleanup = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(url);
          video.onloadedmetadata = null;
          video.onseeked = null;
          video.onerror = null;
          video.removeAttribute('src');
          video.load();
      };
  
      // 1. Wait for metadata
      video.onloadedmetadata = () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            cleanup();
            reject(new Error("Invalid video dimensions (0x0)."));
            return;
        }

        let seekTime = timeInSeconds;
        // Adjust seek time if video is short
        if (Number.isFinite(video.duration) && video.duration > 0) {
            if (seekTime > video.duration) {
                seekTime = video.duration > 1 ? 1 : video.duration / 2;
            }
        }
        
        // 2. Trigger seek
        video.currentTime = seekTime;
      };
  
      // 3. Wait for seek to complete
      video.onseeked = () => {
        if (!ctx) {
            cleanup();
            reject(new Error("Canvas context missing."));
            return;
        }

        // Small delay to ensure the frame buffer is painted
        requestAnimationFrame(() => {
            const width = video.videoWidth;
            const height = video.videoHeight;

            if (!width || !height) {
                 cleanup();
                 reject(new Error("Invalid video dimensions after seek."));
                 return; 
            }

            // Resize logic (Max 512px) for AI performance
            const MAX_DIMENSION = 512;
            let drawWidth = width;
            let drawHeight = height;

            if (width > height) {
                if (width > MAX_DIMENSION) {
                    drawHeight = height * (MAX_DIMENSION / width);
                    drawWidth = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    drawWidth = width * (MAX_DIMENSION / height);
                    drawHeight = MAX_DIMENSION;
                }
            }

            canvas.width = drawWidth;
            canvas.height = drawHeight;
            
            try {
                ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
                
                // Convert to base64 jpeg
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                const base64 = dataUrl.split(',')[1];
                
                cleanup();
                resolve(base64);
            } catch (e) {
                cleanup();
                console.error(e);
                reject(new Error("Failed to capture video frame."));
            }
        });
      };
  
      video.onerror = (e) => {
        cleanup();
        console.error("Video Error:", e);
        reject(new Error("Error loading video file. It may be corrupt or an unsupported format."));
      };
      
      // Explicitly load
      video.load();
    });
};

/**
 * Converts a file to a Base64 string.
 */
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};