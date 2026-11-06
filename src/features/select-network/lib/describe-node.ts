/** Host and port for display; the scheme and trailing slash add nothing for the user. */
export function displayHost(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return pathname === '/' ? host : `${host}${pathname}`;
  } catch {
    return url;
  }
}
