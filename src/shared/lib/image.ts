/**
 * Client-side image helpers for avatar uploads. Downscaling before we ever store
 * or send the bytes keeps avatars tiny (a few KB), so they persist safely in the
 * auth store's localStorage and upload fast once the backend is live.
 */

/** Largest source file we accept before resizing (guards against huge uploads). */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** Any bitmap image is accepted; it is normalised to a small square data URL. */
export function isAcceptedImage(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Read an image File and return a compact, square-cropped data URL no larger
 * than `size`×`size`. Falls back to the raw data URL if the canvas is unavailable.
 */
export async function fileToAvatarDataUrl(file: File, size = 256, quality = 0.85): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  // Cover-fit: crop the shorter side so the square is filled with no distortion.
  const source = Math.min(img.width, img.height);
  const sx = (img.width - source) / 2;
  const sy = (img.height - source) / 2;
  ctx.drawImage(img, sx, sy, source, source, 0, 0, size, size);

  return canvas.toDataURL('image/webp', quality);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('image-read-failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = src;
  });
}
