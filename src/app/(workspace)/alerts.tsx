import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Button, Card, QueryState, Screen, Title } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

function openAlert(href: string) {
  if (href.startsWith('/review/') || href.startsWith('/thread/') || href.startsWith('/project/')) {
    router.push(href);
  }
}

export default function AlertsScreen() {
  const { actor, repo, revision, commit } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.listNotifications(), [repo, revision, actor?.activeOrgId]);

  return (
    <Screen>
      <Title>Alerts</Title>
      <Body>Review requests, replies, and the test alert you send from More.</Body>
      <Button
        label="Mark all read"
        variant="secondary"
        onPress={() => {
          commit(() => repo.markAllNotificationsRead()).catch(() => undefined);
        }}
      />
      <QueryState
        query={query}
        loading="Loading alerts"
        empty={{ title: 'You are caught up', body: 'New reviews and replies will show up here.' }}
        isEmpty={(items) => items.length === 0}
      >
        {(alerts) =>
          alerts.map((alert) => (
            <Card
              key={alert.id}
              label={alert.title}
              onPress={() => {
                commit(() => repo.markNotificationRead(alert.id))
                  .catch(() => undefined)
                  .finally(() => {
                    openAlert(alert.href);
                  });
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 17, flex: 1 }}>
                  {alert.title}
                </Text>
                <Text style={{ color: alert.read ? colors.faint : colors.copper, fontSize: 12 }}>
                  {alert.read ? 'Read' : 'New'}
                </Text>
              </View>
              <Body>{alert.body}</Body>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{formatDate(alert.createdAt)}</Text>
            </Card>
          ))
        }
      </QueryState>
    </Screen>
  );
}
