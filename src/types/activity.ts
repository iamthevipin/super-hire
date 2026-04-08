export type ActivityEventType =
  | 'candidate_created'
  | 'candidate_imported'
  | 'stage_changed'
  | 'candidate_rejected'
  | 'owner_changed'
  | 'feedback_added'
  | 'feedback_updated'
  | 'feedback_deleted'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'email_sent'
  | 'email_received'
  | 'email_replied';

export interface ActivityEvent {
  id: string;
  enterprise_id: string;
  candidate_id: string;
  application_id: string | null;
  event_type: ActivityEventType;
  actor_id: string | null;
  actor_name: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
