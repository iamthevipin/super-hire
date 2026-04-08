'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInvite } from '@/actions/invites';
import { inviteSchema, type InviteSchema } from '@/lib/validations/invites';

interface InviteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteFormModal({ isOpen, onClose, onSuccess }: InviteFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteSchema>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'member' },
  });

  function handleClose() {
    reset();
    setServerError(null);
    onClose();
  }

  function onSubmit(data: InviteSchema) {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('email', data.email);
      formData.set('role', data.role);

      const result = await createInvite(formData);

      if ('error' in result) {
        setServerError(result.error);
        return;
      }

      reset();
      onSuccess();
    });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2
              id="invite-modal-title"
              className="text-xl font-bold text-[#141d1c]"
            >
              Invite Members
            </h2>
            <p className="text-sm text-[#3e4947] mt-0.5">
              Add new member to your team
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-[#6b7c7a] hover:text-[#141d1c] transition-colors ml-4"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="invite-email"
              className="text-xs font-semibold uppercase tracking-widest text-[#3e4947]"
            >
              Email Address
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              disabled={isPending}
              {...register('email')}
              className="h-11 rounded-xl border-input"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="invite-role"
              className="text-xs font-semibold uppercase tracking-widest text-[#3e4947]"
            >
              Assign Role
            </Label>
            <div className="relative">
              <select
                id="invite-role"
                disabled={isPending}
                {...register('role')}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 pr-10 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#117a72]/30 focus:border-[#117a72]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7c7a]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm"
            >
              {isPending ? 'Sending…' : 'Send Invite'}
            </Button>
            <button
              type="button"
              onClick={handleClose}
              className="w-full text-center text-sm text-[#3e4947] hover:text-[#141d1c] py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
