import fs from 'node:fs';
import path from 'node:path';

import { resolveDataMode } from '@/data/mode';

describe('data mode', () => {
  it('stays on the mock workspace until both Supabase public values are set', () => {
    expect(resolveDataMode({})).toBe('mock');
    expect(resolveDataMode({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })).toBe('mock');
    expect(resolveDataMode({ EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon' })).toBe('mock');
    expect(
      resolveDataMode({
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
      }),
    ).toBe('supabase');
  });

  it('does not ship a service-role credential', () => {
    const forbidden = ['service', 'role'].join('_');
    const roots = [
      path.join(process.cwd(), 'src'),
      path.join(process.cwd(), 'supabase'),
      path.join(process.cwd(), 'app.json'),
      path.join(process.cwd(), 'eas.json'),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      if (!fs.existsSync(root)) {
        continue;
      }
      const files = fs.statSync(root).isDirectory() ? walk(root) : [root];
      for (const file of files) {
        if (file.endsWith('mode.test.ts')) {
          continue;
        }
        const text = fs.readFileSync(file, 'utf8');
        if (text.includes(forbidden)) {
          offenders.push(path.relative(process.cwd(), file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return [full];
  });
}
