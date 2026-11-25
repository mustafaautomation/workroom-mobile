import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Composer, QueryState, Screen, StackHeader } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { repo, revision, actor, commit } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.getThread(String(threadId)), [repo, revision, threadId, actor?.activeOrgId]);

  return (
    <Screen>
      <QueryState query={query} loading="Opening the thread">
        {(thread) => (
          <>
            <StackHeader
              title={thread.subject}
              subtitle={thread.visibility === 'internal' ? 'Studio only' : thread.clientName}
            />
            {thread.visibility === 'internal' ? (
              <Body>This thread stays inside the studio. It is not in the client portal.</Body>
            ) : (
              <Body>{thread.projectName}</Body>
            )}
            {thread.messages.length === 0 ? <Body>No messages in this thread yet.</Body> : null}
            {thread.messages.map((message) => (
              <View
                key={message.id}
                style={{
                  alignSelf: message.mine ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  gap: 4,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: message.mine ? colors.copperSoft : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold }}>{message.authorName}</Text>
                <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 22 }}>{message.body}</Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>{formatDate(message.createdAt)}</Text>
              </View>
            ))}
            <Composer
              label="Message"
              action="Send"
              placeholder="Write to the thread."
              onSubmit={(body) => commit(() => repo.postMessage(thread.id, body)).then(() => undefined)}
            />
          </>
        )}
      </QueryState>
    </Screen>
  );
}
