import { useEffect, useRef, useState } from 'react';

export function useGeolocation() {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);

  function cancel() {
    generation.current += 1;
    setLocating(false);
    setError(null);
  }

  function locate(onSuccess) {
    const id = ++generation.current;
    setError(null);
    const provider = navigator.geolocation;
    if (!provider) {
      setLocating(false);
      setError({ code: 'location', message: 'В этом браузере геолокация недоступна. Найдите город через поиск.' });
      return;
    }
    setLocating(true);
    function reportFailure(failure) {
      if (id !== generation.current) return;
      setLocating(false);
      setError({ code: 'location', message: failure?.code === 1 || failure?.name === 'SecurityError'
        ? 'Нет доступа к местоположению. Разрешите его в браузере или найдите город через поиск.'
        : 'Не удалось определить местоположение. Попробуйте ещё раз или найдите город через поиск.' });
    }
    try {
      provider.getCurrentPosition((position) => {
        if (id !== generation.current) return;
        const { latitude, longitude } = position?.coords ?? {};
        if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
            !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
          reportFailure();
          return;
        }
        setLocating(false);
        onSuccess(`${latitude},${longitude}`);
      }, reportFailure, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    } catch (error) {
      reportFailure(error);
    }
  }

  return { locating, error, locate, cancel };
}
