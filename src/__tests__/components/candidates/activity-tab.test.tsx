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
