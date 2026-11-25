import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Actor, DataMode, MagicLinkResult, MembershipSummary, Organization } from '@/domain/types';
import { createRepository } from '@/data/createRepository';
import type { WorkroomRepository } from '@/data/repository';
import { registerForPush, type PushRegistration } from '@/notifications/push';

interface WorkspaceValue {
  ready: boolean;
  actor: Actor | null;
  organization: Organization | null;
  memberships: MembershipSummary[];
  mode: DataMode;
  online: boolean;
  stale: boolean;
  revision: number;
  push: PushRegistration | null;
  repo: WorkroomRepository;
  signIn: (email: string, password: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<MagicLinkResult>;
  consumeMagicLink: (token: string) => Promise<void>;
  enterDemo: (userId: string, orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  commit: <T>(work: () => Promise<T>) => Promise<T>;
  refreshPush: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const flags = useMemo(() => {
    const state = { stale: false };
    return {
      read: () => state.stale,
      mark(value: boolean) {
        state.stale = value;
      },
    };
  }, []);
  const onlineRef = useMemo(() => ({ current: true }), []);
  const repo = useMemo(
    () =>
      createRepository({
        flags,
        isOnline: () => onlineRef.current,
      }),
    [flags, onlineRef],
  );
  const [ready, setReady] = useState(false);
  const [actor, setActor] = useState<Actor | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<MembershipSummary[]>([]);
  const [online, setOnline] = useState(true);
  const [stale, setStale] = useState(false);
  const [revision, setRevision] = useState(0);
  const [push, setPush] = useState<PushRegistration | null>(null);

  const sync = useCallback(async () => {
    const next = await repo.currentActor();
    setActor(next);
    if (next) {
      const [org, seats] = await Promise.all([repo.getActiveOrganization(), repo.listMemberships()]);
      setOrganization(org);
      setMemberships(seats);
    } else {
      setOrganization(null);
      setMemberships([]);
    }
    setStale(flags.read());
    setRevision((value) => value + 1);
  }, [flags, repo]);

  useEffect(() => {
    let cancelled = false;
    repo
      .restore()
      .then(async (session) => {
        if (cancelled) {
          return;
        }
        setActor(session);
        if (session) {
          const [org, seats] = await Promise.all([repo.getActiveOrganization(), repo.listMemberships()]);
          if (!cancelled) {
            setOrganization(org);
            setMemberships(seats);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false;
      onlineRef.current = connected;
      setOnline(connected);
    });
    return () => unsubscribe();
  }, [onlineRef]);

  const commit = useCallback(
    async <T,>(work: () => Promise<T>) => {
      const result = await work();
      await sync();
      return result;
    },
    [sync],
  );

  const refreshPush = useCallback(async () => {
    const registration = await registerForPush();
    setPush(registration);
    if (await repo.currentActor()) {
      await repo.registerPushToken(registration.token, registration.mode);
    }
  }, [repo]);

  const value = useMemo<WorkspaceValue>(
    () => ({
      ready,
      actor,
      organization,
      memberships,
      mode: repo.mode,
      online,
      stale,
      revision,
      push,
      repo,
      signIn: (email, password) => commit(() => repo.signInWithPassword(email, password)).then(() => undefined),
      requestMagicLink: (email) => repo.requestMagicLink(email),
      consumeMagicLink: (token) => commit(() => repo.consumeMagicLink(token)).then(() => undefined),
      enterDemo: (userId, orgId) => commit(() => repo.signInAsDemo(userId, orgId)).then(() => undefined),
      signOut: () => commit(() => repo.signOut()).then(() => undefined),
      switchOrganization: (orgId) => commit(() => repo.switchOrganization(orgId)).then(() => undefined),
      commit,
      refreshPush,
    }),
    [actor, commit, memberships, online, organization, push, ready, refreshPush, repo, revision, stale],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider');
  }
  return value;
}
