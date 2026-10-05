/** Set NEXT_PUBLIC_BASE_PATH when hosting under a sub-folder, e.g. GitHub Pages. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
