export type InviteStatus = 'invited' | 'active' | 'expired';
export type InviteRole = 'admin' | 'member';

export interface PendingInvite {
  id: string;
  enterprise_id: string;
  email: string;
  role: InviteRole;
  invited_by: string;
  invite_token: string;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
}

export interface CreateInviteInput {
  email: string;
  role: InviteRole;
}

export interface ValidatedInvite {
  invite: Omit<PendingInvite, 'invite_token'>;
  enterpriseName: string;
  invitedByName: string;
}
