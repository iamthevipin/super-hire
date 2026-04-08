'use client';

import { useState } from 'react';

interface RejectReasonModalProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectReasonModal({ onConfirm, onCancel }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-[#141d1c] mb-1">Rejection reason</h2>
        <p className="text-sm text-[#8fa8a6] mb-4">
          Please provide a reason before moving this candidate to Rejected.
        </p>
        <textarea
          className="w-full border border-[#d4e0de] rounded-lg p-3 text-sm text-[#141d1c] resize-none focus:outline-none focus:ring-2 focus:ring-[#3e6b66] min-h-[100px]"
          placeholder="e.g. Skills did not match the requirements..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#3e4947] border border-[#d4e0de] rounded-lg hover:bg-[#f4f9f8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={reason.trim().length === 0}
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm rejection
          </button>
        </div>
      </div>
    </div>
  );
}
