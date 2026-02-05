
/**
 * Extracts multiple frames from a video file as Base64 strings.
 * Used to give the AI context from different parts of the video without uploading the whole file.
 * @param videoFile The video file object.
 * @param frameCount Number of frames to extract (default 2).
 */
export const extractFrames = async (videoFile: File, frameCount: number = 2): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(videoFile);
      const frames: string[] = [];
  
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;

      const cleanup = () => {
          URL.revokeObjectURL(url);
          video.removeAttribute('src');
          video.load();
      };
      
      video.onloadedmetadata = async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            cleanup();
            reject(new Error("Invalid video dimensions."));
            return;
        }

        const duration = video.duration || 10;
        // Calculate seek points.
        // If 2 frames: 20% (intro/setup) and 60% (action/middle). Avoid 0% (black) and 100% (credits).
        const seekTimes: number[] = [];
        if (frameCount === 1) {
            seekTimes.push(Math.min(2, duration / 2));
        } else {
            // Distribute frames across the middle 60% of the video
            const step = (duration * 0.6) / (frameCount - 1 || 1);
            const start = duration * 0.2;
            for (let i = 0; i < frameCount; i++) {
                seekTimes.push(start + (i * step));
            }
        }

        try {
            for (const time of seekTimes) {
                await seekAndCapture(video, time, ctx, canvas);
                frames.push(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
            }
            cleanup();
            resolve(frames);
        } catch (e) {
            cleanup();
            reject(e);
        }
      };
  
      video.onerror = (e) => {
        cleanup();
        reject(new Error("Error loading video file."));
      };
      
      // Explicitly load
      video.load();
    });
};

const seekAndCapture = (video: HTMLVideoElement, time: number, ctx: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement): Promise<void> => {
    return new Promise((resolve, reject) => {
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            
            // Wait a tick for rendering
            requestAnimationFrame(() => {
                if (!ctx) return reject(new Error("No canvas context"));
                
                // Resize logic (Max 512px) for AI token efficiency
                const MAX_DIMENSION = 512;
                const width = video.videoWidth;
                const height = video.videoHeight;
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
                ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
                resolve();
            });
        };

        video.addEventListener('seeked', onSeeked);
        video.currentTime = time;
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
