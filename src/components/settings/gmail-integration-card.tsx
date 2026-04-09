'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectGmail } from '@/actions/gmail';
import type { GmailIntegration } from '@/types/email';

interface GmailIntegrationCardProps {
  integration: GmailIntegration | null;
  oauthError: string | null;
}

export function GmailIntegrationCard({ integration, oauthError }: GmailIntegrationCardProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setDisconnectError(null);
    const result = await disconnectGmail();
    if (result.error) {
      setDisconnectError(result.error);
      setDisconnecting(false);
      return;
    }
    router.refresh();
  };

  const errorMessage = oauthError ? friendlyOAuthError(oauthError) : null;

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[#141d1c] mb-1">Integrations</h1>
      <p className="text-sm text-[#3e4947] mb-8">Connect your email to send messages directly from Super Hire.</p>

      <div className="border border-[#d4e0de] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#eaf2f1] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#117a72" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m22 6-10 7L2 6" stroke="#117a72" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#141d1c]">Gmail</p>
              {integration ? (
                <p className="text-xs text-[#3e4947] mt-0.5">
                  Connected as <span className="font-medium">{integration.gmail_address}</span>
                </p>
              ) : (
                <p className="text-xs text-[#8fa8a6] mt-0.5">Not connected</p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {integration ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs px-3 py-1.5 border border-[#d4e0de] text-[#3e4947] rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <a
                href="/api/auth/gmail/connect"
                className="text-xs px-3 py-1.5 bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors inline-block"
              >
                Connect Gmail
              </a>
            )}
          </div>
        </div>

        {disconnectError && (
          <p className="mt-3 text-xs text-red-600">{disconnectError}</p>
        )}

        {errorMessage && (
          <p className="mt-3 text-xs text-red-600">{errorMessage}</p>
        )}

        {!integration && (
          <p className="mt-4 text-xs text-[#8fa8a6]">
            Connecting Gmail grants Super Hire permission to send emails on your behalf. Only outbound sending is requested — your inbox is never read.
          </p>
        )}
      </div>
    </div>
  );
}

function friendlyOAuthError(code: string): string {
  const messages: Record<string, string> = {
    oauth_denied: 'Gmail connection was cancelled.',
    token_exchange_failed: 'Could not connect Gmail. Please try again.',
    userinfo_failed: 'Could not retrieve Gmail address. Please try again.',
    session_mismatch: 'Session error. Please try again.',
    no_enterprise: 'Enterprise not found.',
    save_failed: 'Could not save connection. Please try again.',
    not_configured: 'OAuth is not configured.',
    invalid_state: 'Invalid OAuth state. Please try again.',
  };
  return messages[code] ?? 'An error occurred. Please try again.';
}
