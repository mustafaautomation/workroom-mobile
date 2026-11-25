import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  status: 'loading' | 'ready' | 'error';
  data?: T;
  error?: Error;
  reload: () => void;
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Omit<AsyncState<T>, 'reload'>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error('Something went wrong.'),
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // The caller passes the dependency list explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}
