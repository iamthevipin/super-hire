'use client';

import { AddCandidateForm } from '@/components/candidates/add-candidate-form';

interface AddCandidateModalProps {
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCandidateModal({ jobId, onClose, onSuccess }: AddCandidateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d4e0de]">
          <h2 className="text-base font-semibold text-[#141d1c]">Add candidate</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8fa8a6] hover:text-[#141d1c] text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-4">
          <AddCandidateForm
            jobId={jobId}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
}
