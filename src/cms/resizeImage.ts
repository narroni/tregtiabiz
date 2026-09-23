// Downscales and re-encodes an uploaded image as JPEG before it's sent to
// /api/cms/upload. This keeps phone photos (often 5-10MB) well under the
// upload size limit and, since every image ends up committed to the GitHub
// repo (there's no CDN/blob storage here), keeps the repo from bloating.
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function resizeImageToJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Failed to encode image.");
  return base64;
}
