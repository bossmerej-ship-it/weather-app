import { useState, useEffect } from 'react';
import { Search, MapPin, Wind, Droplets, Thermometer, Compass } from 'lucide-react';
import './App.css';

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

// Палитра градиентов под разное состояние погоды
const getWeatherTheme = (code, isDay) => {
  // Ночь
  if (isDay === 0) {
    return 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)';
  }

  // Ясно / Солнечно
  if (code === 1000) {
    return 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #fbbf24 100%)';
  }
  // Облачно / Переменная облачность
  if ([1003, 1006, 1009].includes(code)) {
    return 'linear-gradient(135deg, #334155 0%, #475569 50%, #64748b 100%)';
  }
  // Дождь / Морось
  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
    return 'linear-gradient(135deg, #1e293b 0%, #0f766e 50%, #0369a1 100%)';
  }
  // Гроза
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
    return 'linear-gradient(135deg, #020617 0%, #312e81 50%, #1e1b4b 100%)';
  }
  // Снег / Метель
  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) {
    return 'linear-gradient(135deg, #334155 0%, #60a5fa 50%, #cbd5e1 100%)';
  }
  // Туман / Мгла
  if ([1030, 1135, 1147].includes(code)) {
    return 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #334155 100%)';
  }

  // Дефолтный глубокий синий
  return 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
};

export default function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = async (searchQuery) => {
    if (!searchQuery) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${searchQuery}&lang=ru`
      );

      if (!res.ok) {
        throw new Error('Город не найден. Попробуйте еще раз.');
      }

      const data = await res.json();
      setWeather(data);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWeather(query);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(`${latitude},${longitude}`);
      },
      () => setError('Не удалось определить местоположение')
    );
  };

  // Меняем фон всей страницы при обновлении погоды
  useEffect(() => {
    if (weather?.current) {
      const bg = getWeatherTheme(weather.current.condition.code, weather.current.is_day);
      document.body.style.background = bg;
    }
  }, [weather]);

  useEffect(() => {
    fetchWeather('Astana');
  }, []);

  return (
    <div className="weather-card">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      )}

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Поиск города..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn" aria-label="Искать">
          <Search size={18} />
        </button>
        <button
          type="button"
          onClick={handleGeolocation}
          className="btn btn-icon"
          title="Моё местоположение"
        >
          <MapPin size={18} />
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      {weather && (
        <div className="content-wrapper" key={weather.location.name}>
          <div className="main-info">
            <h1 className="city-name">{weather.location.name}</h1>
            <span className="region-name">{weather.location.country}</span>

            <div className="weather-icon-wrap">
              <img
                src={weather.current.condition.icon}
                alt={weather.current.condition.text}
                width={80}
                height={80}
              />
            </div>

            <div className="temp">{Math.round(weather.current.temp_c)}°C</div>
            <div className="condition">{weather.current.condition.text}</div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <Thermometer size={20} color="#f87171" />
              <div>
                <div className="stat-label">Ощущается</div>
                <div className="stat-val">{Math.round(weather.current.feelslike_c)}°C</div>
              </div>
            </div>

            <div className="stat-item">
              <Droplets size={20} color="#38bdf8" />
              <div>
                <div className="stat-label">Влажность</div>
                <div className="stat-val">{weather.current.humidity}%</div>
              </div>
            </div>

            <div className="stat-item">
              <Wind size={20} color="#a78bfa" />
              <div>
                <div className="stat-label">Ветер</div>
                <div className="stat-val">{Math.round(weather.current.wind_kph / 3.6)} м/с</div>
              </div>
            </div>

            <div className="stat-item">
              <Compass size={20} color="#fbbf24" />
              <div>
                <div className="stat-label">Давление</div>
                <div className="stat-val">{Math.round(weather.current.pressure_mb * 0.75)} мм</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}