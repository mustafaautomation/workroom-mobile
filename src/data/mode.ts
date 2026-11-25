import type { DataMode } from '@/domain/types';

export interface PublicEnv {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export function resolveDataMode(env: PublicEnv): DataMode {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && anonKey) {
    return 'supabase';
  }
  return 'mock';
}

export function readPublicEnv(source: Record<string, string | undefined> = process.env): PublicEnv {
  return {
    EXPO_PUBLIC_SUPABASE_URL: source.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: source.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}
