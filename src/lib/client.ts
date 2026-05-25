export function getCurrentClient(): string {
  const host = window.location.hostname;
  if (
    host === 'pedefacilweb.com.br' ||
    host === 'www.pedefacilweb.com.br' ||
    host.includes('netlify.app')
  ) {
    return 'master';
  }
  return host.split('.')[0] ?? 'master';
}
