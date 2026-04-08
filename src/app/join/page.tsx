'use client';

import { useEffect, useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { Button } from '@/components/ui/button';
import { validateInviteToken } from '@/actions/invites';
import { initiateInviteOtp, signInWithGoogleForInvite } from '@/actions/invite-auth';
import type { ValidatedInvite } from '@/types/invites';

export default function JoinPage() {
  return (
    <Suspense>
      <JoinPageContent />
    </Suspense>
  );
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'valid' | 'error'>('loading');
  const [invite, setInvite] = useState<ValidatedInvite | null>(null);
  const [errorReason, setErrorReason] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorReason('No invite token found. Please check your link.');
      setStatus('error');
      return;
    }

    validateInviteToken(token).then((result) => {
      if (result.valid) {
        setInvite(result.data);
        setStatus('valid');
      } else {
        if (result.reason === 'expired') {
          setErrorReason('This invite link has expired. Ask your admin to send a new one.');
        } else if (result.reason === 'already_used') {
          setErrorReason('This invite has already been accepted.');
        } else {
          setErrorReason('This invite link is invalid or no longer active.');
        }
        setStatus('error');
      }
    });
  }, [token]);

  function handleEmailContinue() {
    setActionError(null);
    startTransition(async () => {
      const result = await initiateInviteOtp(token);
      if ('error' in result) {
        setActionError(result.error);
        return;
      }
      if ('redirect' in result) {
        router.push(result.redirect);
      }
    });
  }

  function handleGoogleContinue() {
    setActionError(null);
    startTransition(async () => {
      const result = await signInWithGoogleForInvite(token);
      if ('error' in result) {
        setActionError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  if (status === 'loading') {
    return (
      <AuthSplitLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#117a72] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-[#6b7c7a]">Checking your invite…</p>
        </div>
      </AuthSplitLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthSplitLayout>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#141d1c] mb-2">Invite not valid</h1>
          <p className="text-sm text-[#6b7c7a] mb-8">{errorReason}</p>
          <Link
            href="/login"
            className="text-sm font-semibold text-[#117a72] hover:underline"
          >
            Go to login
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div>
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-[#141d1c] mb-1.5">
            You&apos;ve been invited
          </h1>
          <p className="text-sm text-[#3e4947]">
            <span className="font-medium text-[#141d1c]">{invite?.invitedByName}</span>
            {' '}has invited you to join{' '}
            <span className="font-medium text-[#141d1c]">{invite?.enterpriseName}</span>
            {' '}as{' '}
            <span className="font-medium text-[#141d1c] capitalize">{invite?.invite.role}</span>.
          </p>
        </div>

        <div className="mb-5 px-4 py-3 rounded-xl bg-[#f5f0eb] border border-[#e0d9d0]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8fa8a6] mb-0.5">Invited email</p>
          <p className="text-sm font-medium text-[#141d1c]">{invite?.invite.email}</p>
        </div>

        <p className="text-xs text-[#6b7c7a] mb-5">
          You must sign in with this exact email address to accept the invite.
        </p>

        {actionError && (
          <p className="text-sm text-destructive mb-4">{actionError}</p>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleEmailContinue}
            disabled={isPending}
            className="w-full h-12 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm"
          >
            {isPending ? 'Continuing…' : 'Continue with Email'}
          </Button>

          <button
            type="button"
            onClick={handleGoogleContinue}
            disabled={isPending}
            className="w-full h-12 rounded-full border border-[#e0d9d0] bg-white hover:bg-[#f5f0eb] text-[#141d1c] font-semibold text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
