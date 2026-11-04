import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, LocateFixed, LoaderCircle, Search, X } from 'lucide-react';
import './CitySearchDialog.css';

const QUICK_CITIES = [
  { label: 'Астана', query: 'Astana', aliases: ['Astana', 'Астана', 'Nur-Sultan'] },
  { label: 'Алматы', query: 'Almaty', aliases: ['Almaty', 'Алматы'] },
  { label: 'Лондон', query: 'London', aliases: ['London', 'Лондон'] },
  { label: 'Токио', query: 'Tokyo', aliases: ['Tokyo', 'Токио'] },
];

export function CitySearchDialog({ open, onClose, onSearch, onGeolocation, loading, locating, activeCity, feedback, onRetry }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const titleId = useId();
  const hintId = useId();
  const validationId = useId();
  const [query, setQuery] = useState('');
  const [formError, setFormError] = useState('');

  useLayoutEffect(() => {
    const surface = dialog.current;
    if (!surface || !open) return;
    const opener = document.activeElement;
    const position = { x: window.scrollX, y: window.scrollY };
    const previousOverflow = document.documentElement.style.overflow;
    const restoreScroll = () => {
      if (window.scrollX !== position.x || window.scrollY !== position.y) {
        window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
      }
    };

    document.documentElement.style.overflow = 'hidden';
    setFormError('');
    if (!surface.open) surface.showModal();
    input.current?.focus({ preventScroll: true });
    restoreScroll();

    return () => {
      if (surface.open) surface.close();
      document.documentElement.style.overflow = previousOverflow;
      if (opener?.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
      restoreScroll();
    };
  }, [open]);

  function submit(event) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      setFormError('Введите название города.');
      input.current?.focus();
      return;
    }
    setFormError('');
    onSearch(normalized);
  }

  function backdropClick(event) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }

  return <dialog ref={dialog} className="city-dialog" aria-labelledby={titleId} aria-describedby={hintId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClose={() => { if (!dialog.current?.open) onClose(); }} onClick={backdropClick}>
    <div className="city-dialog-heading">
      <div><h2 id={titleId}>Выбрать город</h2><p id={hintId}>Найдите город или используйте своё местоположение.</p></div>
      <button type="button" className="city-dialog-close" onClick={onClose} aria-label="Закрыть поиск"><X size={21} aria-hidden="true" /></button>
    </div>

    <form className="city-dialog-form" role="search" onSubmit={submit}>
      <label className="city-dialog-label" htmlFor="city-dialog-query">Город или место</label>
      <div className="city-dialog-search" data-invalid={Boolean(formError)}>
        <Search size={20} aria-hidden="true" />
        <input ref={input} autoFocus id="city-dialog-query" type="search" autoComplete="off" maxLength={120} value={query}
          placeholder="Например, Алматы" aria-invalid={Boolean(formError)} aria-describedby={formError ? validationId : undefined}
          onChange={(event) => { setQuery(event.target.value); setFormError(''); }} />
        <button type="submit" aria-label="Найти город" title="Найти город">
          {loading ? <LoaderCircle size={19} className="spin" aria-hidden="true" /> : <ArrowUpRight size={21} aria-hidden="true" />}
        </button>
      </div>
      {formError && <p className="city-dialog-validation" id={validationId} role="alert">{formError}</p>}
    </form>

    <nav className="city-dialog-quick" aria-label="Быстрый выбор города">
      {QUICK_CITIES.map(({ label, query: cityQuery, aliases }) => <button type="button" key={cityQuery}
        aria-current={aliases.includes(activeCity) ? 'location' : undefined}
        onClick={() => { setQuery(''); setFormError(''); onSearch(cityQuery); }}>
        {label}<ArrowUpRight size={15} aria-hidden="true" />
      </button>)}
    </nav>

    <button type="button" className="city-dialog-location" onClick={() => { setFormError(''); onGeolocation(); }} disabled={locating}>
      {locating ? <LoaderCircle size={19} className="spin" aria-hidden="true" /> : <LocateFixed size={19} aria-hidden="true" />}
      {locating ? 'Определяем местоположение…' : 'Моё местоположение'}
    </button>

    {(loading || locating) && <p className="city-dialog-pending" role="status">{locating ? 'Ожидаем местоположение.' : 'Загружаем погоду…'}</p>}
    {feedback && <div className="city-dialog-feedback" role="alert"><p>{feedback.message}</p>
      {onRetry && <button type="button" onClick={onRetry}>Попробовать снова</button>}
    </div>}
  </dialog>;
}
