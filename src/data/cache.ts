import type { DataMode } from '@/domain/types';
import { WorkroomError } from '@/data/errors';
import type { Persistence } from '@/data/persistence';
import type { WorkroomRepository } from '@/data/repository';

const CACHE_KEY = 'workroom.read-cache';

export interface CacheFlags {
  mark(stale: boolean): void;
}

async function readBlob(persistence: Persistence): Promise<Record<string, string>> {
  const raw = await persistence.get(CACHE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeBlob(persistence: Persistence, blob: Record<string, string>): Promise<void> {
  await persistence.set(CACHE_KEY, JSON.stringify(blob));
}

export function withReadCache(
  inner: WorkroomRepository,
  persistence: Persistence,
  flags: CacheFlags,
  isOnline: () => boolean = () => true,
): WorkroomRepository {
  async function scopedKey(key: string): Promise<string> {
    const actor = await inner.currentActor();
    return `${actor?.userId ?? 'anon'}:${actor?.activeOrgId ?? 'none'}:${key}`;
  }

  async function read<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cacheKey = await scopedKey(key);
    const blob = await readBlob(persistence);
    if (!isOnline()) {
      const hit = blob[cacheKey];
      if (hit) {
        flags.mark(true);
        return JSON.parse(hit) as T;
      }
      throw new WorkroomError(
        'You are offline and this screen has not been saved on this device yet.',
        'offline',
      );
    }
    try {
      const value = await fetcher();
      blob[cacheKey] = JSON.stringify(value);
      await writeBlob(persistence, blob);
      flags.mark(false);
      return value;
    } catch (error) {
      const recoverable =
        !(error instanceof WorkroomError) ||
        (error.code !== 'forbidden' &&
          error.code !== 'not_found' &&
          error.code !== 'unauthenticated' &&
          error.code !== 'invalid');
      const hit = blob[cacheKey];
      if (recoverable && hit) {
        flags.mark(true);
        return JSON.parse(hit) as T;
      }
      throw error;
    }
  }

  async function clear(): Promise<void> {
    await persistence.remove(CACHE_KEY);
  }

  async function write<T>(work: () => Promise<T>): Promise<T> {
    const result = await work();
    await clear();
    return result;
  }

  const mode: DataMode = inner.mode;

  return {
    mode,
    restore: () => inner.restore(),
    currentActor: () => inner.currentActor(),
    signInWithPassword: (email, password) => write(() => inner.signInWithPassword(email, password)),
    requestMagicLink: (email) => write(() => inner.requestMagicLink(email)),
    consumeMagicLink: (token) => write(() => inner.consumeMagicLink(token)),
    signInAsDemo: (userId, orgId) => write(() => inner.signInAsDemo(userId, orgId)),
    signOut: () => write(() => inner.signOut()),
    listMemberships: () => read('memberships', () => inner.listMemberships()),
    switchOrganization: (orgId) => write(() => inner.switchOrganization(orgId)),
    getActiveOrganization: () => read('organization', () => inner.getActiveOrganization()),
    listProjects: () => read('projects', () => inner.listProjects()),
    getProject: (projectId) => read(`project:${projectId}`, () => inner.getProject(projectId)),
    getDeliverable: (deliverableId) =>
      read(`deliverable:${deliverableId}`, () => inner.getDeliverable(deliverableId)),
    decideDeliverable: (deliverableId, input) =>
      write(() => inner.decideDeliverable(deliverableId, input)),
    addDeliverableNote: (deliverableId, input) =>
      write(() => inner.addDeliverableNote(deliverableId, input)),
    listThreads: () => read('threads', () => inner.listThreads()),
    getThread: (threadId) => read(`thread:${threadId}`, () => inner.getThread(threadId)),
    postMessage: (threadId, body) => write(() => inner.postMessage(threadId, body)),
    listNotifications: () => read('notifications', () => inner.listNotifications()),
    markNotificationRead: (notificationId) => write(() => inner.markNotificationRead(notificationId)),
    markAllNotificationsRead: () => write(() => inner.markAllNotificationsRead()),
    listApprovalQueue: () => read('queue', () => inner.listApprovalQueue()),
    listClients: () => read('clients', () => inner.listClients()),
    getClient: (orgId) => read(`client:${orgId}`, () => inner.getClient(orgId)),
    getBilling: () => read('billing', () => inner.getBilling()),
    registerPushToken: (token, platform) => write(() => inner.registerPushToken(token, platform)),
    sendTestNotification: () => write(() => inner.sendTestNotification()),
  };
}
