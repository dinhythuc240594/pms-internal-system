import { useEffect, useState } from 'react';
import { usePms } from '../data/usePms';

export function useChannels() {
  const { requestTenant, tenantId } = usePms();
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    requestTenant('/channels').then(data => { if (current) setResult({ requestTenant, tenantId, revision, data, error: '' }); })
      .catch(err => { if (current) setResult({ requestTenant, tenantId, revision, data: null, error: err.message }); });
    return () => { current = false; };
  }, [requestTenant, tenantId, revision]);
  const loaded = result?.requestTenant === requestTenant && result?.tenantId === tenantId && result?.revision === revision;
  return { data: loaded ? result.data : null, error: loaded ? result.error : '', loading: !loaded, refresh: () => setRevision(value => value + 1) };
}
