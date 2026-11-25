import { router } from 'expo-router';

import { Body, Button, Eyebrow, LoadingBlock, Screen, Title } from '@/ui/components';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function WelcomeScreen() {
  const { ready, actor, mode } = useWorkspace();
  if (!ready) {
    return (
      <Screen>
        <LoadingBlock label="Opening Workroom" />
      </Screen>
    );
  }
  if (actor) {
    return (
      <Screen>
        <LoadingBlock label="Opening your portal" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow>Client portal</Eyebrow>
      <Title>Workroom</Title>
      <Body>
        The room where a studio shows the work, and a client says yes or sends it back. One brand at a
        time. Nothing internal crosses the table.
      </Body>
      <Button label="Try the demo" onPress={() => router.push('/demo')} testID="try-demo" />
      <Button label="Sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
      <Button label="Email me a link" variant="ghost" onPress={() => router.push('/magic')} />
      <Body>
        {mode === 'mock'
          ? 'This device is running the Northline demo. Add Supabase keys when you want the shared backend.'
          : 'Connected to your Workroom workspace.'}
      </Body>
    </Screen>
  );
}
