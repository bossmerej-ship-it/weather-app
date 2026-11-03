import { useCallback, useEffect, useRef, useState } from 'react';
import { requestWeather } from '../services/weather';

export function useWeather() {
  const [state, setState] = useState({ weather: null, loading: true, error: null });
  const controller = useRef(null);
  const requestId = useRef(0);
  const lastQuery = useRef('Astana');

  const load = useCallback(async (query) => {
    if (!query.trim()) return null;
    const id = ++requestId.current;
    controller.current?.abort();
    controller.current = new AbortController();
    lastQuery.current = query;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const weather = await requestWeather(query, {
        apiKey: import.meta.env.VITE_WEATHER_API_KEY,
        signal: controller.current.signal,
      });
      if (id !== requestId.current) return null;
      setState({ weather, loading: false, error: null });
      return weather;
    } catch (error) {
      if (id !== requestId.current || error.name === 'AbortError') return null;
      setState((previous) => ({ ...previous, loading: false, error: { code: error.code || 'unavailable', message: error.message } }));
      return null;
    }
  }, []);

  useEffect(() => {
    load('Astana');
    return () => {
      requestId.current += 1;
      controller.current?.abort();
    };
  }, [load]);

  return { ...state, load, retry: () => load(lastQuery.current) };
}
