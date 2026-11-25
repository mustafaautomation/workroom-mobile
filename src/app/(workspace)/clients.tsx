import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { isAgencyRole } from '@/domain/access';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, BrandMark, Card, QueryState, Screen, Title } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function ClientsScreen() {
  const { actor, repo, revision } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.listClients(), [repo, revision, actor?.activeOrgId]);

  if (actor && !isAgencyRole(actor.role)) {
    return <Redirect href="/home" />;
  }

  return (
    <Screen>
      <Title>Clients</Title>
      <Body>Each client has their own portal. Opening one does not show the others.</Body>
      <QueryState
        query={query}
        loading="Loading clients"
        empty={{ title: 'No clients yet', body: 'Client workspaces appear here once they are linked to the studio.' }}
        isEmpty={(items) => items.length === 0}
      >
        {(clients) =>
          clients.map((client) => (
            <Card
              key={client.id}
              label={client.name}
              onPress={() => router.push(`/client/${client.id}`)}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <BrandMark mark={client.mark} color={client.brandColor} />
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18, flex: 1 }}>
                  {client.name}
                </Text>
              </View>
              <Body>{client.tagline}</Body>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                {client.projectCount} projects · {client.pendingReviews} in review
              </Text>
            </Card>
          ))
        }
      </QueryState>
    </Screen>
  );
}
