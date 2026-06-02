import { writeFileSync } from 'node:fs';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
};

export async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
}
