'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OtpInput } from '@/components/auth/otp-input';
import { Button } from '@/components/ui/button';
import { verifyInviteOtp } from '@/actions/invite-auth';

export default function JoinVerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    if (otp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('otp', otp);

      const result = await verifyInviteOtp(formData);

      if ('error' in result) {
        setError(result.error);
        return;
      }

      if ('redirect' in result) {
        router.push(result.redirect);
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[#117a72] mb-10 no-underline"
      >
        <svg width="14" height="18" viewBox="0 0 16 20" fill="none" aria-hidden="true">
          <path d="M9 0L0 11h7l-2 9L16 9H9l2-9z" fill="#117a72" />
        </svg>
        <span
          className="text-xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          Super Hire
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-[#141d1c] mb-2">
          Check your email
        </h1>
        <p className="text-sm text-[#6b7c7a] mb-8">
          We sent a 6-digit code to your invited email address.
        </p>

        <OtpInput value={otp} onChange={setOtp} disabled={isPending} />

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleVerify}
          disabled={isPending || otp.length < 6}
          className="w-full h-11 mt-6 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm"
        >
          {isPending ? 'Verifying…' : 'Verify & Join'}
        </Button>
      </div>

      <Link
        href="/login"
        className="mt-6 text-sm text-[#6b7c7a] hover:text-[#141d1c] inline-flex items-center gap-1.5"
      >
        <span aria-hidden="true">←</span> Back to Login
      </Link>
    </div>
  );
}
