import { useMemo } from "react";

export class GenericStringStorage {
  #map = new Map<string, string>();
  async getItem(key: string): Promise<string | null> { return this.#map.has(key) ? (this.#map.get(key) as string) : null; }
  async setItem(key: string, value: string): Promise<void> { this.#map.set(key, value); }
  async removeItem(key: string): Promise<void> { this.#map.delete(key); }
}

export function useInMemoryStorage() { const storage = useMemo(() => new GenericStringStorage(), []); return { storage } as const; }



// dev note 4

// dev note 16
