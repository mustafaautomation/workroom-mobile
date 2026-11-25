import { router } from 'expo-router';
import { Text } from 'react-native';

import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Card, QueryState, Screen, Title } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function InboxScreen() {
  const { actor, repo, revision } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.listThreads(), [repo, revision, actor?.activeOrgId]);

  return (
    <Screen>
      <Title>Inbox</Title>
      <Body>Threads stay with the project. Studio-only notes never appear in a client inbox.</Body>
      <QueryState
        query={query}
        loading="Loading messages"
        empty={{
          title: 'No conversations yet',
          body: 'Messages you trade with the other side of the work land here.',
        }}
        isEmpty={(items) => items.length === 0}
      >
        {(threads) =>
          threads.map((thread) => (
            <Card
              key={thread.id}
              label={thread.subject}
              onPress={() => router.push(`/thread/${thread.id}`)}
            >
              <Text style={{ color: colors.faint, fontSize: 12, fontFamily: fontFamily?.semibold }}>
                {thread.visibility === 'internal' ? 'INTERNAL' : thread.clientName.toUpperCase()}
              </Text>
              <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>{thread.subject}</Text>
              <Body>
                {thread.lastAuthorName ? `${thread.lastAuthorName}: ${thread.lastBody}` : 'No messages yet.'}
              </Body>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{formatDate(thread.updatedAt)}</Text>
            </Card>
          ))
        }
      </QueryState>
    </Screen>
  );
}
