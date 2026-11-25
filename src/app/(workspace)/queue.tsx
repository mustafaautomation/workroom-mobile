import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { isAgencyRole } from '@/domain/access';
import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Card, QueryState, Screen, StatusPill, Title } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function QueueScreen() {
  const { actor, repo, revision } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.listApprovalQueue(), [repo, revision, actor?.activeOrgId]);

  if (actor && !isAgencyRole(actor.role)) {
    return <Redirect href="/home" />;
  }

  return (
    <Screen>
      <Title>Approval queue</Title>
      <Body>Every client review that is still open. Internal notes stay on the review, never in their portal.</Body>
      <QueryState
        query={query}
        loading="Loading the queue"
        empty={{ title: 'The queue is clear', body: 'When a client is waiting on a review, it shows up here.' }}
        isEmpty={(items) => items.length === 0}
      >
        {(items) =>
          items.map((item) => (
            <Card
              key={item.deliverableId}
              label={`${item.clientName}, ${item.title}`}
              onPress={() =>
                router.push(`/review/${item.deliverableId}`)
              }
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: item.brandColor, fontFamily: fontFamily?.semibold, fontSize: 13 }}>
                  {item.clientName}
                </Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                {item.projectName} · Version {item.version} · {formatDate(item.updatedAt)}
              </Text>
            </Card>
          ))
        }
      </QueryState>
    </Screen>
  );
}
