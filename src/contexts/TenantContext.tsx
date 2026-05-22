import { createContext, useContext, ReactNode } from 'react';

interface TenantContextValue {
  clientSlug: string;
  isMaster: boolean;
}

function resolveClient(): TenantContextValue {
  const host = window.location.hostname;
  if (
    host === 'pedefacilweb.com.br' ||
    host === 'www.pedefacilweb.com.br'
  ) {
    return { clientSlug: 'master', isMaster: true };
  }
  const slug = host.split('.')[0] ?? 'master';
  return { clientSlug: slug, isMaster: false };
}

const TenantContext = createContext<TenantContextValue>({
  clientSlug: 'master',
  isMaster: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const value = resolveClient();
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
