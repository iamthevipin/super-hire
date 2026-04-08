'use server';

import { createClient } from '@/lib/supabase/server';
import { bulkImportRowSchema, type BulkImportRow } from '@/lib/validations/candidates';
import { logActivity } from '@/actions/activity';

export async function bulkImportCandidates(
  jobId: string,
  rows: BulkImportRow[]
): Promise<{ imported: number; skipped: string[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: [], error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { imported: 0, skipped: [], error: 'No enterprise' };

  const { data: appliedStage } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .eq('is_locked', true)
    .ilike('name', 'applied')
    .single();

  if (!appliedStage) {
    return { imported: 0, skipped: [], error: 'Applied stage not found for this job' };
  }

  const actorName = user.user_metadata?.full_name ?? user.email ?? 'Team member';
  const skipped: string[] = [];

  // --- Phase 1: validate all rows upfront ---
  type ParsedRow = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | undefined;
    source: string | undefined;
    tags: string[];
    current_job_title: string | undefined;
  };

  const validRows: ParsedRow[] = [];
  for (const row of rows) {
    const parsed = bulkImportRowSchema.safeParse(row);
    if (!parsed.success) {
      skipped.push(`${row.email ?? 'unknown'}: invalid data`);
      continue;
    }
    const { first_name, last_name, email, phone, source, tags, current_job_title } = parsed.data;
    const parsedTags = tags
      ? tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    validRows.push({ first_name, last_name, email, phone, source, tags: parsedTags, current_job_title });
  }

  if (validRows.length === 0) return { imported: 0, skipped };

  const allEmails = validRows.map((r) => r.email);

  // --- Phase 2: batch-fetch existing candidates by email ---
  const { data: existingCandidates } = await supabase
    .from('candidates')
    .select('id, email')
    .eq('enterprise_id', membership.enterprise_id)
    .in('email', allEmails);

  const emailToId = new Map<string, string>(
    (existingCandidates ?? []).map((c) => [c.email as string, c.id as string])
  );

  // --- Phase 3: batch-insert new candidates ---
  const newCandidateRows = validRows.filter((r) => !emailToId.has(r.email));
  if (newCandidateRows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('candidates')
      .insert(
        newCandidateRows.map((r) => ({
          enterprise_id: membership.enterprise_id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          phone: r.phone ?? null,
          current_job_title: r.current_job_title ?? null,
        }))
      )
      .select('id, email');

    if (insertError) {
      for (const r of newCandidateRows) {
        skipped.push(`${r.email}: failed to create candidate`);
      }
    } else {
      for (const c of inserted ?? []) {
        emailToId.set(c.email as string, c.id as string);
      }
    }
  }

  // --- Phase 4: batch-check existing applications for this job ---
  const candidateIdsToCheck = validRows
    .map((r) => emailToId.get(r.email))
    .filter((id): id is string => id !== undefined);

  const { data: existingApps } = await supabase
    .from('applications')
    .select('candidate_id')
    .eq('job_id', jobId)
    .in('candidate_id', candidateIdsToCheck);

  const alreadyApplied = new Set(
    (existingApps ?? []).map((a) => a.candidate_id as string)
  );

  // --- Phase 5: determine rows to insert ---
  const toInsert = validRows.filter((r) => {
    const id = emailToId.get(r.email);
    if (!id) return false; // insert failed in phase 3
    if (alreadyApplied.has(id)) {
      skipped.push(`${r.email}: already in this job`);
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) return { imported: 0, skipped };

  // --- Phase 6: batch-insert applications ---
  const { data: insertedApps, error: appError } = await supabase
    .from('applications')
    .insert(
      toInsert.map((r) => ({
        enterprise_id: membership.enterprise_id,
        job_id: jobId,
        candidate_id: emailToId.get(r.email)!,
        pipeline_stage_id: appliedStage.id,
        source: r.source ?? null,
        tags: r.tags,
      }))
    )
    .select('id, candidate_id');

  if (appError) {
    for (const r of toInsert) {
      skipped.push(`${r.email}: ${appError.message}`);
    }
    return { imported: 0, skipped };
  }

  // --- Phase 7: batch-log activity (parallel, not sequential) ---
  await Promise.all(
    (insertedApps ?? []).map((app) => {
      const row = toInsert.find((r) => emailToId.get(r.email) === app.candidate_id)!;
      return logActivity({
        supabase,
        enterprise_id: membership.enterprise_id,
        candidate_id: app.candidate_id as string,
        application_id: null,
        event_type: 'candidate_imported',
        actor_id: user.id,
        actor_name: actorName,
        description: `${actorName} imported ${row.first_name} ${row.last_name} via bulk import`,
      });
    })
  );

  return { imported: insertedApps?.length ?? 0, skipped };
}
