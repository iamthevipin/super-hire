import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ActivityTab } from '@/components/candidates/activity-tab';

vi.mock('@/actions/activity', () => ({
  getActivityForCandidate: vi.fn().mockResolvedValue({ data: [] }),
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe('ActivityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no events exist', async () => {
    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<ActivityTab candidateId="cand-1" />);
    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('renders activity events in reverse chronological order', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      data: [
        {
          id: 'event-1',
          enterprise_id: 'ent-1',
          candidate_id: 'cand-1',
          application_id: null,
          event_type: 'stage_changed',
          actor_id: 'user-1',
          actor_name: 'Alice',
          description: 'Alice moved John Doe from Applied to Screening',
          metadata: null,
          created_at: '2026-04-02T10:00:00Z',
        },
        {
          id: 'event-2',
          enterprise_id: 'ent-1',
          candidate_id: 'cand-1',
          application_id: null,
          event_type: 'candidate_created',
          actor_id: 'user-1',
          actor_name: 'Alice',
          description: 'Alice added John Doe to Software Engineer',
          metadata: null,
          created_at: '2026-04-01T10:00:00Z',
        },
      ],
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(
        screen.getByText('Alice moved John Doe from Applied to Screening')
      ).toBeInTheDocument();
      expect(screen.getByText('Alice added John Doe to Software Engineer')).toBeInTheDocument();
    });

    // Most recent event (event-1) should appear before event-2 in the DOM
    const descriptions = screen
      .getAllByText(/Alice/)
      .map((el) => el.textContent ?? '');
    expect(descriptions[0]).toContain('moved');
    expect(descriptions[1]).toContain('added');
  });

  it('shows error state when fetch fails', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      error: 'Forbidden',
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument();
    });
  });

  it('calls getActivityForCandidate with the candidateId', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    render(<ActivityTab candidateId="cand-42" />);
    await waitFor(() => {
      expect(getActivityForCandidate).toHaveBeenCalledWith('cand-42');
    });
  });
});

describe('ActivityTab — formatRelativeTime branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only fake Date — leave setTimeout/setInterval real so waitFor can poll
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeEvent(id: string, createdAt: string) {
    return {
      id,
      enterprise_id: 'ent-1',
      candidate_id: 'cand-1',
      application_id: null,
      event_type: 'stage_changed',
      actor_id: 'user-1',
      actor_name: 'Alice',
      description: 'Test event',
      metadata: null,
      created_at: createdAt,
    };
  }

  it('shows "just now" for events less than 1 minute ago', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    const now = new Date('2026-04-10T10:00:00Z');
    vi.setSystemTime(now);
    const createdAt = new Date(now.getTime() - 30_000).toISOString(); // 30s ago
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      data: [makeEvent('e1', createdAt)],
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText('just now')).toBeInTheDocument();
    });
  });

  it('shows "Xm ago" for events between 1 and 59 minutes ago', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    const now = new Date('2026-04-10T10:00:00Z');
    vi.setSystemTime(now);
    const createdAt = new Date(now.getTime() - 30 * 60_000).toISOString(); // 30 min ago
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      data: [makeEvent('e2', createdAt)],
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });
  });

  it('shows "Xh ago" for events between 1 and 23 hours ago', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    const now = new Date('2026-04-10T10:00:00Z');
    vi.setSystemTime(now);
    const createdAt = new Date(now.getTime() - 3 * 3600_000).toISOString(); // 3 hours ago
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      data: [makeEvent('e3', createdAt)],
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });
  });

  it('shows "Xd ago" for events between 1 and 6 days ago', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    const now = new Date('2026-04-10T10:00:00Z');
    vi.setSystemTime(now);
    const createdAt = new Date(now.getTime() - 3 * 86400_000).toISOString(); // 3 days ago
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      data: [makeEvent('e4', createdAt)],
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });
  });

  it('shows locale date string for events 7 or more days ago', async () => {
    const { getActivityForCandidate } = await import('@/actions/activity');
    const now = new Date('2026-04-10T10:00:00Z');
    vi.setSystemTime(now);
    const old = new Date('2026-03-01T10:00:00Z');
    vi.mocked(getActivityForCandidate).mockResolvedValueOnce({
      data: [makeEvent('e5', old.toISOString())],
    });

    render(<ActivityTab candidateId="cand-1" />);
    await waitFor(() => {
      expect(screen.getByText(old.toLocaleDateString())).toBeInTheDocument();
    });
  });
});
