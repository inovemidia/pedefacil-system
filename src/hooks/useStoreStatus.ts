import { useState, useEffect } from 'react';
import { getStoreStatus, type StoreStatus } from '../lib/storeHours';

export function useStoreStatus(): StoreStatus {
  const [status, setStatus] = useState<StoreStatus>(() => getStoreStatus());

  useEffect(() => {
    // Refresh every 30 seconds so the label stays accurate
    const id = setInterval(() => setStatus(getStoreStatus()), 30_000);
    return () => clearInterval(id);
  }, []);

  return status;
}
