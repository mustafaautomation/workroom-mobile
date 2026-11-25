import { Redirect, router } from 'expo-router';
import { Text } from 'react-native';

import { isAgencyRole } from '@/domain/access';
import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Card, QueryState, Screen, Title } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function ProjectsScreen() {
  const { actor, repo, revision } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(() => repo.listProjects(), [repo, revision, actor?.activeOrgId]);

  if (actor && isAgencyRole(actor.role)) {
    return <Redirect href="/clients" />;
  }

  return (
    <Screen>
      <Title>Projects</Title>
      <Body>The work this studio is making for you, with the milestones still on the table.</Body>
      <QueryState
        query={query}
        loading="Loading projects"
        empty={{ title: 'No projects yet', body: 'When the studio opens a project, it will show up here.' }}
        isEmpty={(data) => data.length === 0}
      >
        {(projects) =>
          projects.map((project) => (
            <Card
              key={project.id}
              label={project.name}
              onPress={() => router.push(`/project/${project.id}`)}
            >
              <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>{project.name}</Text>
              <Body>{project.summary}</Body>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                Updated {formatDate(project.updatedAt)} · {project.pendingReviews} waiting on you
              </Text>
            </Card>
          ))
        }
      </QueryState>
    </Screen>
  );
}
