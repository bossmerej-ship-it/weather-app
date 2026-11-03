import { useState } from 'react';

export function usePreference(key, fallback, validate) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`nebo:${key}`));
      return validate(saved) ? saved : fallback;
    } catch {
      return fallback;
    }
  });
  function update(next) {
    setValue(next);
    try {
      localStorage.setItem(`nebo:${key}`, JSON.stringify(next));
    } catch {
      // Private browsing and full storage must not interrupt weather controls.
    }
  }
  return [value, update];
}

export const validUnit = (value) => value === 'c' || value === 'f';
export const validBoolean = (value) => typeof value === 'boolean';
