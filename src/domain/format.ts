import type { DeliverableStatus, Role, SubscriptionStatus } from '@/domain/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'agency_owner':
      return 'Studio owner';
    case 'agency_member':
      return 'Studio';
    case 'client_admin':
      return 'Client admin';
    case 'client_member':
      return 'Client';
  }
}

export function statusLabel(status: DeliverableStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'in_review':
      return 'In review';
    case 'approved':
      return 'Approved';
    case 'changes_requested':
      return 'Changes requested';
  }
}

export function subscriptionLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'trialing':
      return 'Trial';
    case 'active':
      return 'Active';
    case 'past_due':
      return 'Past due';
    case 'canceled':
      return 'Canceled';
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function inkOn(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) {
    return '#F7F1E8';
  }
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.64 ? '#1C1712' : '#F7F1E8';
}

export function clip(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
