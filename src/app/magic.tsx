import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Screen, StackHeader, TextField, Title } from '@/ui/components';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function MagicScreen() {
  const params = useLocalSearchParams<{ email?: string; demoPath?: string }>();
  const { requestMagicLink, mode } = useWorkspace();
  const [email, setEmail] = useState(params.email ?? '');
  const [demoPath, setDemoPath] = useState(params.demoPath ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(Boolean(params.demoPath) || Boolean(params.email && params.demoPath));
  const [busy, setBusy] = useState(false);

  return (
    <Screen>
      <StackHeader title="Magic link" />
      <Title>We’ll send the door</Title>
      <Body>Use the email on your Workroom seat. The link signs you in on this device.</Body>
      <TextField label="Email" value={email} onChangeText={setEmail} placeholder="lena@harborandco.example" />
      {error ? <Body>{error}</Body> : null}
      <Button
        label={busy ? 'Sending…' : 'Send magic link'}
        disabled={busy}
        onPress={() => {
          if (!email.includes('@')) {
            setError('Enter the email on your account.');
            return;
          }
          setBusy(true);
          setError(null);
          requestMagicLink(email)
            .then((result) => {
              setSent(true);
              setDemoPath(result.demoPath ?? '');
            })
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : 'The link could not be sent.');
            })
            .finally(() => setBusy(false));
        }}
      />
      {sent ? (
        <>
          <Body>
            If that address has a seat, the link is on its way. Unknown addresses get the same message,
            so this screen never confirms who is in the studio.
          </Body>
          {mode === 'mock' && demoPath ? (
              <Button
              label="Open the demo inbox link"
              variant="secondary"
              onPress={() => {
                router.push(demoPath);
              }}
            />
          ) : null}
          {mode === 'mock' && sent && !demoPath ? (
            <Body>No message arrived in the demo inbox. Check the address against the demo seats.</Body>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
