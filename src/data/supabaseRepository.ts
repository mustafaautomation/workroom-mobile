import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { isAgencyRole, isClientRole } from '@/domain/access';
import type {
  Actor,
  AppNotification,
  BillingSummary,
  ClientDetail,
  ClientSummary,
  CommentView,
  DecisionInput,
  DeliverableDetail,
  DeliverableKind,
  DeliverableStatus,
  DeliverableSummary,
  MagicLinkResult,
  MembershipSummary,
  MessageView,
  NoteInput,
  Organization,
  OrgKind,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  QueueItem,
  Role,
  SubscriptionStatus,
  ThreadDetail,
  Visibility,
} from '@/domain/types';
import { WorkroomError } from '@/data/errors';
import type { Persistence } from '@/data/persistence';
import type { WorkroomRepository } from '@/data/repository';

interface SupabaseEnv {
  url: string;
  anonKey: string;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  title: string;
}

interface MembershipRow {
  org_id: string;
  role: Role;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  kind: OrgKind;
  parent_org_id: string | null;
  brand_color: string;
  tagline: string;
  mark: string;
}

interface ProjectRow {
  id: string;
  client_org_id: string;
  agency_org_id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  updated_at: string;
}

interface MilestoneRow {
  id: string;
  project_id: string;
  title: string;
  detail: string;
  due_on: string;
  status: 'upcoming' | 'active' | 'done';
  sort: number;
}

interface DeliverableRow {
  id: string;
  project_id: string;
  milestone_id: string;
  title: string;
  kind: DeliverableKind;
  status: DeliverableStatus;
  visibility: Visibility;
  version: number;
  file_name: string;
  preview_key: string;
  file_preview_text: string | null;
  page_count: number | null;
  updated_at: string;
}

interface CommentRow {
  id: string;
  deliverable_id: string;
  author_id: string;
  body: string;
  visibility: Visibility;
  kind: CommentView['kind'];
  created_at: string;
}

interface ThreadRow {
  id: string;
  project_id: string;
  subject: string;
  visibility: Visibility;
  updated_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  created_at: string;
}

function fail(error: { message: string } | null, fallback: string): void {
  if (!error) {
    return;
  }
  const message = error.message.toLowerCase();
  if (message.includes('forbidden') || message.includes('permission denied') || message.includes('row-level')) {
    throw new WorkroomError(fallback, 'forbidden');
  }
  if (message.includes('not_found') || message.includes('0 rows')) {
    throw new WorkroomError(fallback, 'not_found');
  }
  if (message.includes('unauthenticated') || message.includes('jwt')) {
    throw new WorkroomError('Sign in to open this workspace.', 'unauthenticated');
  }
  if (message.includes('invalid')) {
    throw new WorkroomError(fallback, 'invalid');
  }
  throw new WorkroomError(error.message || fallback, 'invalid');
}

function list<T>(data: T[] | null): T[] {
  return data ?? [];
}

export function createSupabaseRepository(env: SupabaseEnv, persistence: Persistence): WorkroomRepository {
  let client: SupabaseClient | null = null;

  function db(): SupabaseClient {
    if (!client) {
      client = createClient(env.url, env.anonKey, {
        auth: {
          storage: {
            getItem: (key) => persistence.get(key),
            setItem: (key, value) => persistence.set(key, value),
            removeItem: (key) => persistence.remove(key),
          },
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    }
    return client;
  }

  async function loadActor(): Promise<Actor | null> {
    const { data: sessionData, error: sessionError } = await db().auth.getSession();
    fail(sessionError, 'Sign in to open this workspace.');
    const user = sessionData.session?.user;
    if (!user) {
      return null;
    }

    const profileResult = await db()
      .from('profiles')
      .select('id, email, full_name, title')
      .eq('id', user.id)
      .maybeSingle();
    fail(profileResult.error, 'Your profile is not in Workroom yet. Ask the studio to add you.');
    const person = profileResult.data as ProfileRow | null;
    if (!person) {
      throw new WorkroomError('Your profile is not in Workroom yet. Ask the studio to add you.', 'forbidden');
    }

    const seatResult = await db().from('memberships').select('org_id, role').eq('user_id', user.id);
    fail(seatResult.error, 'This account is not in a workspace yet.');
    const seats = list(seatResult.data as MembershipRow[] | null);
    if (seats.length === 0) {
      throw new WorkroomError('This account is not in a workspace yet.', 'forbidden');
    }

    const activeResult = await db().from('active_orgs').select('org_id').eq('user_id', user.id).maybeSingle();
    fail(activeResult.error, 'This workspace is missing.');
    let orgId = (activeResult.data as { org_id: string } | null)?.org_id;
    if (!orgId || !seats.some((seat) => seat.org_id === orgId)) {
      const preferred =
        seats.find((seat) => seat.role === 'client_admin' || seat.role === 'client_member') ?? seats[0];
      if (!preferred) {
        throw new WorkroomError('This account is not in a workspace yet.', 'forbidden');
      }
      const switched = await db().rpc('switch_organization', { p_org_id: preferred.org_id });
      fail(switched.error, 'That workspace is not on this account.');
      orgId = preferred.org_id;
    }
    const seat = seats.find((item) => item.org_id === orgId);
    if (!seat) {
      throw new WorkroomError('That workspace is not on this account.', 'forbidden');
    }
    return {
      userId: person.id,
      activeOrgId: seat.org_id,
      role: seat.role,
      email: person.email,
      fullName: person.full_name,
      title: person.title,
    };
  }

  async function requireActor(): Promise<Actor> {
    const actor = await loadActor();
    if (!actor) {
      throw new WorkroomError('Sign in to open this workspace.', 'unauthenticated');
    }
    return actor;
  }

  async function organizations(): Promise<OrgRow[]> {
    const result = await db()
      .from('organizations')
      .select('id, name, slug, kind, parent_org_id, brand_color, tagline, mark');
    fail(result.error, 'This workspace is missing.');
    return list(result.data as OrgRow[] | null);
  }

  function toOrg(row: OrgRow): Organization {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      kind: row.kind,
      parentOrgId: row.parent_org_id,
      brandColor: row.brand_color,
      tagline: row.tagline,
      mark: row.mark,
    };
  }

  async function projectRows(): Promise<ProjectRow[]> {
    const result = await db()
      .from('projects')
      .select('id, client_org_id, agency_org_id, name, summary, status, updated_at')
      .order('updated_at', { ascending: false });
    fail(result.error, 'Projects could not be opened.');
    return list(result.data as ProjectRow[] | null);
  }

  async function summarize(actor: Actor, projects: ProjectRow[]): Promise<ProjectSummary[]> {
    const orgs = await organizations();
    const milestoneResult = await db().from('milestones').select('project_id, status');
    fail(milestoneResult.error, 'Projects could not be opened.');
    const deliverableResult = await db().from('deliverables').select('project_id, status');
    fail(deliverableResult.error, 'Projects could not be opened.');
    const milestones = list(milestoneResult.data as { project_id: string; status: string }[] | null);
    const deliverables = list(deliverableResult.data as { project_id: string; status: string }[] | null);
    return projects.map((project) => {
      const client = orgs.find((item) => item.id === project.client_org_id);
      const projectMilestones = milestones.filter((item) => item.project_id === project.id);
      const projectDeliverables = deliverables.filter((item) => item.project_id === project.id);
      return {
        id: project.id,
        name: project.name,
        summary: project.summary,
        status: project.status,
        clientOrgId: project.client_org_id,
        clientName: client?.name ?? 'Client',
        brandColor: client?.brand_color ?? '#1C1712',
        updatedAt: project.updated_at,
        pendingReviews: projectDeliverables.filter(
          (item) => item.status === 'in_review' || item.status === 'changes_requested',
        ).length,
        milestonesDone: projectMilestones.filter((item) => item.status === 'done').length,
        milestonesTotal: projectMilestones.length,
      };
    });
  }

  async function profilesByIds(ids: string[]): Promise<ProfileRow[]> {
    if (ids.length === 0) {
      return [];
    }
    const result = await db().from('profiles').select('id, email, full_name, title').in('id', ids);
    fail(result.error, 'People in this workspace could not be loaded.');
    return list(result.data as ProfileRow[] | null);
  }

  async function deliverableDetail(actor: Actor, row: DeliverableRow): Promise<DeliverableDetail> {
    const projectResult = await db()
      .from('projects')
      .select('id, name, client_org_id')
      .eq('id', row.project_id)
      .maybeSingle();
    fail(projectResult.error, 'That deliverable is not in this workspace.');
    const project = projectResult.data as { id: string; name: string; client_org_id: string } | null;
    if (!project) {
      throw new WorkroomError('That deliverable is not in this workspace.', 'not_found');
    }
    const orgs = await organizations();
    const client = orgs.find((item) => item.id === project.client_org_id);
    const commentResult = await db()
      .from('comments')
      .select('id, deliverable_id, author_id, body, visibility, kind, created_at')
      .eq('deliverable_id', row.id)
      .order('created_at', { ascending: true });
    fail(commentResult.error, 'Comments could not be opened.');
    const comments = list(commentResult.data as CommentRow[] | null);
    const people = await profilesByIds(comments.map((item) => item.author_id));
    const views: CommentView[] = comments.map((item) => {
      const author = people.find((person) => person.id === item.author_id);
      return {
        id: item.id,
        authorId: item.author_id,
        authorName: author?.full_name ?? 'Workroom',
        authorTitle: author?.title ?? '',
        body: item.body,
        visibility: item.visibility,
        kind: item.kind,
        createdAt: item.created_at,
        mine: item.author_id === actor.userId,
      };
    });
    const summary: DeliverableSummary = {
      id: row.id,
      projectId: row.project_id,
      milestoneId: row.milestone_id,
      title: row.title,
      kind: row.kind,
      status: row.status,
      visibility: row.visibility,
      version: row.version,
      fileName: row.file_name,
      previewKey: row.preview_key,
      updatedAt: row.updated_at,
    };
    return {
      ...summary,
      filePreviewText: row.file_preview_text,
      pageCount: row.page_count,
      projectName: project.name,
      clientName: client?.name ?? 'Client',
      clientOrgId: project.client_org_id,
      brandColor: client?.brand_color ?? '#1C1712',
      comments: views,
      canDecide: isClientRole(actor.role) && row.status !== 'draft',
      canWriteInternal: isAgencyRole(actor.role),
    };
  }

  async function fetchDeliverable(id: string): Promise<DeliverableRow> {
    const result = await db().from('deliverables').select('*').eq('id', id).maybeSingle();
    fail(result.error, 'That deliverable is not in this workspace.');
    if (!result.data) {
      throw new WorkroomError('That deliverable is not in this workspace.', 'not_found');
    }
    return result.data as DeliverableRow;
  }

  async function threadDetail(actor: Actor, thread: ThreadRow): Promise<ThreadDetail> {
    const projects = await projectRows();
    const project = projects.find((item) => item.id === thread.project_id);
    const orgs = await organizations();
    const client = orgs.find((item) => item.id === project?.client_org_id);
    const messageResult = await db()
      .from('messages')
      .select('id, thread_id, author_id, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });
    fail(messageResult.error, 'That conversation is not in this workspace.');
    const messages = list(messageResult.data as MessageRow[] | null);
    const people = await profilesByIds(messages.map((item) => item.author_id));
    const views: MessageView[] = messages.map((item) => {
      const author = people.find((person) => person.id === item.author_id);
      return {
        id: item.id,
        authorId: item.author_id,
        authorName: author?.full_name ?? 'Workroom',
        authorTitle: author?.title ?? '',
        body: item.body,
        createdAt: item.created_at,
        mine: item.author_id === actor.userId,
      };
    });
    const last = views[views.length - 1];
    return {
      id: thread.id,
      projectId: thread.project_id,
      projectName: project?.name ?? 'Project',
      clientName: client?.name ?? 'Client',
      subject: thread.subject,
      visibility: thread.visibility,
      updatedAt: thread.updated_at,
      lastBody: last?.body ?? '',
      lastAuthorName: last?.authorName ?? '',
      messages: views,
    };
  }

  return {
    mode: 'supabase',

    async restore() {
      return loadActor();
    },

    async currentActor() {
      return loadActor();
    },

    async signInWithPassword(email, password) {
      const result = await db().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.error) {
        throw new WorkroomError('That email and password do not match a Workroom account.', 'invalid');
      }
      return requireActor();
    },

    async requestMagicLink(email): Promise<MagicLinkResult> {
      const result = await db().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: Linking.createURL('/auth/callback') },
      });
      if (result.error) {
        throw new WorkroomError('Workroom could not send that link. Check the email and try again.', 'invalid');
      }
      return { accepted: true };
    },

    async consumeMagicLink(token) {
      const otp = await db().auth.verifyOtp({ token_hash: token, type: 'email' });
      if (otp.error) {
        const exchanged = await db().auth.exchangeCodeForSession(token);
        if (exchanged.error) {
          throw new WorkroomError('That magic link has already been used or has expired.', 'invalid');
        }
      }
      return requireActor();
    },

    async signInAsDemo() {
      throw new WorkroomError('Demo entry is only available before Supabase keys are set.', 'invalid');
    },

    async signOut() {
      const result = await db().auth.signOut();
      fail(result.error, 'Sign out did not finish.');
    },

    async listMemberships() {
      const actor = await requireActor();
      const seatResult = await db().from('memberships').select('org_id, role').eq('user_id', actor.userId);
      fail(seatResult.error, 'Workspaces could not be opened.');
      const seats = list(seatResult.data as MembershipRow[] | null);
      const orgs = await organizations();
      return seats.map((seat): MembershipSummary => {
        const organization = orgs.find((item) => item.id === seat.org_id);
        return {
          orgId: seat.org_id,
          orgName: organization?.name ?? 'Workspace',
          kind: organization?.kind ?? 'client',
          role: seat.role,
          brandColor: organization?.brand_color ?? '#1C1712',
          mark: organization?.mark ?? 'W',
          tagline: organization?.tagline ?? '',
        };
      });
    },

    async switchOrganization(orgId) {
      const result = await db().rpc('switch_organization', { p_org_id: orgId });
      fail(result.error, 'That workspace is not on this account.');
      return requireActor();
    },

    async getActiveOrganization() {
      const actor = await requireActor();
      const orgs = await organizations();
      const organization = orgs.find((item) => item.id === actor.activeOrgId);
      if (!organization) {
        throw new WorkroomError('This workspace is missing.', 'not_found');
      }
      return toOrg(organization);
    },

    async listProjects() {
      const actor = await requireActor();
      return summarize(actor, await projectRows());
    },

    async getProject(projectId) {
      const actor = await requireActor();
      const projects = await projectRows();
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        throw new WorkroomError('That project is not in this workspace.', 'not_found');
      }
      const [summary] = await summarize(actor, [project]);
      if (!summary) {
        throw new WorkroomError('That project is not in this workspace.', 'not_found');
      }
      const milestoneResult = await db()
        .from('milestones')
        .select('id, project_id, title, detail, due_on, status, sort')
        .eq('project_id', projectId)
        .order('sort', { ascending: true });
      fail(milestoneResult.error, 'That project is not in this workspace.');
      const deliverableResult = await db()
        .from('deliverables')
        .select('id, project_id, milestone_id, title, kind, status, visibility, version, file_name, preview_key, updated_at')
        .eq('project_id', projectId);
      fail(deliverableResult.error, 'That project is not in this workspace.');
      const threadResult = await db()
        .from('threads')
        .select('id, project_id, subject, visibility, updated_at')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
      fail(threadResult.error, 'That project is not in this workspace.');
      const threads = list(threadResult.data as ThreadRow[] | null);
      const detailedThreads = await Promise.all(threads.map((thread) => threadDetail(actor, thread)));
      const detail: ProjectDetail = {
        ...summary,
        milestones: list(milestoneResult.data as MilestoneRow[] | null).map((item) => ({
          id: item.id,
          title: item.title,
          detail: item.detail,
          dueOn: item.due_on,
          status: item.status,
        })),
        deliverables: list(deliverableResult.data as DeliverableRow[] | null).map((item) => ({
          id: item.id,
          projectId: item.project_id,
          milestoneId: item.milestone_id,
          title: item.title,
          kind: item.kind,
          status: item.status,
          visibility: item.visibility,
          version: item.version,
          fileName: item.file_name,
          previewKey: item.preview_key,
          updatedAt: item.updated_at,
        })),
        threads: detailedThreads.map((thread) => ({
          id: thread.id,
          projectId: thread.projectId,
          projectName: thread.projectName,
          clientName: thread.clientName,
          subject: thread.subject,
          visibility: thread.visibility,
          updatedAt: thread.updatedAt,
          lastBody: thread.lastBody,
          lastAuthorName: thread.lastAuthorName,
        })),
      };
      return detail;
    },

    async getDeliverable(deliverableId) {
      const actor = await requireActor();
      return deliverableDetail(actor, await fetchDeliverable(deliverableId));
    },

    async decideDeliverable(deliverableId, input: DecisionInput) {
      const actor = await requireActor();
      const result = await db().rpc('decide_deliverable', {
        p_deliverable_id: deliverableId,
        p_decision: input.decision,
        p_comment: input.comment,
      });
      fail(
        result.error,
        input.decision === 'request_changes'
          ? 'A change request needs a few words.'
          : 'That decision could not be saved.',
      );
      return deliverableDetail(actor, await fetchDeliverable(deliverableId));
    },

    async addDeliverableNote(deliverableId, input: NoteInput) {
      const actor = await requireActor();
      const result = await db().rpc('add_deliverable_note', {
        p_deliverable_id: deliverableId,
        p_body: input.body,
        p_visibility: input.visibility,
      });
      fail(result.error, 'That note could not be saved.');
      return deliverableDetail(actor, await fetchDeliverable(deliverableId));
    },

    async listThreads() {
      const actor = await requireActor();
      const result = await db()
        .from('threads')
        .select('id, project_id, subject, visibility, updated_at')
        .order('updated_at', { ascending: false });
      fail(result.error, 'Messages could not be opened.');
      const threads = list(result.data as ThreadRow[] | null);
      const details = await Promise.all(threads.map((thread) => threadDetail(actor, thread)));
      return details.map((thread) => ({
        id: thread.id,
        projectId: thread.projectId,
        projectName: thread.projectName,
        clientName: thread.clientName,
        subject: thread.subject,
        visibility: thread.visibility,
        updatedAt: thread.updatedAt,
        lastBody: thread.lastBody,
        lastAuthorName: thread.lastAuthorName,
      }));
    },

    async getThread(threadId) {
      const actor = await requireActor();
      const result = await db()
        .from('threads')
        .select('id, project_id, subject, visibility, updated_at')
        .eq('id', threadId)
        .maybeSingle();
      fail(result.error, 'That conversation is not in this workspace.');
      if (!result.data) {
        throw new WorkroomError('That conversation is not in this workspace.', 'not_found');
      }
      return threadDetail(actor, result.data as ThreadRow);
    },

    async postMessage(threadId, body) {
      const actor = await requireActor();
      const result = await db().rpc('post_message', { p_thread_id: threadId, p_body: body });
      fail(result.error, 'A message needs a few words.');
      const refreshed = await db()
        .from('threads')
        .select('id, project_id, subject, visibility, updated_at')
        .eq('id', threadId)
        .maybeSingle();
      fail(refreshed.error, 'That conversation is not in this workspace.');
      if (!refreshed.data) {
        throw new WorkroomError('That conversation is not in this workspace.', 'not_found');
      }
      return threadDetail(actor, refreshed.data as ThreadRow);
    },

    async listNotifications() {
      await requireActor();
      const result = await db()
        .from('notifications')
        .select('id, title, body, href, read, created_at')
        .order('created_at', { ascending: false });
      fail(result.error, 'Alerts could not be opened.');
      return list(result.data as NotificationRow[] | null).map(
        (item): AppNotification => ({
          id: item.id,
          title: item.title,
          body: item.body,
          href: item.href,
          read: item.read,
          createdAt: item.created_at,
        }),
      );
    },

    async markNotificationRead(notificationId) {
      await requireActor();
      const result = await db().rpc('mark_notification_read', { p_id: notificationId });
      fail(result.error, 'That alert is not in this workspace.');
    },

    async markAllNotificationsRead() {
      await requireActor();
      const result = await db().rpc('mark_all_notifications_read');
      fail(result.error, 'Alerts could not be updated.');
    },

    async listApprovalQueue() {
      const actor = await requireActor();
      if (!isAgencyRole(actor.role)) {
        throw new WorkroomError('The approval queue is for studio members.', 'forbidden');
      }
      const result = await db()
        .from('deliverables')
        .select('id, project_id, title, kind, status, version, updated_at, preview_key')
        .in('status', ['in_review', 'changes_requested'])
        .order('updated_at', { ascending: false });
      fail(result.error, 'The queue could not be opened.');
      const deliverables = list(
        result.data as {
          id: string;
          project_id: string;
          title: string;
          kind: DeliverableKind;
          status: DeliverableStatus;
          version: number;
          updated_at: string;
          preview_key: string;
        }[] | null,
      );
      const projects = await projectRows();
      const orgs = await organizations();
      const items: QueueItem[] = [];
      for (const deliverable of deliverables) {
        const project = projects.find((item) => item.id === deliverable.project_id);
        if (!project) {
          continue;
        }
        const client = orgs.find((item) => item.id === project.client_org_id);
        items.push({
          deliverableId: deliverable.id,
          title: deliverable.title,
          kind: deliverable.kind,
          status: deliverable.status,
          version: deliverable.version,
          updatedAt: deliverable.updated_at,
          projectId: project.id,
          projectName: project.name,
          clientOrgId: project.client_org_id,
          clientName: client?.name ?? 'Client',
          brandColor: client?.brand_color ?? '#1C1712',
          previewKey: deliverable.preview_key,
        });
      }
      return items;
    },

    async listClients() {
      const actor = await requireActor();
      if (!isAgencyRole(actor.role)) {
        throw new WorkroomError('Client lists are for studio members.', 'forbidden');
      }
      const orgs = (await organizations()).filter((item) => item.parent_org_id === actor.activeOrgId);
      const projects = await summarize(actor, await projectRows());
      return orgs.map((item): ClientSummary => {
        const own = projects.filter((project) => project.clientOrgId === item.id);
        return {
          id: item.id,
          name: item.name,
          tagline: item.tagline,
          brandColor: item.brand_color,
          mark: item.mark,
          projectCount: own.length,
          pendingReviews: own.reduce((sum, project) => sum + project.pendingReviews, 0),
        };
      });
    },

    async getClient(orgId) {
      const clients = await this.listClients();
      const client = clients.find((item) => item.id === orgId);
      if (!client) {
        throw new WorkroomError('That client is not in this studio.', 'not_found');
      }
      const actor = await requireActor();
      const projects = (await summarize(actor, await projectRows())).filter((item) => item.clientOrgId === orgId);
      const detail: ClientDetail = { ...client, projects };
      return detail;
    },

    async getBilling() {
      const actor = await requireActor();
      const result = await db()
        .from('subscriptions')
        .select('org_id, plan, status, seat_count, renews_on, price_id')
        .eq('org_id', actor.activeOrgId)
        .maybeSingle();
      fail(result.error, 'No subscription is recorded for this workspace.');
      const row = result.data as {
        org_id: string;
        plan: string;
        status: SubscriptionStatus;
        seat_count: number;
        renews_on: string;
        price_id: string;
      } | null;
      if (!row) {
        throw new WorkroomError('No subscription is recorded for this workspace.', 'not_found');
      }
      const organization = await this.getActiveOrganization();
      const summary: BillingSummary = {
        orgId: row.org_id,
        orgName: organization.name,
        plan: row.plan,
        status: row.status,
        seatCount: row.seat_count,
        renewsOn: row.renews_on,
        provider: 'stripe-test',
        priceId: row.price_id,
      };
      return summary;
    },

    async registerPushToken(token, platform) {
      await requireActor();
      const result = await db().rpc('register_push_token', { p_token: token, p_platform: platform });
      fail(result.error, 'Push registration did not finish.');
    },

    async sendTestNotification() {
      await requireActor();
      const result = await db().rpc('send_test_notification');
      fail(result.error, 'The test alert could not be sent.');
      const id = result.data as string;
      const notes = await this.listNotifications();
      const created = notes.find((item) => item.id === id);
      if (!created) {
        throw new WorkroomError('The test alert could not be sent.', 'invalid');
      }
      return created;
    },
  };
}
