import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { DEMO_ACCOUNTS } from '@/data/demoAccounts';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, BrandMark, Card, Screen, StackHeader, Title } from '@/ui/components';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function DemoScreen() {
  const { enterDemo, mode } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <Screen>
      <StackHeader title="Try the demo" subtitle="Three real seats in the Northline workspace" />
      <Title>Pick a door</Title>
      <Body>
        Harbor never sees Lumen. The studio sees the queue. Casey can hold both seats and switch
        between them.
      </Body>
      {mode === 'supabase' ? (
        <Body>Demo seats are turned off while this build is pointed at Supabase. Sign in with your account.</Body>
      ) : null}
      {DEMO_ACCOUNTS.map((account) => (
        <Card
          key={account.userId}
          label={`${account.orgName}, ${account.name}`}
          testID={`demo-${account.orgId}`}
          onPress={() => {
            if (mode === 'supabase' || busy) {
              return;
            }
            setBusy(account.userId);
            setError(null);
            enterDemo(account.userId, account.orgId)
              .then(() => router.replace('/'))
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : 'The demo seat did not open.');
                setBusy(null);
              });
          }}
        >
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <BrandMark mark={account.orgName.slice(0, 1)} color={account.orgName === 'Harbor & Co' ? '#1F4E5A' : account.orgName === 'Northline Studio' ? '#9A4518' : '#3E5C3A'} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>{account.orgName}</Text>
              <Text style={{ color: colors.muted, fontFamily: fontFamily?.body, fontSize: 14 }}>
                {account.roleLabel} · {account.name}
              </Text>
            </View>
          </View>
          <Body>{busy === account.userId ? 'Opening…' : account.detail}</Body>
        </Card>
      ))}
      {error ? <Body>{error}</Body> : null}
    </Screen>
  );
}
