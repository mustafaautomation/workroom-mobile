import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Card, QueryState, Screen, SectionLabel, StackHeader, StatusPill } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { repo, revision, actor } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(
    () => repo.getProject(String(projectId)),
    [repo, revision, projectId, actor?.activeOrgId],
  );

  return (
    <Screen>
      <QueryState query={query} loading="Opening the project">
        {(project) => (
          <>
            <StackHeader title={project.name} subtitle={project.clientName} />
            <Body>{project.summary}</Body>
            <SectionLabel>Milestones</SectionLabel>
            {project.milestones.map((milestone, index) => (
              <View key={milestone.id} style={{ flexDirection: 'row', gap: 12 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: milestone.status === 'done' ? colors.mossSoft : colors.surface2,
                  }}
                >
                  <Text style={{ color: colors.ink, fontSize: 12 }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 16 }}>
                    {milestone.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    {milestone.status === 'done' ? 'Done' : milestone.status === 'active' ? 'In motion' : 'Upcoming'}
                    {' · '}due {formatDate(milestone.dueOn)}
                  </Text>
                  <Body>{milestone.detail}</Body>
                </View>
              </View>
            ))}
            <SectionLabel>Deliverables</SectionLabel>
            {project.deliverables.length === 0 ? (
              <Body>Nothing has been shared on this project yet.</Body>
            ) : (
              project.deliverables.map((item) => (
                <Card
                  key={item.id}
                  label={item.title}
                  onPress={() =>
                    router.push(`/review/${item.id}`)
                  }
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 17, flex: 1 }}>
                      {item.title}
                    </Text>
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    Version {item.version} · {item.kind === 'image' ? 'Image' : 'File'} · {formatDate(item.updatedAt)}
                  </Text>
                </Card>
              ))
            )}
            <SectionLabel>Messages</SectionLabel>
            {project.threads.length === 0 ? (
              <Body>No thread on this project yet.</Body>
            ) : (
              project.threads.map((thread) => (
                <Card
                  key={thread.id}
                  label={thread.subject}
                  onPress={() => router.push(`/thread/${thread.id}`)}
                >
                  <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 16 }}>
                    {thread.subject}
                  </Text>
                  <Body>{thread.lastBody || 'Open the thread.'}</Body>
                </Card>
              ))
            )}
          </>
        )}
      </QueryState>
    </Screen>
  );
}
