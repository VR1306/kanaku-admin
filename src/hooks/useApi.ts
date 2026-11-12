'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface State<T> {
  data?: T;
  error?: string;
  loadedFor?: string;
}

/**
 * Fetches through the BFF. Pass `null` to skip.
 * - `loading`: first load (no data yet) → show skeletons.
 * - `refreshing`: a refetch (filter, page, reload) while old data is on screen → dim it and show a progress bar.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({});
  const [tick, setTick] = useState(0);
  const key = `${path}|${tick}`;
  useEffect(() => {
    if (path === null) return;
    let live = true;
    api<T>(path)
      .then((data) => live && setState({ data, loadedFor: key }))
      .catch(
        (e) =>
          live &&
          setState((s) => ({
            ...s,
            error: e instanceof ApiError ? e.message : 'Failed to load',
            loadedFor: key,
          })),
      );
    return () => {
      live = false;
    };
  }, [path, tick, key]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  if (path === null)
    return { data: undefined, error: undefined, loading: false, refreshing: false, reload };
  const settled = state.loadedFor === key;
  return {
    data: state.data,
    // An error is only meaningful for the request that produced it; a retry clears it.
    error: settled ? state.error : undefined,
    loading: !settled && state.data === undefined && !state.error,
    refreshing: !settled && (state.data !== undefined || !!state.error),
    reload,
  };
}
