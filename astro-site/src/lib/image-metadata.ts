import catalog from './image-metadata.json';
export interface ImageMetadata {
  width: number;
  height: number;
  alt: string;
  kind: 'photo' | 'diagram' | 'notice';
}
const images = catalog as Record<string, ImageMetadata>;
export function imageKey(src: string): string {
  return decodeURIComponent(src.split(/[?#]/, 1)[0]);
}
export function getImageMetadata(src: string): ImageMetadata | undefined {
  const key = imageKey(src);
  return Object.hasOwn(images, key) ? images[key] : undefined;
}
export function getRoomImageMetadata(src: string): ImageMetadata {
  const metadata = getImageMetadata(src);
  if (!metadata) throw new Error(`Missing reviewed image metadata: ${src}`);
  return metadata;
}
