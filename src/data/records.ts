import type {
  CommentKind,
  DeliverableKind,
  DeliverableStatus,
  MilestoneStatus,
  OrgKind,
  ProjectStatus,
  Role,
  SubscriptionStatus,
  Visibility,
} from '@/domain/types';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  kind: OrgKind;
  parentOrgId: string | null;
  brandColor: string;
  tagline: string;
  mark: string;
}

export interface ProfileRecord {
  id: string;
  email: string;
  fullName: string;
  title: string;
  password: string;
}

export interface MembershipRecord {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
}

export interface ProjectRecord {
  id: string;
  clientOrgId: string;
  agencyOrgId: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  dueOn: string;
  status: MilestoneStatus;
  sort: number;
}

export interface DeliverableRecord {
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
  filePreviewText: string | null;
  pageCount: number | null;
  updatedAt: string;
}

export interface CommentRecord {
  id: string;
  deliverableId: string;
  authorId: string;
  body: string;
  visibility: Visibility;
  kind: CommentKind;
  createdAt: string;
}

export interface ThreadRecord {
  id: string;
  projectId: string;
  subject: string;
  visibility: Visibility;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  orgId: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface SubscriptionRecord {
  orgId: string;
  plan: string;
  status: SubscriptionStatus;
  seatCount: number;
  renewsOn: string;
  priceId: string;
}

export interface PushTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: string;
}

export interface MagicLinkRecord {
  token: string;
  email: string;
  userId: string;
  consumed: boolean;
}

export interface Database {
  organizations: OrganizationRecord[];
  profiles: ProfileRecord[];
  memberships: MembershipRecord[];
  projects: ProjectRecord[];
  milestones: MilestoneRecord[];
  deliverables: DeliverableRecord[];
  comments: CommentRecord[];
  threads: ThreadRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
  subscriptions: SubscriptionRecord[];
  pushTokens: PushTokenRecord[];
  magicLinks: MagicLinkRecord[];
}
