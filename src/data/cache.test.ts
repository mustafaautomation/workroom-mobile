import type { ProjectSummary } from '@/domain/types';
import { withReadCache } from '@/data/cache';
import { WorkroomError } from '@/data/errors';
import { createMemoryPersistence } from '@/data/persistence';
import type { WorkroomRepository } from '@/data/repository';

const actor = {
  userId: 'usr_lena',
  activeOrgId: 'org_harbor',
  role: 'client_admin' as const,
  email: 'lena@harborandco.example',
  fullName: 'Lena Okonkwo',
  title: 'Brand director',
};

const project: ProjectSummary = {
  id: 'prj_lookbook',
  name: 'Spring Lookbook',
  summary: 'Editorial stills.',
  status: 'active',
  clientOrgId: 'org_harbor',
  clientName: 'Harbor & Co',
  brandColor: '#1F4E5A',
  updatedAt: '2026-11-24T15:00:00.000Z',
  pendingReviews: 1,
  milestonesDone: 2,
  milestonesTotal: 4,
};

function stub(listProjects: WorkroomRepository['listProjects']): WorkroomRepository {
  const unused = async () => {
    throw new Error('not used');
  };
  return {
    mode: 'mock',
    restore: async () => actor,
    currentActor: async () => actor,
    signInWithPassword: unused,
    requestMagicLink: unused,
    consumeMagicLink: unused,
    signInAsDemo: unused,
    signOut: async () => undefined,
    listMemberships: unused,
    switchOrganization: unused,
    getActiveOrganization: unused,
    listProjects,
    getProject: unused,
    getDeliverable: unused,
    decideDeliverable: unused,
    addDeliverableNote: unused,
    listThreads: unused,
    getThread: unused,
    postMessage: unused,
    listNotifications: unused,
    markNotificationRead: unused,
    markAllNotificationsRead: unused,
    listApprovalQueue: unused,
    listClients: unused,
    getClient: unused,
    getBilling: unused,
    registerPushToken: unused,
    sendTestNotification: unused,
  };
}

describe('read cache', () => {
  it('serves the saved copy when the workspace is offline', async () => {
    let online = true;
    let calls = 0;
    const flags = { stale: false, mark(value: boolean) { this.stale = value; } };
    const wrapped = withReadCache(
      stub(async () => {
        calls += 1;
        return [project];
      }),
      createMemoryPersistence(),
      flags,
      () => online,
    );

    await expect(wrapped.listProjects()).resolves.toEqual([project]);
    expect(calls).toBe(1);
    expect(flags.stale).toBe(false);

    online = false;
    await expect(wrapped.listProjects()).resolves.toEqual([project]);
    expect(calls).toBe(1);
    expect(flags.stale).toBe(true);
  });

  it('does not call through when offline and nothing is saved', async () => {
    let calls = 0;
    const wrapped = withReadCache(
      stub(async () => {
        calls += 1;
        return [project];
      }),
      createMemoryPersistence(),
      { mark() {} },
      () => false,
    );
    await expect(wrapped.listProjects()).rejects.toMatchObject({ code: 'offline' });
    expect(calls).toBe(0);
  });

  it('falls back to the saved copy when a read throws', async () => {
    let fail = false;
    const wrapped = withReadCache(
      stub(async () => {
        if (fail) {
          throw new Error('network down');
        }
        return [project];
      }),
      createMemoryPersistence(),
      { mark() {} },
      () => true,
    );
    await wrapped.listProjects();
    fail = true;
    await expect(wrapped.listProjects()).resolves.toEqual([project]);
  });

  it('does not hide a forbidden response behind the cache', async () => {
    const wrapped = withReadCache(
      stub(async () => {
        throw new WorkroomError('The approval queue is for studio members.', 'forbidden');
      }),
      createMemoryPersistence(),
      { mark() {} },
    );
    await expect(wrapped.listProjects()).rejects.toMatchObject({ code: 'forbidden' });
  });
});
