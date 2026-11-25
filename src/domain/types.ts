export type Role = 'agency_owner' | 'agency_member' | 'client_admin' | 'client_member';

export type OrgKind = 'agency' | 'client';

export type ProjectStatus = 'active' | 'paused' | 'wrapped';

export type MilestoneStatus = 'upcoming' | 'active' | 'done';

export type DeliverableStatus = 'draft' | 'in_review' | 'approved' | 'changes_requested';

export type DeliverableKind = 'image' | 'file';

export type Visibility = 'client' | 'internal';

export type CommentKind = 'note' | 'approval' | 'change_request';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export type DataMode = 'mock' | 'supabase';

export interface Actor {
  userId: string;
  activeOrgId: string;
  role: Role;
  email: string;
  fullName: string;
  title: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  kind: OrgKind;
  parentOrgId: string | null;
  brandColor: string;
  tagline: string;
  mark: string;
}

export interface MembershipSummary {
  orgId: string;
  orgName: string;
  kind: OrgKind;
  role: Role;
  brandColor: string;
  mark: string;
  tagline: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  clientOrgId: string;
  clientName: string;
  brandColor: string;
  updatedAt: string;
  pendingReviews: number;
  milestonesDone: number;
  milestonesTotal: number;
}

export interface MilestoneView {
  id: string;
  title: string;
  detail: string;
  dueOn: string;
  status: MilestoneStatus;
}

export interface DeliverableSummary {
  id: string;
  projectId: string;
  milestoneId: string;
  title: string;
  kind: DeliverableKind;
  status: DeliverableStatus;
  visibility: Visibility;
  version: number;
  fileName: string;
  previewKey: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  milestones: MilestoneView[];
  deliverables: DeliverableSummary[];
  threads: ThreadSummary[];
}

export interface CommentView {
  id: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  body: string;
  visibility: Visibility;
  kind: CommentKind;
  createdAt: string;
  mine: boolean;
}

export interface DeliverableDetail extends DeliverableSummary {
  filePreviewText: string | null;
  pageCount: number | null;
  projectName: string;
  clientName: string;
  clientOrgId: string;
  brandColor: string;
  comments: CommentView[];
  canDecide: boolean;
  canWriteInternal: boolean;
}

export interface ThreadSummary {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  subject: string;
  visibility: Visibility;
  updatedAt: string;
  lastBody: string;
  lastAuthorName: string;
}

export interface MessageView {
  id: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface ThreadDetail extends ThreadSummary {
  messages: MessageView[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface QueueItem {
  deliverableId: string;
  title: string;
  kind: DeliverableKind;
  status: DeliverableStatus;
  version: number;
  updatedAt: string;
  projectId: string;
  projectName: string;
  clientOrgId: string;
  clientName: string;
  brandColor: string;
  previewKey: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  tagline: string;
  brandColor: string;
  mark: string;
  projectCount: number;
  pendingReviews: number;
}

export interface ClientDetail extends ClientSummary {
  projects: ProjectSummary[];
}

export interface BillingSummary {
  orgId: string;
  orgName: string;
  plan: string;
  status: SubscriptionStatus;
  seatCount: number;
  renewsOn: string;
  provider: 'stripe-test';
  priceId: string;
}

export interface DecisionInput {
  decision: 'approve' | 'request_changes';
  comment: string;
}

export interface NoteInput {
  body: string;
  visibility: Visibility;
}

export interface MagicLinkResult {
  accepted: true;
  demoPath?: string;
}
