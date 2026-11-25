import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { isAgencyRole } from '@/domain/access';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { LoadingBlock, Screen } from '@/ui/components';
import { WorkroomTabBar } from '@/ui/chrome';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function WorkspaceLayout() {
  const { ready, actor, repo, revision } = useWorkspace();
  const { colors } = useWorkroomTheme();
  const router = useRouter();

  useEffect(() => {
    if (ready && !actor) {
      router.replace('/');
    }
  }, [actor, ready, router]);
  const agency = actor ? isAgencyRole(actor.role) : false;
  const notes = useAsync(
    () => (actor ? repo.listNotifications() : Promise.resolve([])),
    [actor?.userId, actor?.activeOrgId, revision],
  );
  const unread = notes.data?.filter((item) => !item.read).length ?? 0;

  if (!ready) {
    return (
      <Screen>
        <LoadingBlock label="Opening your workspace" />
      </Screen>
    );
  }
  if (!actor) {
    return (
      <Screen>
        <LoadingBlock label="Returning to the front door" />
      </Screen>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <WorkroomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', href: agency ? null : '/home' }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects', href: agency ? null : '/projects' }} />
      <Tabs.Screen name="queue" options={{ title: 'Queue', href: agency ? '/queue' : null }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', href: agency ? '/clients' : null }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
