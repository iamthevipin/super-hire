-- Add candidate_emails to the supabase_realtime publication so that
-- postgres_changes subscriptions with a candidate_id filter are enforced
-- server-side rather than broadcast to all clients and filtered client-side.
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_emails;
