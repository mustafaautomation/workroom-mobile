import { router } from 'expo-router';

import { Body, Button, Screen, Title } from '@/ui/components';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Title>That page is not in Workroom</Title>
      <Body>The link may be old, or it belongs to a workspace you are not in.</Body>
      <Button label="Go to the front door" onPress={() => router.replace('/')} />
    </Screen>
  );
}
