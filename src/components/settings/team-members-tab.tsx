'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InviteFormModal } from '@/components/settings/invite-status-panel';
import { resendInvite, cancelInvite } from '@/actions/invites';
import type { MemberRow } from '@/app/(dashboard)/settings/page';

interface TeamMembersTabProps {
  rows: MemberRow[];
  userRole: string;
}

export function TeamMembersTab({
  rows,
  userRole,
}: TeamMembersTabProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  const canInvite = userRole === 'admin' || userRole === 'owner';

  function handleInviteSuccess() {
    setIsModalOpen(false);
    router.refresh();
  }

  function handleResend(inviteId: string) {
    setActionError(null);
    setEmailWarning(null);
    startTransition(async () => {
      const result = await resendInvite(inviteId);
      if ('error' in result) {
        setActionError(result.error);
      } else {
        if (result.emailSent === false) {
          setEmailWarning('Invite updated but email could not be sent. Check your email settings.');
        }
        router.refresh();
      }
    });
  }

  function handleCancel(inviteId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await cancelInvite(inviteId);
      if ('error' in result) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141d1c]">Team Members</h1>
          <p className="text-sm text-[#3e4947] mt-0.5">Manage your enterprise members</p>
        </div>
        {canInvite && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-4 rounded-full bg-[#117a72] hover:bg-[#006059] text-white font-semibold text-sm gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Invite Member
          </Button>
        )}
      </div>

      {actionError && (
        <p className="text-sm text-destructive mb-4">{actionError}</p>
      )}
      {emailWarning && (
        <p className="text-sm text-amber-600 mb-4">{emailWarning}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0ebe3]">
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#8fa8a6] uppercase tracking-wider">
                Member
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-[#8fa8a6] uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-[#8fa8a6] uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-[#8fa8a6] uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MemberTableRow
                key={row.id}
                row={row}
                canInvite={canInvite}
                isPending={isPending}
                onResend={handleResend}
                onCancel={handleCancel}
              />
            ))}
          </tbody>
        </table>
      </div>

      {canInvite && (
        <InviteFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual table row
// ---------------------------------------------------------------------------
interface MemberTableRowProps {
  row: MemberRow;
  canInvite: boolean;
  isPending: boolean;
  onResend: (inviteId: string) => void;
  onCancel: (inviteId: string) => void;
}

function MemberTableRow({
  row,
  canInvite,
  isPending,
  onResend,
  onCancel,
}: MemberTableRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = row.name.charAt(0).toUpperCase();

  return (
    <tr className="border-b border-[#f5f0eb] last:border-0 hover:bg-[#fafaf8] transition-colors">
      {/* Member */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#117a72]/15 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-[#117a72]">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#141d1c]">{row.name}</p>
            <p className="text-xs text-[#6b7c7a]">{row.email}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <StatusBadge status={row.status} />
      </td>

      {/* Role */}
      <td className="px-4 py-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f0ebe3] text-[#3e4947] border border-[#e0d9d0] capitalize">
          {row.role}
        </span>
      </td>

      {/* Action */}
      <td className="px-4 py-4">
        {canInvite && row.inviteId && row.status !== 'active' && (
          <div className="relative">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7c7a] hover:bg-[#f0ebe3] hover:text-[#141d1c] transition-colors"
              aria-label="Invite actions"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-[#f0ebe3] py-1 w-36">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setMenuOpen(false);
                      onResend(row.inviteId!);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#3e4947] hover:bg-[#f5f0eb] transition-colors"
                  >
                    Resend
                  </button>
                  {row.status === 'invited' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setMenuOpen(false);
                        onCancel(row.inviteId!);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-[#f5f0eb] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: MemberRow['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
        status === 'active' &&
          'bg-[#e8f5f4] text-[#117a72] border-[#b3dcd9]',
        status === 'invited' &&
          'bg-[#f5f0eb] text-[#6b7c7a] border-[#e0d9d0]',
        status === 'expired' &&
          'bg-[#fef2f2] text-[#dc3545] border-[#fecaca]'
      )}
    >
      {status === 'active' && 'Active'}
      {status === 'invited' && 'Invite Sent'}
      {status === 'expired' && 'Expired'}
    </span>
  );
}
