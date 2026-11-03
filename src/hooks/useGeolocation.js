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
    if (!navigator.geolocation) {
      setError({ code: 'location', message: 'В этом браузере геолокация недоступна. Найдите город через поиск.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      if (id !== generation.current) return;
      setLocating(false);
      onSuccess(`${position.coords.latitude},${position.coords.longitude}`);
    }, (failure) => {
      if (id !== generation.current) return;
      setLocating(false);
      setError({ code: 'location', message: failure.code === 1
        ? 'Нет доступа к местоположению. Разрешите его в браузере или найдите город через поиск.'
        : 'Не удалось определить местоположение. Попробуйте ещё раз или найдите город через поиск.' });
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  return { locating, error, locate, cancel };
}
