'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { jobDetailsSchema, WORK_ARRANGEMENT_OPTIONS, type JobDetailsSchema } from '@/lib/validations/jobs';
import { createJob, updateJob } from '@/actions/jobs';
import { initDefaultStages } from '@/actions/pipeline';
import type { Job } from '@/types/jobs';

const ARRANGEMENT_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
};

interface CreateJobFormProps {
  /** Existing job to edit. Omit for create mode. */
  job?: Job;
  /** Template job ID to clone pipeline from. */
  templateJobId?: string;
}

export function CreateJobForm({ job }: CreateJobFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!job;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<JobDetailsSchema>({
    resolver: zodResolver(jobDetailsSchema),
    defaultValues: job
      ? {
          title: job.title,
          work_arrangement: job.work_arrangement ?? 'remote',
          location: job.location ?? '',
          salary: job.salary ?? '',
          description_overview: job.description_overview ?? '',
          description_responsibilities: job.description_responsibilities ?? '',
          description_requirements: job.description_requirements ?? '',
        }
      : { work_arrangement: 'remote' },
  });

  function onSubmit(values: JobDetailsSchema) {
    startTransition(async () => {
      const formData = toFormData(values);

      if (isEditing) {
        const result = await updateJob(job.id, formData);
        if ('error' in result) {
          setError('root', { message: result.error });
          return;
        }
        router.push(`/dashboard/jobs/${job.id}/pipeline`);
      } else {
        const result = await createJob(formData);
        if ('error' in result) {
          setError('root', { message: result.error });
          return;
        }
        // Init default stages (or skip — pipeline page handles this)
        await initDefaultStages(result.jobId);
        router.push(`/dashboard/jobs/${result.jobId}/pipeline`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {errors.root.message}
        </p>
      )}

      <Field label="Job Title" error={errors.title?.message} required>
        <input
          {...register('title')}
          placeholder="e.g. Senior Software Engineer"
          className={inputClass(!!errors.title)}
        />
      </Field>

      <Field label="Work Arrangement" error={errors.work_arrangement?.message} required>
        <select
          {...register('work_arrangement')}
          className={inputClass(!!errors.work_arrangement)}
        >
          {WORK_ARRANGEMENT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {ARRANGEMENT_LABELS[opt]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Location" error={errors.location?.message}>
        <input
          {...register('location')}
          placeholder="e.g. New York, NY (optional)"
          className={inputClass(!!errors.location)}
        />
      </Field>

      <Field label="Salary / Compensation" error={errors.salary?.message}>
        <input
          {...register('salary')}
          placeholder="e.g. $120,000 – $160,000 (optional)"
          className={inputClass(!!errors.salary)}
        />
      </Field>

      <Field label="Job Overview" error={errors.description_overview?.message}>
        <textarea
          {...register('description_overview')}
          rows={4}
          placeholder="Briefly describe the role and its impact..."
          className={cn(inputClass(!!errors.description_overview), 'resize-y')}
        />
      </Field>

      <Field label="Responsibilities" error={errors.description_responsibilities?.message}>
        <textarea
          {...register('description_responsibilities')}
          rows={4}
          placeholder="List key responsibilities..."
          className={cn(inputClass(!!errors.description_responsibilities), 'resize-y')}
        />
      </Field>

      <Field label="Requirements" error={errors.description_requirements?.message}>
        <textarea
          {...register('description_requirements')}
          rows={4}
          placeholder="List required skills and qualifications..."
          className={cn(inputClass(!!errors.description_requirements), 'resize-y')}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-5 py-2.5 rounded-lg border border-[#e0d9d0] text-sm font-semibold text-[#3e4947] hover:border-[#141d1c] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-[#141d1c] text-white text-sm font-semibold hover:bg-[#1f2e2c] transition-colors disabled:opacity-50"
        >
          {isPending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save & Continue'
              : 'Create & Set Up Pipeline'}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#141d1c] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    'w-full rounded-lg border px-3 py-2 text-sm text-[#141d1c] bg-white transition-colors outline-none',
    'placeholder:text-[#b8c8c6]',
    'focus:border-[#141d1c] focus:ring-2 focus:ring-[#141d1c]/10',
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-[#e0d9d0]'
  );
}

function toFormData(values: JobDetailsSchema): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      fd.set(key, String(value));
    }
  }
  return fd;
}
