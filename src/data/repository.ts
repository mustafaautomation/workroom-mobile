import type {
  Actor,
  AppNotification,
  BillingSummary,
  ClientDetail,
  ClientSummary,
  DataMode,
  DecisionInput,
  DeliverableDetail,
  MagicLinkResult,
  MembershipSummary,
  NoteInput,
  Organization,
  ProjectDetail,
  ProjectSummary,
  QueueItem,
  ThreadDetail,
  ThreadSummary,
} from '@/domain/types';

export interface WorkroomRepository {
  readonly mode: DataMode;
  restore(): Promise<Actor | null>;
  currentActor(): Promise<Actor | null>;
  signInWithPassword(email: string, password: string): Promise<Actor>;
  requestMagicLink(email: string): Promise<MagicLinkResult>;
  consumeMagicLink(token: string): Promise<Actor>;
  signInAsDemo(userId: string, orgId?: string): Promise<Actor>;
  signOut(): Promise<void>;
  listMemberships(): Promise<MembershipSummary[]>;
  switchOrganization(orgId: string): Promise<Actor>;
  getActiveOrganization(): Promise<Organization>;
  listProjects(): Promise<ProjectSummary[]>;
  getProject(projectId: string): Promise<ProjectDetail>;
  getDeliverable(deliverableId: string): Promise<DeliverableDetail>;
  decideDeliverable(deliverableId: string, input: DecisionInput): Promise<DeliverableDetail>;
  addDeliverableNote(deliverableId: string, input: NoteInput): Promise<DeliverableDetail>;
  listThreads(): Promise<ThreadSummary[]>;
  getThread(threadId: string): Promise<ThreadDetail>;
  postMessage(threadId: string, body: string): Promise<ThreadDetail>;
  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  listApprovalQueue(): Promise<QueueItem[]>;
  listClients(): Promise<ClientSummary[]>;
  getClient(orgId: string): Promise<ClientDetail>;
  getBilling(): Promise<BillingSummary>;
  registerPushToken(token: string, platform: string): Promise<void>;
  sendTestNotification(): Promise<AppNotification>;
}
