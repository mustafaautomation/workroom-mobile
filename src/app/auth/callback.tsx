import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Body, Button, LoadingBlock, Screen, Title } from '@/ui/components';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; token_hash?: string; code?: string }>();
  const { consumeMagicLink } = useWorkspace();
  const token = params.token_hash || params.token || params.code;
  const [error, setError] = useState<string | null>(
    token ? null : 'That link is missing its token.',
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    consumeMagicLink(String(token))
      .then(() => {
        if (!cancelled) {
          router.replace('/');
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'That link could not be opened.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [consumeMagicLink, token]);

  return (
    <Screen>
      <Title>Signing you in</Title>
      {error ? (
        <>
          <Body>{error}</Body>
          <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <LoadingBlock label="Checking the magic link" />
      )}
    </Screen>
  );
}
