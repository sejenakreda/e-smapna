import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function transformDriveUrl(url: string | undefined | null) {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/(.+?)\//)?.[1] || url.match(/id=(.+?)(&|$)/)?.[1];
    if (fileId) return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
  }
  return url;
}
