import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, useFonts as useOutfit } from '@expo-google-fonts/outfit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, fontNames, lightColors, type Palette, type ThemePreference } from '@/theme/tokens';

const STORAGE_KEY = 'workroom.theme';

interface ThemeValue {
  colors: Palette;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  fontsReady: boolean;
  fontFamily: typeof fontNames | null;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [frauncesLoaded, frauncesError] = useFraunces({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });
  const [outfitLoaded, outfitError] = useOutfit({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled && (value === 'light' || value === 'dark' || value === 'system')) {
          setPreferenceState(value);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  };

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const fontsReady = (frauncesLoaded && outfitLoaded) || Boolean(frauncesError || outfitError);

  const value = useMemo<ThemeValue>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      preference,
      setPreference,
      fontsReady,
      fontFamily: frauncesLoaded && outfitLoaded ? fontNames : null,
    }),
    [scheme, preference, fontsReady, frauncesLoaded, outfitLoaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useWorkroomTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useWorkroomTheme must be used inside ThemeProvider');
  }
  return value;
}
