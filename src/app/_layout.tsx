import '../global.css';

import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { isAgencyRole } from '@/domain/access';
import { ThemeProvider, useWorkroomTheme } from '@/theme/ThemeProvider';
import { WorkspaceProvider, useWorkspace } from '@/workspace/WorkspaceProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function SessionGate() {
  const { ready, actor } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      return;
    }
    const isPublic =
      pathname === '/' ||
      pathname === '/sign-in' ||
      pathname === '/magic' ||
      pathname === '/demo' ||
      pathname.startsWith('/auth');
    if (!actor && !isPublic) {
      router.replace('/');
      return;
    }
    if (actor && isPublic && !pathname.startsWith('/auth')) {
      router.replace(isAgencyRole(actor.role) ? '/queue' : '/home');
    }
  }, [actor, pathname, ready, router]);

  return null;
}

function RootStack() {
  const { colors, fontsReady } = useWorkroomTheme();
  const { ready } = useWorkspace();

  useEffect(() => {
    if (fontsReady && ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady, ready]);

  return (
    <>
      <SessionGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <WorkspaceProvider>
          <RootStack />
        </WorkspaceProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
