'use client';

import { useEffect, useState } from 'react';
import { clearWelcomeCookie } from '@/actions/auth';

const WELCOMED_KEY = 'sh_welcomed';

interface WelcomeModalProps {
  enterpriseName: string;
  role: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ enterpriseName, role, isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-[#6b7c7a] hover:text-[#141d1c] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="w-14 h-14 rounded-full bg-[#e8f5f4] flex items-center justify-center mx-auto mb-5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#117a72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h2
          id="welcome-modal-title"
          className="text-2xl font-bold text-[#141d1c] mb-2"
        >
          Welcome aboard!
        </h2>
        <p className="text-sm text-[#3e4947] mb-5">
          You&apos;ve joined{' '}
          <span className="font-semibold text-[#141d1c]">{enterpriseName}</span>.
        </p>

        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-[#e8f5f4] text-[#117a72] border border-[#b3dcd9] capitalize">
          {role}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full h-12 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm transition-colors"
        >
          Get started
        </button>
      </div>
    </div>
  );
}

interface WelcomeModalContainerProps {
  enterpriseName: string;
  role: string;
  shouldClear?: boolean;
}

export function WelcomeModalContainer({ enterpriseName, role, shouldClear }: WelcomeModalContainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (shouldClear) {
      clearWelcomeCookie().catch(() => undefined);
    }
    const alreadyWelcomed = sessionStorage.getItem(WELCOMED_KEY);
    if (!alreadyWelcomed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [shouldClear]);

  function handleClose() {
    sessionStorage.setItem(WELCOMED_KEY, '1');
    setIsOpen(false);
  }

  return (
    <WelcomeModal
      enterpriseName={enterpriseName}
      role={role}
      isOpen={isOpen}
      onClose={handleClose}
    />
  );
}
