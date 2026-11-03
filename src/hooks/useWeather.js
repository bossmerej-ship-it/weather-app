import { useCallback, useEffect, useRef, useState } from 'react';
import { requestDashboardWeather } from '../services/weather';

export function useWeather() {
  const [state, setState] = useState({ weather: null, loading: true, error: null, forecastUnavailable: false });
  const controller = useRef(null);
  const requestId = useRef(0);
  const lastQuery = useRef('Astana');

  const load = useCallback(async (query) => {
    if (!query.trim()) return null;
    const id = ++requestId.current;
    controller.current?.abort();
    controller.current = new AbortController();
    const activeController = controller.current;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; activeController.abort(); }, 15000);
    lastQuery.current = query;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const { weather, forecastUnavailable } = await requestDashboardWeather(query, {
        apiKey: import.meta.env.VITE_WEATHER_API_KEY,
        signal: activeController.signal,
      });
      if (id !== requestId.current) return null;
      setState({ weather, forecastUnavailable, loading: false, error: null });
      return weather;
    } catch (error) {
      if (id !== requestId.current || (error.name === 'AbortError' && !timedOut)) return null;
      setState((previous) => ({ ...previous, loading: false, error: {
        code: timedOut ? 'timeout' : error.code || 'unavailable',
        message: timedOut ? 'Погода загружается дольше обычного. Проверьте подключение и попробуйте ещё раз.' : error.message,
      } }));
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => { if (!disposed) load('Astana'); });
    return () => {
      disposed = true;
      requestId.current += 1;
      controller.current?.abort();
    };
  }, [load]);

  return { ...state, load, retry: () => load(lastQuery.current) };
}
