import { useState, useEffect, useCallback } from 'react';

function getPath() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, ...queryParts] = hash.split('?');
  const query = queryParts.join('?');
  const params = new URLSearchParams(query);
  return { path: path || '/', params };
}

export function useRouter() {
  const [{ path, params }, setRoute] = useState(getPath);

  useEffect(() => {
    const handler = () => setRoute(getPath());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { path, params, navigate };
}

export function navigate(to: string) {
  window.location.hash = to;
}
