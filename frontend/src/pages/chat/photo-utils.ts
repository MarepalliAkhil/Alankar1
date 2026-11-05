import type { PhotoRules, PhotoTag } from '../../api/chat';

/** Mirrors the server's limits until the conversation history says otherwise. The server checks
 *  everything again (real file type, size, dimensions): this only gives an early, clear message. */
export const DEFAULT_RULES: PhotoRules = {
  max_bytes: 5 * 1024 * 1024,
  max_side: 4096,
  max_caption: 300,
  per_minute: 6,
  per_day: 30,
  tags: [
    { key: 'style_reference', label: 'Style reference' },
    { key: 'current_hair', label: 'Current hair' },
    { key: 'other', label: 'Other' },
  ],
};

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = PHOTO_TYPES.join(',');

export const TAG_TONE: Record<PhotoTag, 'primary' | 'info' | 'neutral'> = {
  style_reference: 'primary',
  current_hair: 'info',
  other: 'neutral',
};

export function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** An early, human message for a file that can never be sent; '' when it looks fine. */
export function checkPhoto(file: File, rules: PhotoRules = DEFAULT_RULES): string {
  const byName = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!PHOTO_TYPES.includes(file.type) && !(file.type === '' && byName)) {
    return 'That file is not a JPG, PNG or WebP photo. Pick a different picture.';
  }
  if (file.size > rules.max_bytes) {
    return `That photo is bigger than ${megabytes(rules.max_bytes)}. Pick a smaller one.`;
  }
  if (file.size === 0) return 'That photo is empty. Pick a different picture.';
  return '';
}

/** Reads the picture's size in the browser (never uploads anything). */
export function measure(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The server's message for a failed upload, or a plain fallback. */
export function uploadProblem(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: string } } })
    ?.response;
  const detail = response?.data?.detail;
  if (detail && typeof detail === 'string') return detail;
  if (response?.status === 413) return 'That photo is too big. Pick a smaller one.';
  if (response?.status === 429)
    return 'You are sending photos too fast. Wait a moment and try again.';
  if (response?.status === 409) return 'This conversation is read-only now.';
  return 'We could not send that photo. Check your connection and try again.';
}
