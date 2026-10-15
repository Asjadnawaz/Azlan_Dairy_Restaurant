"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";
import {
  FALLBACK_MENU_IMAGE,
  getMenuImageBlur,
  getMenuImageKey,
  getMenuImageUrl,
} from "@/lib/menu-image";

type MenuImageProps = Omit<ImageProps, "src" | "loader" | "placeholder" | "blurDataURL"> & {
  src?: string | null;
};

function loader({ src, width, quality }: ImageLoaderProps): string {
  const key = getMenuImageKey(src);
  // Known menu photos are served from pre-built, right-sized files (no
  // on-demand conversion); anything else falls back to the Next.js optimizer.
  if (key) return getMenuImageUrl(key, width);
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
}

/**
 * Menu photo backed by the pre-generated variants in `public/images/menu`
 * (see `scripts/optimize-images.mjs`). Shows a blurred preview while loading.
 */
export function MenuImage({ src, alt, ...props }: MenuImageProps) {
  const resolved = src || FALLBACK_MENU_IMAGE;
  const blurDataURL = getMenuImageBlur(resolved);

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      loader={loader}
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL}
    />
  );
}
