import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliverableStatus } from '@/domain/types';
import { inkOn, statusLabel } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import type { AsyncState } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export function useWide(): boolean {
  return useWindowDimensions().width >= 960;
}

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useWorkroomTheme();
  const { online, stale } = useWorkspace();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const banner = !online
    ? 'You are offline. Workroom is showing the last saved copy of this workspace.'
    : stale
      ? 'Showing the last saved copy. The live workspace did not answer.'
      : null;
  const body = (
    <View style={[styles.column, { paddingBottom: footer ? 12 : insets.bottom + 28 }]}>
      {banner ? <Notice>{banner}</Notice> : null}
      {children}
    </View>
  );
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg, paddingLeft: wide ? 240 : 0 }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12 }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingTop: insets.top + 12 }]}>{body}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.line,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function StackHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <View style={styles.headerRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        style={[styles.back, { borderColor: colors.line, backgroundColor: colors.surface }]}
      >
        <Ionicons name="arrow-back" size={18} color={colors.ink} />
      </Pressable>
      <View style={styles.fill}>
        <Text style={[styles.headerTitle, { color: colors.ink, fontFamily: fontFamily?.semibold }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSub, { color: colors.muted, fontFamily: fontFamily?.body }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <Text style={[styles.eyebrow, { color: colors.copper, fontFamily: fontFamily?.semibold }]}>{children}</Text>
  );
}

export function Title({ children }: { children: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily?.display }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children }: { children: ReactNode }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return <Text style={[styles.body, { color: colors.muted, fontFamily: fontFamily?.body }]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  testID?: string;
}) {
  const { colors, fontFamily } = useWorkroomTheme();
  const background =
    variant === 'primary' ? colors.copperFill : variant === 'secondary' ? colors.surface : 'transparent';
  const textColor = variant === 'primary' ? colors.onCopper : colors.ink;
  const borderColor = variant === 'ghost' ? 'transparent' : colors.line;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: textColor, fontFamily: fontFamily?.semibold }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  multiline = false,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fontFamily?.semibold }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface, fontFamily: fontFamily?.body },
        ]}
      />
    </View>
  );
}

export function StatusPill({ status }: { status: DeliverableStatus }) {
  const { colors, fontFamily } = useWorkroomTheme();
  const tone =
    status === 'approved'
      ? { bg: colors.mossSoft, fg: colors.moss }
      : status === 'changes_requested'
        ? { bg: colors.claySoft, fg: colors.clay }
        : status === 'draft'
          ? { bg: colors.surface2, fg: colors.muted }
          : { bg: colors.goldSoft, fg: colors.gold };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text numberOfLines={1} style={[styles.pillText, { color: tone.fg, fontFamily: fontFamily?.semibold }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function BrandMark({ mark, color, size = 42 }: { mark: string; color: string; size?: number }) {
  const { fontFamily } = useWorkroomTheme();
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size / 3.2, backgroundColor: color },
      ]}
    >
      <Text style={{ color: inkOn(color), fontFamily: fontFamily?.display, fontSize: size * 0.42 }}>{mark}</Text>
    </View>
  );
}

export function Masthead({
  mark,
  name,
  tagline,
  color,
}: {
  mark: string;
  name: string;
  tagline: string;
  color: string;
}) {
  const { fontFamily } = useWorkroomTheme();
  const ink = inkOn(color);
  return (
    <View style={[styles.mast, { backgroundColor: color }]}>
      <View style={[styles.mark, { width: 36, height: 36, borderRadius: 12, backgroundColor: ink, opacity: 0.92 }]}>
        <Text style={{ color, fontFamily: fontFamily?.display, fontSize: 16 }}>{mark}</Text>
      </View>
      <View style={styles.fill}>
        <Text style={[styles.mastName, { color: ink, fontFamily: fontFamily?.display }]}>{name}</Text>
        <Text style={[styles.mastTag, { color: ink, fontFamily: fontFamily?.body }]}>{tagline}</Text>
      </View>
    </View>
  );
}

export function Card({
  children,
  onPress,
  testID,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  label?: string;
}) {
  const { colors } = useWorkroomTheme();
  const style = [styles.card, { backgroundColor: colors.surface, borderColor: colors.line }];
  if (!onPress) {
    return <View style={style}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [...style, pressed && { opacity: 0.9 }]}
    >
      {children}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <Text style={[styles.section, { color: colors.ink, fontFamily: fontFamily?.semibold }]}>{children}</Text>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.copper} />
      <Text style={[styles.body, { color: colors.muted, fontFamily: fontFamily?.body }]}>{label}</Text>
    </View>
  );
}

export function EmptyBlock({ title, body }: { title: string; body: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fontFamily?.display }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.muted, fontFamily: fontFamily?.body }]}>{body}</Text>
    </View>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.stack}>
      <EmptyBlock title="This did not open" body={message} />
      <Button label="Try again" onPress={onRetry} />
    </View>
  );
}

export function QueryState<T>({
  query,
  loading,
  empty,
  isEmpty,
  children,
}: {
  query: AsyncState<T>;
  loading: string;
  empty?: { title: string; body: string };
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.status === 'loading') {
    return <LoadingBlock label={loading} />;
  }
  if (query.status === 'error' || !query.data) {
    return <ErrorBlock message={query.error?.message ?? 'Try again in a moment.'} onRetry={query.reload} />;
  }
  if (empty && isEmpty?.(query.data)) {
    return <EmptyBlock title={empty.title} body={empty.body} />;
  }
  return <>{children(query.data)}</>;
}

export function Notice({ children }: { children: string }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <View style={[styles.notice, { backgroundColor: colors.copperSoft }]}>
      <Text style={[styles.noticeText, { color: colors.ink, fontFamily: fontFamily?.medium }]}>{children}</Text>
    </View>
  );
}

export function Composer({
  label,
  action,
  onSubmit,
  placeholder,
}: {
  label: string;
  action: string;
  onSubmit: (value: string) => Promise<void> | void;
  placeholder: string;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.stack}>
      <TextField label={label} value={value} onChangeText={setValue} placeholder={placeholder} multiline />
      {error ? <Body>{error}</Body> : null}
      <Button
        label={busy ? 'Sending…' : action}
        disabled={busy || value.trim().length === 0}
        onPress={() => {
          setBusy(true);
          setError(null);
          Promise.resolve(onSubmit(value.trim()))
            .then(() => setValue(''))
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : 'That did not send.');
            })
            .finally(() => setBusy(false));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, gap: 16 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20 },
  headerSub: { fontSize: 14, marginTop: 2 },
  eyebrow: { fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 40, lineHeight: 46 },
  body: { fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  pill: {
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 12, letterSpacing: 0.2 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  mast: { borderRadius: 22, padding: 18, flexDirection: 'row', gap: 12, alignItems: 'center' },
  mastName: { fontSize: 28, lineHeight: 32 },
  mastTag: { fontSize: 14, marginTop: 4, opacity: 0.88 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  section: { fontSize: 18, marginTop: 8 },
  center: { paddingVertical: 32, alignItems: 'flex-start', gap: 12 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 },
  emptyTitle: { fontSize: 28, lineHeight: 32 },
  stack: { gap: 12 },
  notice: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  noticeText: { fontSize: 14, lineHeight: 20 },
});
