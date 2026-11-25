import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Card, Masthead, QueryState, Screen, StackHeader } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function ClientScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const { repo, revision, actor } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.getClient(String(orgId)), [repo, revision, orgId, actor?.activeOrgId]);

  return (
    <Screen>
      <QueryState query={query} loading="Opening the client">
        {(client) => (
          <>
            <StackHeader title={client.name} />
            <Masthead mark={client.mark} name={client.name} tagline={client.tagline} color={client.brandColor} />
            <Body>
              {client.projectCount} projects · {client.pendingReviews} pieces still in review.
            </Body>
            {client.projects.length === 0 ? <Body>No projects for this client yet.</Body> : null}
            {client.projects.map((project) => (
              <Card
                key={project.id}
                label={project.name}
                onPress={() => router.push(`/project/${project.id}`)}
              >
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>{project.name}</Text>
                <Body>{project.summary}</Body>
              </Card>
            ))}
          </>
        )}
      </QueryState>
    </Screen>
  );
}
