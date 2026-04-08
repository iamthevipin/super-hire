'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addCandidateSchema, SOURCE_LABELS, CANDIDATE_SOURCE_OPTIONS, type AddCandidateSchema } from '@/lib/validations/candidates';
import { addCandidate } from '@/actions/candidates';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface AddCandidateFormProps {
  jobId: string;
  onSuccess: () => void;
}

export function AddCandidateForm({ jobId, onSuccess }: AddCandidateFormProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddCandidateSchema>({
    resolver: zodResolver(addCandidateSchema),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setServerError('Only PDF, DOC, and DOCX files are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setServerError('File size must be 10MB or less');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setServerError(null);
    setResumeFile(file);
    setResumeFileName(file.name);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const onSubmit = async (data: AddCandidateSchema) => {
    setIsSubmitting(true);
    setServerError(null);

    const formData = new FormData();
    formData.set('first_name', data.first_name);
    formData.set('last_name', data.last_name);
    formData.set('email', data.email);
    if (data.phone) formData.set('phone', data.phone);
    if (data.current_job_title) formData.set('current_job_title', data.current_job_title);
    if (data.source) formData.set('source', data.source);
    if (resumeFile) formData.set('resume_file', resumeFile);
    formData.set('tags', JSON.stringify(tags));

    const result = await addCandidate(jobId, formData);
    setIsSubmitting(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#3e4947] mb-1">First name *</label>
          <input
            {...register('first_name')}
            className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
          />
          {errors.first_name && (
            <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3e4947] mb-1">Last name *</label>
          <input
            {...register('last_name')}
            className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
          />
          {errors.last_name && (
            <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#3e4947] mb-1">Email *</label>
        <input
          {...register('email')}
          type="email"
          className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}
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
          className="w-full border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66] bg-white"
        >
          <option value="">Select source</option>
          {CANDIDATE_SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#3e4947] mb-1">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Type a tag and press Enter"
            className="flex-1 border border-[#d4e0de] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3e6b66]"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 text-sm border border-[#d4e0de] rounded-lg text-[#3e4947] hover:bg-[#f4f9f8] transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-[#eaf2f1] text-[#3e6b66] px-2 py-1 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-[#8fa8a6] hover:text-red-500 leading-none"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#3e4947] mb-1">Resume</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border border-dashed border-[#d4e0de] rounded-lg px-3 py-3 text-sm text-[#8fa8a6] hover:bg-[#f4f9f8] transition-colors text-center"
        >
          {resumeFileName ? resumeFileName : 'Click to upload PDF, DOC, or DOCX (max 10MB)'}
        </button>
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add candidate'}
        </button>
      </div>
    </form>
  );
}
