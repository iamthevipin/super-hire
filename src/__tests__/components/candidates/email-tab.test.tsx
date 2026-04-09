import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailTab } from '@/components/candidates/email-tab';

vi.mock('@/actions/gmail', () => ({
  getSentEmailsForCandidate: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockOpenCompose = vi.fn();
vi.mock('@/hooks/use-compose', () => ({
  useCompose: vi.fn(() => ({ openCompose: mockOpenCompose })),
}));

const defaultProps = {
  candidateId: 'cand-1',
  applicationId: 'app-1',
  candidateEmail: 'jane@example.com',
  candidateName: 'Jane Doe',
  isAdmin: true,
};

describe('EmailTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no emails sent', async () => {
    render(<EmailTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No emails sent yet')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    render(<EmailTab {...defaultProps} />);
    // Loading spinner is present before data resolves
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders sent emails after load', async () => {
    const { getSentEmailsForCandidate } = await import('@/actions/gmail');
    vi.mocked(getSentEmailsForCandidate).mockResolvedValueOnce({
      data: [
        {
          id: 'email-1',
          enterprise_id: 'ent-1',
          candidate_id: 'cand-1',
          sender_user_id: 'user-1',
          sender_name: 'Alice',
          sender_gmail_address: 'alice@company.com',
          subject: 'Interview invitation',
          body_html: '<p>Please join us</p>',
          body_text: 'Please join us',
          sent_at: '2026-04-01T10:00:00Z',
          created_at: '2026-04-01T10:00:00Z',
        },
      ],
    });

    render(<EmailTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Interview invitation')).toBeInTheDocument();
    });
  });

  it('calls getSentEmailsForCandidate with the candidateId', async () => {
    const { getSentEmailsForCandidate } = await import('@/actions/gmail');
    render(<EmailTab {...defaultProps} />);
    await waitFor(() => {
      expect(getSentEmailsForCandidate).toHaveBeenCalledWith('cand-1');
    });
  });

  it('shows Compose button for admins', async () => {
    render(<EmailTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Compose')).toBeInTheDocument();
    });
  });

  it('calls openCompose with correct params when Compose is clicked', async () => {
    const user = userEvent.setup();
    render(<EmailTab {...defaultProps} />);
    await waitFor(() => screen.getByText('Compose'));
    await user.click(screen.getByText('Compose'));

    expect(mockOpenCompose).toHaveBeenCalledWith({
      candidateId: 'cand-1',
      candidateName: 'Jane Doe',
      candidateEmail: 'jane@example.com',
      applicationId: 'app-1',
    });
  });

  it('shows permission message for non-admins', () => {
    render(<EmailTab {...defaultProps} isAdmin={false} />);
    expect(screen.getByText('Only admins can send and view emails.')).toBeInTheDocument();
  });

  it('sanitizes body_html before rendering', async () => {
    const DOMPurify = await import('isomorphic-dompurify');
    const { getSentEmailsForCandidate } = await import('@/actions/gmail');

    vi.mocked(getSentEmailsForCandidate).mockResolvedValueOnce({
      data: [
        {
          id: 'email-2',
          enterprise_id: 'ent-1',
          candidate_id: 'cand-1',
          sender_user_id: 'user-1',
          sender_name: 'Alice',
          sender_gmail_address: 'alice@company.com',
          subject: 'Follow-up',
          body_html: '<p>Hello <script>evil()</script></p>',
          body_text: 'Hello',
          sent_at: '2026-04-01T10:00:00Z',
          created_at: '2026-04-01T10:00:00Z',
        },
      ],
    });

    const user = userEvent.setup();
    render(<EmailTab {...defaultProps} />);
    await waitFor(() => screen.getByText('Follow-up'));

    await user.click(screen.getByText('Follow-up'));

    await waitFor(() => {
      expect(DOMPurify.default.sanitize).toHaveBeenCalledWith(
        '<p>Hello <script>evil()</script></p>'
      );
    });
  });
});
