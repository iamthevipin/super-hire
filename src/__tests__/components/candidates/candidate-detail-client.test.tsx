import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateDetailClient } from '@/components/candidates/candidate-detail-client';
import type { CandidateDetail } from '@/types/candidates';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSearchParams = vi.fn(() => new URLSearchParams());
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => mockSearchParams()),
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}));

// Mock heavy child components to keep tests fast
vi.mock('@/components/candidates/candidate-header', () => ({
  CandidateHeader: () => <div data-testid="candidate-header" />,
}));
vi.mock('@/components/candidates/overview-tab', () => ({
  OverviewTab: () => <div data-testid="overview-tab" />,
}));
vi.mock('@/components/candidates/resume-tab', () => ({
  ResumeTab: () => <div data-testid="resume-tab" />,
}));
vi.mock('@/components/candidates/notes-tab', () => ({
  NotesTab: () => <div data-testid="notes-tab" />,
}));
vi.mock('@/components/candidates/feedback-tab', () => ({
  FeedbackTab: () => <div data-testid="feedback-tab" />,
}));
vi.mock('@/components/candidates/email-tab', () => ({
  EmailTab: () => <div data-testid="email-tab" />,
}));
vi.mock('@/components/candidates/activity-tab', () => ({
  ActivityTab: () => <div data-testid="activity-tab" />,
}));

const mockDetail: CandidateDetail = {
  candidate: {
    id: 'cand-1',
    enterprise_id: 'ent-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: null,
    linkedin_url: null,
    current_job_title: null,
    resume_path: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  application: {
    id: 'app-1',
    enterprise_id: 'ent-1',
    job_id: 'job-1',
    candidate_id: 'cand-1',
    pipeline_stage_id: 'stage-1',
    owner_id: null,
    tags: [],
    source: null,
    rejection_reason: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    candidate: {
      id: 'cand-1',
      enterprise_id: 'ent-1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: null,
      linkedin_url: null,
      current_job_title: null,
      resume_path: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    pipeline_stage: null,
  },
  other_applications: [],
};

const baseProps = {
  detail: mockDetail,
  applicationId: 'app-1',
  jobId: 'job-1',
  jobTitle: 'Engineer',
  currentUserId: 'user-1',
};

describe('CandidateDetailClient — tab visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Overview, Resume, Notes, Feedback tabs for non-admins', () => {
    render(<CandidateDetailClient {...baseProps} isAdmin={false} />);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeInTheDocument();
  });

  it('hides Email and Activity tabs for non-admins', () => {
    render(<CandidateDetailClient {...baseProps} isAdmin={false} />);

    expect(screen.queryByRole('button', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activity' })).not.toBeInTheDocument();
  });

  it('shows Email and Activity tabs for admins', () => {
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);

    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activity' })).toBeInTheDocument();
  });

  it('shows all 6 tabs for admins', () => {
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);

    const tabLabels = ['Overview', 'Resume', 'Notes', 'Feedback', 'Email', 'Activity'];
    tabLabels.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('renders 4 tabs for non-admins', () => {
    render(<CandidateDetailClient {...baseProps} isAdmin={false} />);

    // nav contains only 4 tab buttons
    const nav = screen.getByRole('navigation');
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
  });

  it('renders 6 tabs for admins', () => {
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);

    const nav = screen.getByRole('navigation');
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(6);
  });
});

describe('CandidateDetailClient — tab content rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overview tab by default (no tab param)', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams());
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-tab')).not.toBeInTheDocument();
  });

  it('renders notes tab when tab=notes in search params', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=notes'));
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('notes-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-tab')).not.toBeInTheDocument();
  });

  it('renders feedback tab when tab=feedback in search params', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=feedback'));
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('feedback-tab')).toBeInTheDocument();
  });

  it('renders email tab when tab=email in search params (admin only)', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=email'));
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('email-tab')).toBeInTheDocument();
  });

  it('renders activity tab when tab=activity in search params (admin only)', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=activity'));
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('activity-tab')).toBeInTheDocument();
  });

  it('renders resume tab when tab=resume in search params', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=resume'));
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);
    expect(screen.getByTestId('resume-tab')).toBeInTheDocument();
  });
});

describe('CandidateDetailClient — tab switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('calls router.push with correct tab param when tab button is clicked', async () => {
    const user = userEvent.setup();
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);

    await user.click(screen.getByRole('button', { name: 'Notes' }));

    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=notes'));
  });

  it('calls router.push with feedback tab param on Feedback click', async () => {
    const user = userEvent.setup();
    render(<CandidateDetailClient {...baseProps} isAdmin={true} />);

    await user.click(screen.getByRole('button', { name: 'Feedback' }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=feedback'));
  });
});
