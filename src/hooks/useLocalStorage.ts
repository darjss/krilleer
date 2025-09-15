import { createSignal, onMount } from 'solid-js';

type NonFunction<T> = T extends Function ? never : T;

export function useLocalStorage<T>(key: string, initialValue: NonFunction<T>) {
  const [storedValue, setStoredValue] = createSignal<T>(initialValue);

  onMount(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T extends Function ? never : T);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      let valueToStore: T;
      if (typeof value === 'function') {
        valueToStore = (value as (prev: T) => T)(storedValue());
      } else {
        valueToStore = value;
      }
      setStoredValue(valueToStore as T extends Function ? never : T);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}


