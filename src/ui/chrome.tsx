import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { useWide } from '@/ui/components';

export interface WorkroomTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    { options: { title?: string; href?: string | null; tabBarBadge?: string | number } }
  >;
  navigateToTab: (routeKey: string) => void;
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  projects: 'albums-outline',
  inbox: 'chatbubbles-outline',
  alerts: 'notifications-outline',
  more: 'ellipsis-horizontal',
  queue: 'file-tray-stacked-outline',
  clients: 'people-outline',
};

export function WorkroomTabBar({ state, descriptors, navigateToTab }: WorkroomTabBarProps) {
  const { colors, fontFamily } = useWorkroomTheme();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const routes = state.routes.filter((route) => descriptors[route.key]?.options?.href !== null);

  const body = routes.map((route) => {
    const focused = state.routes[state.index]?.key === route.key;
    const options = descriptors[route.key]?.options;
    const label = options?.title ?? route.name;
    const badge = options?.tabBarBadge;
    const icon = ICONS[route.name] ?? 'ellipse-outline';
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          if (!focused) {
            navigateToTab(route.key);
          }
        }}
        style={[
          styles.item,
          wide && styles.itemWide,
          focused && { backgroundColor: colors.copperSoft },
        ]}
      >
        <Ionicons name={icon} size={20} color={focused ? colors.copper : colors.muted} />
        <Text style={[styles.label, { color: focused ? colors.ink : colors.muted, fontFamily: fontFamily?.medium }]}>
          {label}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors.copperFill }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  });

  if (wide) {
    return (
      <View
        style={[
          styles.rail,
          { backgroundColor: colors.surface, borderRightColor: colors.line, paddingTop: insets.top + 18 },
        ]}
      >
        <Text style={[styles.wordmark, { color: colors.ink, fontFamily: fontFamily?.display }]}>Workroom</Text>
        {body}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240,
    borderRightWidth: 1,
    paddingHorizontal: 14,
    gap: 6,
    zIndex: 2,
  },
  wordmark: { fontSize: 28, marginBottom: 16, paddingHorizontal: 8 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  item: { minHeight: 48, minWidth: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 8, gap: 2 },
  itemWide: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  label: { fontSize: 12 },
  badge: { position: 'absolute', top: 6, right: 10, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFCF8', fontSize: 11 },
});
