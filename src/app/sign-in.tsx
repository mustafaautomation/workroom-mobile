import { router } from 'expo-router';
import { useState } from 'react';

import { DEMO_ACCOUNTS } from '@/data/demoAccounts';
import { Body, Button, Screen, StackHeader, TextField, Title } from '@/ui/components';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function SignInScreen() {
  const { signIn, mode } = useWorkspace();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(nextEmail = email, nextPassword = password) {
    if (!nextEmail.includes('@') || nextPassword.length === 0) {
      setError('Enter the email and password for your workspace.');
      return;
    }
    setBusy(true);
    setError(null);
    signIn(nextEmail, nextPassword)
      .then(() => router.replace('/'))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Sign in did not finish.');
        setBusy(false);
      });
  }

  return (
    <Screen>
      <StackHeader title="Sign in" />
      <Title>Your seat</Title>
      <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@studio.example" />
      <TextField label="Password" value={password} onChangeText={setPassword} secure placeholder="Password" />
      {error ? <Body>{error}</Body> : null}
      <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={busy} onPress={() => submit()} />
      <Button label="Email me a link instead" variant="ghost" onPress={() => router.push('/magic')} />
      {mode === 'mock' ? (
        <>
          <Body>Demo passwords are on this device only.</Body>
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              label={`Use ${account.name}`}
              variant="secondary"
              onPress={() => {
                setEmail(account.email);
                setPassword(account.password);
                submit(account.email, account.password);
              }}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
