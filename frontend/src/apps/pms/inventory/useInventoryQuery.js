import { useEffect, useRef, useState } from 'react';
import { usePms } from '../data/usePms';

// Read requests are scoped to the selected hotel; changed filters discard older responses.
export function useInventoryQuery(path, version = 0) {
  const { requestTenant, tenantId, user } = usePms();
  const scope = `${tenantId}:${user?.id}`;
  const request = useRef(requestTenant);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => { request.current = requestTenant; }, [requestTenant]);
  useEffect(() => {
    if (!path) return undefined;
    let current = true;
    request.current(path).then(data => {
      if (current) setResult({ scope, path, version, reload, data, error: '' });
    }).catch(error => {
      if (current) setResult({ scope, path, version, reload, data: null, error: error.message });
    });
    return () => { current = false; };
  }, [scope, path, version, reload]);
  const loaded = result?.scope === scope && result?.path === path && result?.version === version && result?.reload === reload;
  return { data: loaded ? result.data : null, error: loaded ? result.error : '', loading: Boolean(path) && !loaded, refresh: () => setReload(value => value + 1) };
}
