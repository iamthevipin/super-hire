'use client';

import { useState, useRef } from 'react';
import { uploadResume, getResumeSignedUrl } from '@/actions/candidates';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ResumeTabProps {
  resumePath: string | null;
  applicationId: string;
  onResumeUpdated: () => void;
}

export function ResumeTab({ resumePath, applicationId, onResumeUpdated }: ResumeTabProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const isPdf = resumePath?.toLowerCase().endsWith('.pdf');

  const loadSignedUrl = async () => {
    if (!resumePath || signedUrl) return;
    setLoadingUrl(true);
    const result = await getResumeSignedUrl(applicationId);
    setLoadingUrl(false);
    if (result.url) {
      setSignedUrl(result.url);
      if (!isPdf) {
        setTimeout(() => downloadLinkRef.current?.click(), 0);
      }
    } else {
      setUploadError(result.error ?? 'Could not load preview. Try again.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('Only PDF, DOC, and DOCX files are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size must be 10MB or less');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.set('resume_file', file);

    const result = await uploadResume(applicationId, formData);
    setUploading(false);

    if (result.error) {
      setUploadError(`Upload failed: ${result.error}`);
      return;
    }

    setSignedUrl(null);
    onResumeUpdated();
  };

  if (!resumePath) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <p className="text-sm text-[#8fa8a6]">No resume uploaded</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 text-sm border border-[#d4e0de] text-[#3e4947] rounded-lg hover:bg-[#f4f9f8] transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload resume'}
        </button>
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      </div>
    );
  }

  const fileName = resumePath.split('/').pop() ?? 'resume';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#3e4947] font-medium truncate">{fileName}</p>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-[#3e6b66] border border-[#d4e0de] px-3 py-1.5 rounded-lg hover:bg-[#f4f9f8] transition-colors"
          >
            {uploading ? 'Uploading...' : 'Replace'}
          </button>
        </div>
      </div>

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {isPdf ? (
        <div>
          {!signedUrl && (
            <button
              type="button"
              onClick={loadSignedUrl}
              disabled={loadingUrl}
              className="w-full py-3 text-sm border border-dashed border-[#d4e0de] rounded-lg text-[#8fa8a6] hover:bg-[#f4f9f8] transition-colors"
            >
              {loadingUrl ? 'Loading preview...' : 'Click to preview PDF'}
            </button>
          )}
          {signedUrl && (
            <iframe
              src={signedUrl}
              className="w-full h-[600px] border border-[#d4e0de] rounded-lg"
              title="Resume preview"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <button
            type="button"
            onClick={loadSignedUrl}
            disabled={loadingUrl}
            className="text-sm text-[#3e6b66] underline"
          >
            {loadingUrl ? 'Generating link...' : signedUrl ? 'Download document' : 'Click to download'}
          </button>
          <a ref={downloadLinkRef} href={signedUrl ?? '#'} download={fileName} className="hidden">
            download
          </a>
        </div>
      )}
    </div>
  );
}
