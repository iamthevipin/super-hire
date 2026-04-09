import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanCard } from '@/components/candidates/kanban-card';
import type { ApplicationWithCandidate } from '@/types/candidates';

// Mock useCompose
const mockOpenCompose = vi.fn();
vi.mock('@/hooks/use-compose', () => ({
  useCompose: vi.fn(() => ({ openCompose: mockOpenCompose })),
}));

// Mock dnd-kit — tests don't exercise drag behavior
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));
vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

// Mock feedback panel to avoid deep render
vi.mock('@/components/candidates/feedback-quick-panel', () => ({
  FeedbackQuickPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="feedback-panel">
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

// Mock next/link to render as a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockApplication: ApplicationWithCandidate = {
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
  pipeline_stage: null,
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
};

describe('KanbanCard — email button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an active email button for admins', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" isAdmin={true} />);

    const emailBtn = screen.getByRole('button', { name: /send email/i });
    expect(emailBtn).not.toBeDisabled();
  });

  it('renders a disabled email button for non-admins', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" isAdmin={false} />);

    const emailBtn = screen.getByRole('button', { name: /email.*admins only/i });
    expect(emailBtn).toBeDisabled();
  });

  it('calls openCompose with correct params when admin clicks email button', async () => {
    const user = userEvent.setup();
    render(<KanbanCard application={mockApplication} jobId="job-1" isAdmin={true} />);

    const emailBtn = screen.getByRole('button', { name: /send email/i });
    await user.click(emailBtn);

    expect(mockOpenCompose).toHaveBeenCalledOnce();
    expect(mockOpenCompose).toHaveBeenCalledWith({
      candidateId: 'cand-1',
      candidateName: 'Jane Doe',
      candidateEmail: 'jane@example.com',
      applicationId: 'app-1',
    });
  });

  it('does not call openCompose when non-admin clicks the disabled email button', async () => {
    const user = userEvent.setup();
    render(<KanbanCard application={mockApplication} jobId="job-1" isAdmin={false} />);

    const emailBtn = screen.getByRole('button', { name: /email.*admins only/i });
    await user.click(emailBtn);

    expect(mockOpenCompose).not.toHaveBeenCalled();
  });

  it('defaults isAdmin to false when prop is omitted', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" />);

    const emailBtn = screen.getByRole('button', { name: /email.*admins only/i });
    expect(emailBtn).toBeDisabled();
  });

  it('renders candidate name and email', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders phone when candidate has a phone number', () => {
    const withPhone = {
      ...mockApplication,
      candidate: { ...mockApplication.candidate, phone: '+1 555 0100' },
    };
    render(<KanbanCard application={withPhone} jobId="job-1" />);
    expect(screen.getByText('+1 555 0100')).toBeInTheDocument();
  });

  it('does not render phone line when phone is null', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" />);
    expect(screen.queryByText(/\+1/)).not.toBeInTheDocument();
  });

  it('renders up to 3 tags when application has tags', () => {
    const withTags = { ...mockApplication, tags: ['eng', 'senior', 'remote'] };
    render(<KanbanCard application={withTags} jobId="job-1" />);
    expect(screen.getByText('eng')).toBeInTheDocument();
    expect(screen.getByText('senior')).toBeInTheDocument();
    expect(screen.getByText('remote')).toBeInTheDocument();
  });

  it('shows +N overflow badge when application has more than 3 tags', () => {
    const withManyTags = { ...mockApplication, tags: ['eng', 'senior', 'remote', 'extra'] };
    render(<KanbanCard application={withManyTags} jobId="job-1" />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not render tags section when tags is empty', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" />);
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });
});

describe('KanbanCard — feedback panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show feedback panel initially', () => {
    render(<KanbanCard application={mockApplication} jobId="job-1" />);
    expect(screen.queryByTestId('feedback-panel')).not.toBeInTheDocument();
  });

  it('shows feedback panel when Leave feedback star button is clicked', async () => {
    const user = userEvent.setup();
    render(<KanbanCard application={mockApplication} jobId="job-1" />);

    const starBtn = screen.getByRole('button', { name: /leave feedback/i });
    await user.click(starBtn);

    expect(screen.getByTestId('feedback-panel')).toBeInTheDocument();
  });

  it('hides feedback panel when onClose is called', async () => {
    const user = userEvent.setup();
    render(<KanbanCard application={mockApplication} jobId="job-1" />);

    await user.click(screen.getByRole('button', { name: /leave feedback/i }));
    expect(screen.getByTestId('feedback-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('feedback-panel')).not.toBeInTheDocument();
  });
});
