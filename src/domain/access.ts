import type { Actor, Role, Visibility } from '@/domain/types';

export function isAgencyRole(role: Role): boolean {
  return role === 'agency_owner' || role === 'agency_member';
}

export function isClientRole(role: Role): boolean {
  return role === 'client_admin' || role === 'client_member';
}

export function canSeeVisibility(actor: Actor, visibility: Visibility): boolean {
  if (visibility === 'internal') {
    return isAgencyRole(actor.role);
  }
  return true;
}

export function projectInScope(
  actor: Actor,
  project: { clientOrgId: string; agencyOrgId: string },
): boolean {
  if (isAgencyRole(actor.role)) {
    return project.agencyOrgId === actor.activeOrgId;
  }
  return project.clientOrgId === actor.activeOrgId;
}

export function deliverableInScope(
  actor: Actor,
  deliverable: { visibility: Visibility; status: string },
  project: { clientOrgId: string; agencyOrgId: string },
): boolean {
  if (!projectInScope(actor, project)) {
    return false;
  }
  if (!isAgencyRole(actor.role)) {
    if (deliverable.visibility !== 'client') {
      return false;
    }
    if (deliverable.status === 'draft') {
      return false;
    }
  }
  return true;
}
