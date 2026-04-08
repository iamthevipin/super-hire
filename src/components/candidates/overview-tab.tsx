'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { editCandidateSchema, SOURCE_LABELS, CANDIDATE_SOURCE_OPTIONS, type EditCandidateSchema } from '@/lib/validations/candidates';
import { editCandidate } from '@/actions/candidates';
import type { CandidateDetail } from '@/types/candidates';

interface OverviewTabProps {
  detail: CandidateDetail;
  onUpdated: () => void;
}

export function OverviewTab({ detail, onUpdated }: OverviewTabProps) {
  const { application, candidate, other_applications } = detail;
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState<string[]>(application.tags);
  const [tagInput, setTagInput] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isRejected =
    application.pipeline_stage?.name.toLowerCase() === 'rejected';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditCandidateSchema>({
    resolver: zodResolver(editCandidateSchema),
    defaultValues: {
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone ?? undefined,
      current_job_title: candidate.current_job_title ?? undefined,
      source: application.source ?? undefined,
    },
  });

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const onSubmit = async (data: EditCandidateSchema) => {
    setSaving(true);
    setServerError(null);

    const formData = new FormData();
    formData.set('first_name', data.first_name);
    formData.set('last_name', data.last_name);
    formData.set('email', data.email);
    if (data.phone) formData.set('phone', data.phone);
    if (data.current_job_title) formData.set('current_job_title', data.current_job_title);
    if (data.source) formData.set('source', data.source);
    formData.set('tags', JSON.stringify(tags));

    const result = await editCandidate(application.id, formData);
    setSaving(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setEditing(false);
    onUpdated();
  };

  const cancelEdit = () => {
    reset();
    setTags(application.tags);
    setEditing(false);
    setServerError(null);
  };

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#3e4947] mb-1">First name *</label>
            <input
              {...register('first_name')}
              className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
            />
            {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#3e4947] mb-1">Last name *</label>
            <input
              {...register('last_name')}
              className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
            />
            {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3e4947] mb-1">Email *</label>
          <input
            {...register('email')}
            type="email"
            className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#3e4947] mb-1">Phone</label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#3e4947] mb-1">Current job title</label>
            <input
              {...register('current_job_title')}
              className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3e4947] mb-1">Source</label>
          <select
            {...register('source')}
            className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
          >
            <option value="">No source</option>
            {CANDIDATE_SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3e4947] mb-1">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag and press Enter"
              className="flex-1 border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
            />
            <button type="button" onClick={addTag} className="px-3 py-2 text-sm border border-[#d4e0de] rounded-lg text-[#3e4947] hover:bg-[#f4f9f8]">Add</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-[#eaf2f1] text-[#3e6b66] px-2 py-1 rounded-full">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-[#8fa8a6] hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        </div>
        {serverError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{serverError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors disabled:opacity-40">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm border border-[#d4e0de] text-[#3e4947] rounded-lg hover:bg-[#f4f9f8] transition-colors">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-[#3e6b66] border border-[#d4e0de] px-3 py-1.5 rounded-lg hover:bg-[#f4f9f8] transition-colors"
        >
          Edit
        </button>
      </div>

      <dl className="space-y-3">
        {([
          ['Name', `${candidate.first_name} ${candidate.last_name}`],
          ['Email', candidate.email],
          ['Phone', candidate.phone],
          ['Current job title', candidate.current_job_title],
          ['Source', application.source ? SOURCE_LABELS[application.source] : null],
        ] as [string, string | null][]).map(([label, value]) => (
          <div key={label} className="flex gap-4">
            <dt className="w-36 text-xs text-[#8fa8a6] flex-shrink-0 pt-0.5">{label}</dt>
            <dd className="text-sm text-[#141d1c]">{value ?? <span className="text-[#b8c8c6]">—</span>}</dd>
          </div>
        ))}
        <div className="flex gap-4">
          <dt className="w-36 text-xs text-[#8fa8a6] flex-shrink-0 pt-0.5">Tags</dt>
          <dd>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs bg-[#eaf2f1] text-[#3e6b66] px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-[#b8c8c6]">—</span>
            )}
          </dd>
        </div>
        {isRejected && application.rejection_reason && (
          <div className="flex gap-4">
            <dt className="w-36 text-xs text-[#8fa8a6] flex-shrink-0 pt-0.5">Rejection reason</dt>
            <dd className="text-sm text-red-700">{application.rejection_reason}</dd>
          </div>
        )}
      </dl>

      {other_applications.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[#8fa8a6] mb-2">Other jobs</h3>
          <ul className="space-y-2">
            {other_applications.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/jobs/${a.job_id}/candidates/${a.id}`}
                  className="flex items-center justify-between text-sm text-[#3e6b66] hover:text-[#141d1c] transition-colors"
                >
                  <span>{a.job_title}</span>
                  {a.stage_name && (
                    <span className="text-xs text-[#8fa8a6] bg-[#eaf2f1] px-2 py-0.5 rounded-full">
                      {a.stage_name}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
