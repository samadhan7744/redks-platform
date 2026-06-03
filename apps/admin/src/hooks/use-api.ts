'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/api';

export function useApi<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  const depsRef = useRef<React.DependencyList | null>(null);

  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const previous = depsRef.current;
    const changed =
      !previous || previous.length !== deps.length || previous.some((value, index) => !Object.is(value, deps[index]));

    if (changed) {
      depsRef.current = [...deps];
      void reload();
    }
  });

  return { data, loading, error, reload, setData };
}
