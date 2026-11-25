import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DeliverableStatus } from '@/domain/types';
import { useWorkroomTheme } from '@/theme/ThemeProvider';

interface DecisionBarProps {
  status: DeliverableStatus;
  note: string;
  busy?: boolean;
  onChangeNote: (value: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}

export function DecisionBar({
  status,
  note,
  busy = false,
  onChangeNote,
  onApprove,
  onRequestChanges,
}: DecisionBarProps) {
  const { colors, fontFamily } = useWorkroomTheme();
  const changesDisabled = busy || note.trim().length === 0;
  const approveDisabled = busy || status === 'approved';
  const body = fontFamily?.body;
  const semibold = fontFamily?.semibold;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.muted, fontFamily: semibold }]}>Note for the studio</Text>
      <TextInput
        value={note}
        onChangeText={onChangeNote}
        multiline
        placeholder="Say what should change, or why this is a yes."
        placeholderTextColor={colors.faint}
        accessibilityLabel="Note for the studio"
        style={[
          styles.input,
          { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg, fontFamily: body },
        ]}
      />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request changes"
          accessibilityState={{ disabled: changesDisabled }}
          disabled={changesDisabled}
          onPress={onRequestChanges}
          testID="request-changes"
          style={[styles.secondary, { borderColor: colors.clay, opacity: changesDisabled ? 0.45 : 1 }]}
        >
          <Text style={[styles.secondaryText, { color: colors.clay, fontFamily: semibold }]}>Request changes</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status === 'approved' ? 'Approved' : 'Approve'}
          accessibilityState={{ disabled: approveDisabled }}
          disabled={approveDisabled}
          onPress={onApprove}
          testID="approve"
          style={[styles.primary, { backgroundColor: colors.moss, opacity: approveDisabled ? 0.55 : 1 }]}
        >
          <Text style={[styles.primaryText, { fontFamily: semibold }]}>
            {status === 'approved' ? 'Approved' : 'Approve'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  label: { fontSize: 13, letterSpacing: 0.2 },
  input: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryText: { fontSize: 15 },
  primary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryText: { color: '#F7F1E8', fontSize: 15 },
});
