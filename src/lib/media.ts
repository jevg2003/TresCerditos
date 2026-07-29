import type { ImageMetadata } from "astro";

export type GalleryItem =
  | { kind: "image"; src: ImageMetadata; alt: string }
  | { kind: "video"; src: string; poster: string; alt: string };

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/images/*.{jpeg,jpg,png,webp}",
  { eager: true },
);

/** Videos live in public/ because they are streamed, not processed by astro:assets. */
const VIDEO_FILES = [
  "video-36.mp4",
  "video-37.mp4",
  "video-38.mp4",
  "video-39.mp4",
  "video-47.mp4",
  "video-48.mp4",
  "video-49.mp4",
] as const;

const orderOf = (name: string): number => {
  const match = name.match(/-(\d+)\./);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const images: GalleryItem[] = Object.entries(imageModules)
  .filter(([filePath]) => !filePath.includes("logo"))
  .map(([filePath, module]) => ({
    kind: "image" as const,
    src: module.default,
    alt: "Lechona, pernil y platos tradicionales de Lechonería Los Tres Cerditos",
    _order: orderOf(filePath),
  }))
  .map(({ _order, ...item }) => item);

const videos: GalleryItem[] = VIDEO_FILES.map((file) => ({
  kind: "video" as const,
  src: `/images/${file}`,
  poster: `/images/posters/${file.replace(".mp4", ".webp")}`,
  alt: "Video de la preparación de nuestra lechona",
}));

export const galleryMedia: GalleryItem[] = [...images, ...videos].sort(
  (a, b) =>
    orderOf(a.kind === "image" ? a.src.src : a.src) -
    orderOf(b.kind === "image" ? b.src.src : b.src),
);
