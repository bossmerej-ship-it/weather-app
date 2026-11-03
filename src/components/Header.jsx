import { ArrowUpRight, CloudSun, CornerDownLeft, LocateFixed, LoaderCircle, Search } from 'lucide-react';
import { useRef, useState } from 'react';

const QUICK_CITIES = [
  { label: 'Астана', query: 'Astana' }, { label: 'Алматы', query: 'Almaty' },
  { label: 'Лондон', query: 'London' }, { label: 'Токио', query: 'Tokyo' },
];

export function Header({ onSearch, onGeolocation, loading, locating, unit, setUnit, activeCity }) {
  const [query, setQuery] = useState('');
  const [formError, setFormError] = useState('');
  const input = useRef(null);

  function submit(event) {
    event.preventDefault();
    if (!query.trim()) {
      setFormError('Введите название города.');
      input.current?.focus();
      return;
    }
    setFormError('');
    onSearch(query);
  }

  return (
    <>
      <header className="topbar">
        <a href="/" className="brand" aria-label="NEBO — на главную">
          <span className="brand-symbol"><CloudSun size={27} strokeWidth={1.4} aria-hidden="true" /></span>
          <span className="brand-word">nebo<span className="brand-dot">.</span></span>
          <span className="brand-description">погода<br />по часам и дням</span>
        </a>
        <div className="search-group">
          <form className="city-search" role="search" onSubmit={submit}>
            <button className="search-submit" type="submit" aria-label="Искать" title="Искать">
              {loading ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}
            </button>
            <input ref={input} id="city-search" type="search" aria-label="Название города" placeholder="Город или место" autoComplete="off" maxLength={120}
              value={query} onChange={(event) => { setQuery(event.target.value); setFormError(''); }}
              aria-invalid={Boolean(formError)} aria-describedby={formError ? 'search-error' : undefined} />
            <button className="search-enter" type="submit" aria-label="Найти город"><CornerDownLeft size={15} aria-hidden="true" /></button>
          </form>
          {formError && <p className="search-error" id="search-error" role="alert">{formError}</p>}
        </div>
        <div className="header-actions">
          <button className="location-button" type="button" onClick={() => { setFormError(''); onGeolocation(); }} disabled={locating} aria-label="Моё местоположение" title="Моё местоположение">
            {locating ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <LocateFixed size={17} aria-hidden="true" />}
            <span>Где я</span>
          </button>
          <div className="unit-switch" role="group" aria-label="Единицы температуры">
            {['c', 'f'].map((value) => <button key={value} type="button" onClick={() => setUnit(value)} aria-pressed={unit === value} aria-label={value === 'c' ? 'Градусы Цельсия' : 'Градусы Фаренгейта'}>°{value.toUpperCase()}</button>)}
          </div>
        </div>
      </header>
      <nav className="quick-cities" aria-label="Быстрый выбор города">
        <span className="quick-label">Быстрый выбор</span>
        {QUICK_CITIES.map(({ query: cityQuery, label }) => <button type="button" key={cityQuery} onClick={() => { setQuery(''); setFormError(''); onSearch(cityQuery); }} aria-current={activeCity === cityQuery ? 'location' : undefined}>{label}<ArrowUpRight size={12} aria-hidden="true" /></button>)}
      </nav>
    </>
  );
}
