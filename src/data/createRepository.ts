import { withReadCache, type CacheFlags } from '@/data/cache';
import { createMockRepository } from '@/data/mockRepository';
import { readPublicEnv, resolveDataMode, type PublicEnv } from '@/data/mode';
import { createDevicePersistence, type Persistence } from '@/data/persistence';
import type { WorkroomRepository } from '@/data/repository';
import { createSupabaseRepository } from '@/data/supabaseRepository';

export interface RepositoryOptions {
  env?: PublicEnv;
  persistence?: Persistence;
  flags?: CacheFlags;
  isOnline?: () => boolean;
}

export function createRepository(options: RepositoryOptions = {}): WorkroomRepository {
  const env = options.env ?? readPublicEnv();
  const persistence = options.persistence ?? createDevicePersistence();
  const flags = options.flags ?? { mark() {} };
  const mode = resolveDataMode(env);
  const inner =
    mode === 'supabase'
      ? createSupabaseRepository(
          {
            url: env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
            anonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '',
          },
          persistence,
        )
      : createMockRepository({ persistence });
  return withReadCache(inner, persistence, flags, options.isOnline);
}
