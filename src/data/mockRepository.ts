import { canSeeVisibility, deliverableInScope, isAgencyRole, isClientRole, projectInScope } from '@/domain/access';
import type {
  Actor,
  AppNotification,
  BillingSummary,
  ClientDetail,
  ClientSummary,
  CommentView,
  DecisionInput,
  DeliverableDetail,
  DeliverableSummary,
  MagicLinkResult,
  MembershipSummary,
  MessageView,
  NoteInput,
  Organization,
  ProjectDetail,
  ProjectSummary,
  QueueItem,
  ThreadDetail,
  ThreadSummary,
} from '@/domain/types';
import { WorkroomError } from '@/data/errors';
import type { Persistence } from '@/data/persistence';
import type {
  CommentRecord,
  Database,
  DeliverableRecord,
  MembershipRecord,
  MessageRecord,
  NotificationRecord,
  ProfileRecord,
  ProjectRecord,
  ThreadRecord,
} from '@/data/records';
import type { WorkroomRepository } from '@/data/repository';
import { createSeed } from '@/data/seed';

const DB_KEY = 'workroom.db';
const SESSION_KEY = 'workroom.session';

interface Session {
  userId: string;
  activeOrgId: string;
}

interface MockOptions {
  persistence: Persistence;
  seed?: Database;
  now?: () => string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new WorkroomError(`${label} needs a few words.`, 'invalid');
  }
  if (trimmed.length > 2000) {
    throw new WorkroomError(`${label} is too long.`, 'invalid');
  }
  return trimmed;
}

export function createMockRepository(options: MockOptions): WorkroomRepository {
  const now = options.now ?? (() => new Date().toISOString());
  let db: Database = clone(options.seed ?? createSeed());
  let session: Session | null = null;
  let loaded = false;

  async function load(): Promise<void> {
    if (loaded) {
      return;
    }
    const rawDb = await options.persistence.get(DB_KEY);
    const rawSession = await options.persistence.get(SESSION_KEY);
    db = rawDb ? (JSON.parse(rawDb) as Database) : clone(options.seed ?? createSeed());
    session = rawSession ? (JSON.parse(rawSession) as Session) : null;
    loaded = true;
    if (!rawDb) {
      await saveDb();
    }
  }

  async function saveDb(): Promise<void> {
    await options.persistence.set(DB_KEY, JSON.stringify(db));
  }

  async function saveSession(): Promise<void> {
    if (session) {
      await options.persistence.set(SESSION_KEY, JSON.stringify(session));
      return;
    }
    await options.persistence.remove(SESSION_KEY);
  }

  function profile(userId: string): ProfileRecord | undefined {
    return db.profiles.find((item) => item.id === userId);
  }

  function org(orgId: string): Organization | undefined {
    return db.organizations.find((item) => item.id === orgId);
  }

  function membership(userId: string, orgId: string): MembershipRecord | undefined {
    return db.memberships.find((item) => item.userId === userId && item.orgId === orgId);
  }

  function actorFromSession(): Actor | null {
    if (!session) {
      return null;
    }
    const person = profile(session.userId);
    const seat = membership(session.userId, session.activeOrgId);
    if (!person || !seat) {
      return null;
    }
    return {
      userId: person.id,
      activeOrgId: seat.orgId,
      role: seat.role,
      email: person.email,
      fullName: person.fullName,
      title: person.title,
    };
  }

  function requireActor(): Actor {
    const actor = actorFromSession();
    if (!actor) {
      throw new WorkroomError('Sign in to open this workspace.', 'unauthenticated');
    }
    return actor;
  }

  function defaultOrgId(userId: string, preferred?: string): string {
    const seats = db.memberships.filter((item) => item.userId === userId);
    if (preferred) {
      const match = seats.find((item) => item.orgId === preferred);
      if (!match) {
        throw new WorkroomError('That workspace is not on this account.', 'forbidden');
      }
      return match.orgId;
    }
    const clientSeat = seats.find((item) => {
      const organization = org(item.orgId);
      return organization?.kind === 'client';
    });
    const chosen = clientSeat ?? seats[0];
    if (!chosen) {
      throw new WorkroomError('This account is not in a workspace yet.', 'forbidden');
    }
    return chosen.orgId;
  }

  async function startSession(userId: string, orgId?: string): Promise<Actor> {
    session = { userId, activeOrgId: defaultOrgId(userId, orgId) };
    await saveSession();
    const actor = actorFromSession();
    if (!actor) {
      throw new WorkroomError('Sign in to open this workspace.', 'unauthenticated');
    }
    return actor;
  }

  function projectById(projectId: string): ProjectRecord | undefined {
    return db.projects.find((item) => item.id === projectId);
  }

  function visibleProject(actor: Actor, projectId: string): ProjectRecord {
    const project = projectById(projectId);
    if (!project || !projectInScope(actor, project)) {
      throw new WorkroomError('That project is not in this workspace.', 'not_found');
    }
    return project;
  }

  function visibleDeliverable(actor: Actor, deliverableId: string): DeliverableRecord {
    const deliverable = db.deliverables.find((item) => item.id === deliverableId);
    const project = deliverable ? projectById(deliverable.projectId) : undefined;
    if (!deliverable || !project || !deliverableInScope(actor, deliverable, project)) {
      throw new WorkroomError('That deliverable is not in this workspace.', 'not_found');
    }
    return deliverable;
  }

  function visibleThread(actor: Actor, threadId: string): ThreadRecord {
    const thread = db.threads.find((item) => item.id === threadId);
    const project = thread ? projectById(thread.projectId) : undefined;
    if (!thread || !project || !projectInScope(actor, project) || !canSeeVisibility(actor, thread.visibility)) {
      throw new WorkroomError('That conversation is not in this workspace.', 'not_found');
    }
    return thread;
  }

  function summarizeProject(actor: Actor, project: ProjectRecord): ProjectSummary {
    const client = org(project.clientOrgId);
    const milestones = db.milestones.filter((item) => item.projectId === project.id);
    const deliverables = db.deliverables.filter(
      (item) => item.projectId === project.id && deliverableInScope(actor, item, project),
    );
    return {
      id: project.id,
      name: project.name,
      summary: project.summary,
      status: project.status,
      clientOrgId: project.clientOrgId,
      clientName: client?.name ?? 'Client',
      brandColor: client?.brandColor ?? '#1C1712',
      updatedAt: project.updatedAt,
      pendingReviews: deliverables.filter(
        (item) => item.status === 'in_review' || item.status === 'changes_requested',
      ).length,
      milestonesDone: milestones.filter((item) => item.status === 'done').length,
      milestonesTotal: milestones.length,
    };
  }

  function summarizeDeliverable(record: DeliverableRecord): DeliverableSummary {
    return {
      id: record.id,
      projectId: record.projectId,
      milestoneId: record.milestoneId,
      title: record.title,
      kind: record.kind,
      status: record.status,
      visibility: record.visibility,
      version: record.version,
      fileName: record.fileName,
      previewKey: record.previewKey,
      updatedAt: record.updatedAt,
    };
  }

  function commentView(actor: Actor, record: CommentRecord): CommentView {
    const author = profile(record.authorId);
    return {
      id: record.id,
      authorId: record.authorId,
      authorName: author?.fullName ?? 'Workroom',
      authorTitle: author?.title ?? '',
      body: record.body,
      visibility: record.visibility,
      kind: record.kind,
      createdAt: record.createdAt,
      mine: record.authorId === actor.userId,
    };
  }

  function messageView(actor: Actor, record: MessageRecord): MessageView {
    const author = profile(record.authorId);
    return {
      id: record.id,
      authorId: record.authorId,
      authorName: author?.fullName ?? 'Workroom',
      authorTitle: author?.title ?? '',
      body: record.body,
      createdAt: record.createdAt,
      mine: record.authorId === actor.userId,
    };
  }

  function threadSummary(actor: Actor, thread: ThreadRecord): ThreadSummary {
    const project = projectById(thread.projectId);
    const client = project ? org(project.clientOrgId) : undefined;
    const messages = db.messages
      .filter((item) => item.threadId === thread.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = messages[messages.length - 1];
    const lastAuthor = last ? profile(last.authorId) : undefined;
    return {
      id: thread.id,
      projectId: thread.projectId,
      projectName: project?.name ?? 'Project',
      clientName: client?.name ?? 'Client',
      subject: thread.subject,
      visibility: thread.visibility,
      updatedAt: thread.updatedAt,
      lastBody: last?.body ?? '',
      lastAuthorName: lastAuthor?.fullName ?? '',
    };
  }

  function deliverableDetail(actor: Actor, record: DeliverableRecord): DeliverableDetail {
    const project = projectById(record.projectId);
    const client = project ? org(project.clientOrgId) : undefined;
    const comments = db.comments
      .filter((item) => item.deliverableId === record.id && canSeeVisibility(actor, item.visibility))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((item) => commentView(actor, item));
    return {
      ...summarizeDeliverable(record),
      filePreviewText: record.filePreviewText,
      pageCount: record.pageCount,
      projectName: project?.name ?? 'Project',
      clientName: client?.name ?? 'Client',
      clientOrgId: project?.clientOrgId ?? '',
      brandColor: client?.brandColor ?? '#1C1712',
      comments,
      canDecide: isClientRole(actor.role) && record.status !== 'draft',
      canWriteInternal: isAgencyRole(actor.role),
    };
  }

  function notify(userId: string, orgId: string, title: string, body: string, href: string): void {
    const record: NotificationRecord = {
      id: createId('ntf'),
      userId,
      orgId,
      title,
      body,
      href,
      read: false,
      createdAt: now(),
    };
    db.notifications.unshift(record);
  }

  function notifyAgency(project: ProjectRecord, title: string, body: string, href: string, exceptUserId?: string): void {
    const members = db.memberships.filter(
      (item) => item.orgId === project.agencyOrgId && isAgencyRole(item.role) && item.userId !== exceptUserId,
    );
    for (const member of members) {
      notify(member.userId, project.agencyOrgId, title, body, href);
    }
  }

  function notifyClient(project: ProjectRecord, title: string, body: string, href: string, exceptUserId?: string): void {
    const members = db.memberships.filter(
      (item) => item.orgId === project.clientOrgId && isClientRole(item.role) && item.userId !== exceptUserId,
    );
    for (const member of members) {
      notify(member.userId, project.clientOrgId, title, body, href);
    }
  }

  const repository: WorkroomRepository = {
    mode: 'mock',

    async restore() {
      await load();
      return actorFromSession();
    },

    async currentActor() {
      await load();
      return actorFromSession();
    },

    async signInWithPassword(email, password) {
      await load();
      const normalized = email.trim().toLowerCase();
      const person = db.profiles.find((item) => item.email === normalized);
      if (!person || person.password !== password) {
        throw new WorkroomError('That email and password do not match a Workroom account.', 'invalid');
      }
      return startSession(person.id);
    },

    async requestMagicLink(email): Promise<MagicLinkResult> {
      await load();
      const normalized = email.trim().toLowerCase();
      const person = db.profiles.find((item) => item.email === normalized);
      if (!person) {
        return { accepted: true };
      }
      const token = createId('ml');
      db.magicLinks.push({ token, email: person.email, userId: person.id, consumed: false });
      await saveDb();
      return { accepted: true, demoPath: `/auth/callback?token=${token}` };
    },

    async consumeMagicLink(token) {
      await load();
      const link = db.magicLinks.find((item) => item.token === token);
      if (!link || link.consumed) {
        throw new WorkroomError('That magic link has already been used or has expired.', 'invalid');
      }
      link.consumed = true;
      await saveDb();
      return startSession(link.userId);
    },

    async signInAsDemo(userId, orgId) {
      await load();
      if (!profile(userId)) {
        throw new WorkroomError('That demo account is not in this workspace.', 'not_found');
      }
      return startSession(userId, orgId);
    },

    async signOut() {
      await load();
      session = null;
      await saveSession();
    },

    async listMemberships() {
      await load();
      const actor = requireActor();
      return db.memberships
        .filter((item) => item.userId === actor.userId)
        .map((item): MembershipSummary => {
          const organization = org(item.orgId);
          return {
            orgId: item.orgId,
            orgName: organization?.name ?? 'Workspace',
            kind: organization?.kind ?? 'client',
            role: item.role,
            brandColor: organization?.brandColor ?? '#1C1712',
            mark: organization?.mark ?? 'W',
            tagline: organization?.tagline ?? '',
          };
        });
    },

    async switchOrganization(orgId) {
      await load();
      const actor = requireActor();
      if (!membership(actor.userId, orgId)) {
        throw new WorkroomError('That workspace is not on this account.', 'forbidden');
      }
      return startSession(actor.userId, orgId);
    },

    async getActiveOrganization() {
      await load();
      const actor = requireActor();
      const organization = org(actor.activeOrgId);
      if (!organization) {
        throw new WorkroomError('This workspace is missing.', 'not_found');
      }
      return organization;
    },

    async listProjects() {
      await load();
      const actor = requireActor();
      return db.projects
        .filter((project) => projectInScope(actor, project))
        .map((project) => summarizeProject(actor, project))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getProject(projectId) {
      await load();
      const actor = requireActor();
      const project = visibleProject(actor, projectId);
      const milestones = db.milestones
        .filter((item) => item.projectId === project.id)
        .sort((a, b) => a.sort - b.sort)
        .map((item) => ({
          id: item.id,
          title: item.title,
          detail: item.detail,
          dueOn: item.dueOn,
          status: item.status,
        }));
      const deliverables = db.deliverables
        .filter((item) => item.projectId === project.id && deliverableInScope(actor, item, project))
        .map(summarizeDeliverable);
      const threads = db.threads
        .filter(
          (item) =>
            item.projectId === project.id && canSeeVisibility(actor, item.visibility),
        )
        .map((item) => threadSummary(actor, item))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const detail: ProjectDetail = {
        ...summarizeProject(actor, project),
        milestones,
        deliverables,
        threads,
      };
      return detail;
    },

    async getDeliverable(deliverableId) {
      await load();
      const actor = requireActor();
      return deliverableDetail(actor, visibleDeliverable(actor, deliverableId));
    },

    async decideDeliverable(deliverableId, input: DecisionInput) {
      await load();
      const actor = requireActor();
      if (!isClientRole(actor.role)) {
        throw new WorkroomError('Only the client can approve work or request changes.', 'forbidden');
      }
      const record = visibleDeliverable(actor, deliverableId);
      if (record.status === 'draft') {
        throw new WorkroomError('That deliverable is not in this workspace.', 'not_found');
      }
      const project = visibleProject(actor, record.projectId);
      if (input.decision === 'approve' && record.status === 'approved') {
        throw new WorkroomError('This deliverable is already approved.', 'invalid');
      }
      const comment =
        input.decision === 'request_changes'
          ? requireText(input.comment, 'A change request')
          : input.comment.trim();
      record.status = input.decision === 'approve' ? 'approved' : 'changes_requested';
      record.updatedAt = now();
      project.updatedAt = record.updatedAt;
      if (comment) {
        db.comments.push({
          id: createId('cmt'),
          deliverableId: record.id,
          authorId: actor.userId,
          body: comment,
          visibility: 'client',
          kind: input.decision === 'approve' ? 'approval' : 'change_request',
          createdAt: record.updatedAt,
        });
      }
      const client = org(project.clientOrgId);
      if (input.decision === 'approve') {
        notifyAgency(
          project,
          `${client?.name ?? 'A client'} approved ${record.title}`,
          comment || `${actor.fullName} approved version ${record.version}.`,
          `/review/${record.id}`,
        );
      } else {
        notifyAgency(
          project,
          `${client?.name ?? 'A client'} requested changes`,
          comment,
          `/review/${record.id}`,
        );
      }
      await saveDb();
      return deliverableDetail(actor, record);
    },

    async addDeliverableNote(deliverableId, input: NoteInput) {
      await load();
      const actor = requireActor();
      const record = visibleDeliverable(actor, deliverableId);
      const project = visibleProject(actor, record.projectId);
      if (input.visibility === 'internal' && !isAgencyRole(actor.role)) {
        throw new WorkroomError('Internal notes stay with the studio.', 'forbidden');
      }
      const body = requireText(input.body, input.visibility === 'internal' ? 'An internal note' : 'A reply');
      const createdAt = now();
      db.comments.push({
        id: createId('cmt'),
        deliverableId: record.id,
        authorId: actor.userId,
        body,
        visibility: input.visibility,
        kind: 'note',
        createdAt,
      });
      record.updatedAt = createdAt;
      project.updatedAt = createdAt;
      if (input.visibility === 'internal') {
        notifyAgency(project, `Internal note on ${record.title}`, body, `/review/${record.id}`, actor.userId);
      } else if (isAgencyRole(actor.role)) {
        notifyClient(
          project,
          `${actor.fullName} replied on ${record.title}`,
          body,
          `/review/${record.id}`,
          actor.userId,
        );
      } else {
        notifyAgency(
          project,
          `${actor.fullName} replied on ${record.title}`,
          body,
          `/review/${record.id}`,
          actor.userId,
        );
      }
      await saveDb();
      return deliverableDetail(actor, record);
    },

    async listThreads() {
      await load();
      const actor = requireActor();
      return db.threads
        .filter((thread) => {
          const project = projectById(thread.projectId);
          return (
            project &&
            projectInScope(actor, project) &&
            canSeeVisibility(actor, thread.visibility)
          );
        })
        .map((thread) => threadSummary(actor, thread))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getThread(threadId) {
      await load();
      const actor = requireActor();
      const thread = visibleThread(actor, threadId);
      const messages = db.messages
        .filter((item) => item.threadId === thread.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((item) => messageView(actor, item));
      const detail: ThreadDetail = { ...threadSummary(actor, thread), messages };
      return detail;
    },

    async postMessage(threadId, body) {
      await load();
      const actor = requireActor();
      const thread = visibleThread(actor, threadId);
      const project = visibleProject(actor, thread.projectId);
      const text = requireText(body, 'A message');
      const createdAt = now();
      db.messages.push({
        id: createId('msg'),
        threadId: thread.id,
        authorId: actor.userId,
        body: text,
        createdAt,
      });
      thread.updatedAt = createdAt;
      project.updatedAt = createdAt;
      if (thread.visibility === 'internal') {
        notifyAgency(project, `Studio note on ${project.name}`, text, `/thread/${thread.id}`, actor.userId);
      } else if (isAgencyRole(actor.role)) {
        notifyClient(project, `${actor.fullName} wrote on ${project.name}`, text, `/thread/${thread.id}`, actor.userId);
      } else {
        notifyAgency(project, `${actor.fullName} wrote on ${project.name}`, text, `/thread/${thread.id}`, actor.userId);
      }
      await saveDb();
      const messages = db.messages
        .filter((item) => item.threadId === thread.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((item) => messageView(actor, item));
      return { ...threadSummary(actor, thread), messages };
    },

    async listNotifications() {
      await load();
      const actor = requireActor();
      return db.notifications
        .filter((item) => item.userId === actor.userId && item.orgId === actor.activeOrgId)
        .map(
          (item): AppNotification => ({
            id: item.id,
            title: item.title,
            body: item.body,
            href: item.href,
            read: item.read,
            createdAt: item.createdAt,
          }),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async markNotificationRead(notificationId) {
      await load();
      const actor = requireActor();
      const record = db.notifications.find(
        (item) => item.id === notificationId && item.userId === actor.userId && item.orgId === actor.activeOrgId,
      );
      if (!record) {
        throw new WorkroomError('That alert is not in this workspace.', 'not_found');
      }
      record.read = true;
      await saveDb();
    },

    async markAllNotificationsRead() {
      await load();
      const actor = requireActor();
      for (const record of db.notifications) {
        if (record.userId === actor.userId && record.orgId === actor.activeOrgId) {
          record.read = true;
        }
      }
      await saveDb();
    },

    async listApprovalQueue() {
      await load();
      const actor = requireActor();
      if (!isAgencyRole(actor.role)) {
        throw new WorkroomError('The approval queue is for studio members.', 'forbidden');
      }
      const items: QueueItem[] = [];
      for (const deliverable of db.deliverables) {
        if (deliverable.status !== 'in_review' && deliverable.status !== 'changes_requested') {
          continue;
        }
        const project = projectById(deliverable.projectId);
        if (!project || !deliverableInScope(actor, deliverable, project)) {
          continue;
        }
        const client = org(project.clientOrgId);
        items.push({
          deliverableId: deliverable.id,
          title: deliverable.title,
          kind: deliverable.kind,
          status: deliverable.status,
          version: deliverable.version,
          updatedAt: deliverable.updatedAt,
          projectId: project.id,
          projectName: project.name,
          clientOrgId: project.clientOrgId,
          clientName: client?.name ?? 'Client',
          brandColor: client?.brandColor ?? '#1C1712',
          previewKey: deliverable.previewKey,
        });
      }
      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async listClients() {
      await load();
      const actor = requireActor();
      if (!isAgencyRole(actor.role)) {
        throw new WorkroomError('Client lists are for studio members.', 'forbidden');
      }
      return db.organizations
        .filter((item) => item.parentOrgId === actor.activeOrgId)
        .map((item): ClientSummary => {
          const projects = db.projects.filter((project) => project.clientOrgId === item.id);
          const pending = db.deliverables.filter((deliverable) => {
            const project = projectById(deliverable.projectId);
            return (
              project?.clientOrgId === item.id &&
              (deliverable.status === 'in_review' || deliverable.status === 'changes_requested') &&
              deliverable.visibility === 'client'
            );
          }).length;
          return {
            id: item.id,
            name: item.name,
            tagline: item.tagline,
            brandColor: item.brandColor,
            mark: item.mark,
            projectCount: projects.length,
            pendingReviews: pending,
          };
        });
    },

    async getClient(orgId) {
      await load();
      const actor = requireActor();
      if (!isAgencyRole(actor.role)) {
        throw new WorkroomError('Client lists are for studio members.', 'forbidden');
      }
      const organization = db.organizations.find(
        (item) => item.id === orgId && item.parentOrgId === actor.activeOrgId,
      );
      if (!organization) {
        throw new WorkroomError('That client is not in this studio.', 'not_found');
      }
      const projects = db.projects
        .filter((project) => project.clientOrgId === organization.id)
        .map((project) => summarizeProject(actor, project));
      const detail: ClientDetail = {
        id: organization.id,
        name: organization.name,
        tagline: organization.tagline,
        brandColor: organization.brandColor,
        mark: organization.mark,
        projectCount: projects.length,
        pendingReviews: projects.reduce((sum, project) => sum + project.pendingReviews, 0),
        projects,
      };
      return detail;
    },

    async getBilling() {
      await load();
      const actor = requireActor();
      const organization = org(actor.activeOrgId);
      const subscription = db.subscriptions.find((item) => item.orgId === actor.activeOrgId);
      if (!organization || !subscription) {
        throw new WorkroomError('No subscription is recorded for this workspace.', 'not_found');
      }
      const summary: BillingSummary = {
        orgId: organization.id,
        orgName: organization.name,
        plan: subscription.plan,
        status: subscription.status,
        seatCount: subscription.seatCount,
        renewsOn: subscription.renewsOn,
        provider: 'stripe-test',
        priceId: subscription.priceId,
      };
      return summary;
    },

    async registerPushToken(token, platform) {
      await load();
      const actor = requireActor();
      const existing = db.pushTokens.find((item) => item.userId === actor.userId && item.token === token);
      if (!existing) {
        db.pushTokens.push({
          id: createId('push'),
          userId: actor.userId,
          token,
          platform,
          createdAt: now(),
        });
        await saveDb();
      }
    },

    async sendTestNotification() {
      await load();
      const actor = requireActor();
      const createdAt = now();
      const record: NotificationRecord = {
        id: createId('ntf'),
        userId: actor.userId,
        orgId: actor.activeOrgId,
        title: 'Test alert',
        body: 'This stayed on the device. A phone build also schedules it with Expo Notifications.',
        href: '/alerts',
        read: false,
        createdAt,
      };
      db.notifications.unshift(record);
      await saveDb();
      return {
        id: record.id,
        title: record.title,
        body: record.body,
        href: record.href,
        read: record.read,
        createdAt: record.createdAt,
      };
    },
  };

  return repository;
}
