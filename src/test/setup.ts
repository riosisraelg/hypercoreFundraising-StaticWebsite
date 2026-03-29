import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Node 22+ exposes a built-in localStorage that overrides jsdom's.
// It lacks standard methods, so we provide a working polyfill.
const store = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, String(value)); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => { store.clear(); },
  get length() { return store.size; },
  key: (index: number) => [...store.keys()][index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

afterEach(() => {
  cleanup();
  store.clear();
  vi.restoreAllMocks();
});
