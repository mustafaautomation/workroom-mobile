import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface Persistence {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createMemoryPersistence(initial?: Record<string, string>): Persistence {
  const data = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    async get(key) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
  };
}

const SESSION_PREFIX = 'workroom.session';

async function secureGet(key: string): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

async function secureRemove(key: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

function storesSessionSecurely(key: string): boolean {
  return Platform.OS !== 'web' && key.startsWith(SESSION_PREFIX);
}

export function createDevicePersistence(): Persistence {
  return {
    async get(key) {
      if (storesSessionSecurely(key)) {
        return secureGet(key);
      }
      return AsyncStorage.getItem(key);
    },
    async set(key, value) {
      if (storesSessionSecurely(key)) {
        await secureSet(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    },
    async remove(key) {
      if (storesSessionSecurely(key)) {
        await secureRemove(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    },
  };
}
