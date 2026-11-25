export const fontNames = {
  display: 'Fraunces_600SemiBold',
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
} as const;

export const lightColors = {
  bg: '#F3EEE6',
  surface: '#FFFCF8',
  surface2: '#E7DFD2',
  ink: '#1C1712',
  muted: '#6B5E52',
  faint: '#8C7D6E',
  line: '#E0D5C6',
  copper: '#8E3F14',
  copperFill: '#9A4518',
  onCopper: '#FFFCF8',
  copperSoft: '#F6E6DA',
  moss: '#1B5C3A',
  mossSoft: '#E4F2EA',
  clay: '#8E2E24',
  claySoft: '#F8E6E2',
  gold: '#7A5B20',
  goldSoft: '#F6EBD4',
  shadow: 'rgba(28, 23, 18, 0.08)',
};

export const darkColors: typeof lightColors = {
  bg: '#12100E',
  surface: '#1D1915',
  surface2: '#2A241E',
  ink: '#F6F0E7',
  muted: '#CDBFAE',
  faint: '#A89886',
  line: '#3A322A',
  copper: '#F0A36A',
  copperFill: '#C4622D',
  onCopper: '#1C1712',
  copperSoft: '#3A261C',
  moss: '#9ED4B4',
  mossSoft: '#173024',
  clay: '#F0B2A8',
  claySoft: '#3A221E',
  gold: '#E6C98A',
  goldSoft: '#332916',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export type Palette = typeof lightColors;
export type ThemePreference = 'system' | 'light' | 'dark';
