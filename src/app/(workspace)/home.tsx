import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { isAgencyRole } from '@/domain/access';
import type { DeliverableSummary, ProjectDetail } from '@/domain/types';
import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Card, Masthead, QueryState, Screen, SectionLabel, StatusPill } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

interface WaitingItem extends DeliverableSummary {
  projectName: string;
  brandColor: string;
}

export default function HomeScreen() {
  const { actor, organization, repo, revision } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const query = useAsync(async () => {
    const projects = await repo.listProjects();
    const details = await Promise.all(projects.map((project) => repo.getProject(project.id)));
    const waiting: WaitingItem[] = details.flatMap((project) =>
      project.deliverables
        .filter((item) => item.status === 'in_review' || item.status === 'changes_requested')
        .map((item) => ({ ...item, projectName: project.name, brandColor: project.brandColor })),
    );
    return { projects: details, waiting };
  }, [repo, revision, actor?.activeOrgId]);

  if (actor && isAgencyRole(actor.role)) {
    return <Redirect href="/queue" />;
  }

  return (
    <Screen>
      {organization ? (
        <Masthead
          mark={organization.mark}
          name={organization.name}
          tagline={organization.tagline}
          color={organization.brandColor}
        />
      ) : null}
      <Body>{actor ? `${actor.fullName}, here is what the studio has put in front of you.` : ''}</Body>
      <QueryState
        query={query}
        loading="Opening your portal"
        empty={{ title: 'Nothing waiting', body: 'When the studio sends work, it lands here first.' }}
        isEmpty={(data) => data.waiting.length === 0 && data.projects.length === 0}
      >
        {(data) => (
          <>
            <SectionLabel>Needs your eye</SectionLabel>
            {data.waiting.length === 0 ? (
              <Body>Nothing is waiting on a decision. The projects below are still in motion.</Body>
            ) : (
              data.waiting.map((item) => (
                <DeliverableRow key={item.id} item={item} colors={colors} fontFamily={fontFamily?.semibold} />
              ))
            )}
            <SectionLabel>Projects</SectionLabel>
            {data.projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </>
        )}
      </QueryState>
    </Screen>
  );
}

function DeliverableRow({
  item,
  colors,
  fontFamily,
}: {
  item: WaitingItem;
  colors: { ink: string; muted: string };
  fontFamily?: string;
}) {
  return (
    <Card
      label={`${item.title}, ${item.projectName}`}
      onPress={() => router.push(`/review/${item.id}`)}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: colors.ink, fontFamily, fontSize: 18 }}>{item.title}</Text>
        <StatusPill status={item.status} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {item.projectName} · Version {item.version} · {formatDate(item.updatedAt)}
      </Text>
    </Card>
  );
}

function ProjectRow({ project }: { project: ProjectDetail }) {
  const { colors, fontFamily } = useWorkroomTheme();
  return (
    <Card
      label={project.name}
      onPress={() => router.push(`/project/${project.id}`)}
    >
      <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>{project.name}</Text>
      <Body>{project.summary}</Body>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {project.milestonesDone} of {project.milestonesTotal} milestones · {project.pendingReviews} waiting
      </Text>
    </Card>
  );
}
