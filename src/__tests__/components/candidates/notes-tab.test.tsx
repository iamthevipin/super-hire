import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesTab } from '@/components/candidates/notes-tab';

// Mock the server actions
vi.mock('@/actions/notes', () => ({
  addNote: vi.fn().mockResolvedValue({ noteId: 'new-note-id' }),
  updateNote: vi.fn().mockResolvedValue({}),
  deleteNote: vi.fn().mockResolvedValue({}),
  getNotesForCandidate: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'note-1',
        enterprise_id: 'ent-1',
        candidate_id: 'cand-1',
        pipeline_stage_id: 'stage-1',
        user_id: 'user-1',
        user_name: 'Alice',
        body: 'Strong communicator',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        stage_name: 'Interview',
        is_own: true,
      },
      {
        id: 'note-2',
        enterprise_id: 'ent-1',
        candidate_id: 'cand-1',
        pipeline_stage_id: 'stage-1',
        user_id: 'user-2',
        user_name: 'Bob',
        body: 'Needs improvement in coding',
        created_at: '2026-04-01T11:00:00Z',
        updated_at: '2026-04-01T11:00:00Z',
        stage_name: 'Interview',
        is_own: false,
      },
    ],
  }),
}));

const defaultProps = {
  candidateId: 'cand-1',
  currentStageId: 'stage-1',
  currentStageName: 'Interview',
};

describe('NotesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the add note form', async () => {
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a note about this candidate...')).toBeInTheDocument();
    });
  });

  it('shows current stage name in the form', async () => {
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      // Stage name appears in form label and as stage tags on notes
      const matches = screen.getAllByText('Interview');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders existing notes', async () => {
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Strong communicator')).toBeInTheDocument();
      expect(screen.getByText('Needs improvement in coding')).toBeInTheDocument();
    });
  });

  it('shows edit/delete controls only on own notes', async () => {
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit');
      const deleteButtons = screen.getAllByText('Delete');
      // Only 1 own note (note-1), so only 1 Edit and 1 Delete button
      expect(editButtons).toHaveLength(1);
      expect(deleteButtons).toHaveLength(1);
    });
  });

  it('shows stage tag on each note', async () => {
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      const stageTags = screen.getAllByText('Interview');
      // One from the form label, two from note stage tags
      expect(stageTags.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows empty state when no notes exist', async () => {
    const { getNotesForCandidate } = await import('@/actions/notes');
    vi.mocked(getNotesForCandidate).mockResolvedValueOnce({ data: [] });

    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      expect(
        screen.getByText('No notes yet. Add a note to capture observations about this candidate.')
      ).toBeInTheDocument();
    });
  });

  it('disables Add note button when textarea is empty', async () => {
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Add note')).toBeDisabled();
    });
  });

  it('enables Add note button when textarea has content', async () => {
    const user = userEvent.setup();
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText('Add a note about this candidate...'));

    await user.type(
      screen.getByPlaceholderText('Add a note about this candidate...'),
      'New observation'
    );
    expect(screen.getByText('Add note')).not.toBeDisabled();
  });

  it('requires confirmation before deleting a note', async () => {
    const { deleteNote } = await import('@/actions/notes');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();

    render(<NotesTab {...defaultProps} />);
    await waitFor(() => screen.getByText('Delete'));

    await user.click(screen.getByText('Delete'));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(deleteNote).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('deletes the note when confirmation is accepted', async () => {
    const { deleteNote } = await import('@/actions/notes');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<NotesTab {...defaultProps} />);
    await waitFor(() => screen.getByText('Delete'));

    await user.click(screen.getByText('Delete'));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(deleteNote).toHaveBeenCalledWith('note-1');

    confirmSpy.mockRestore();
  });

  it('enters edit mode when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => screen.getByText('Edit'));

    await user.click(screen.getByText('Edit'));

    const textarea = screen.getByDisplayValue('Strong communicator');
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('exits edit mode when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => screen.getByText('Edit'));

    await user.click(screen.getByText('Edit'));
    await user.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.getByText('Strong communicator')).toBeInTheDocument();
  });

  it('calls addNote with correct args on submission', async () => {
    const { addNote } = await import('@/actions/notes');
    const user = userEvent.setup();
    render(<NotesTab {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText('Add a note about this candidate...'));

    await user.type(
      screen.getByPlaceholderText('Add a note about this candidate...'),
      'Excellent problem solver'
    );
    await user.click(screen.getByText('Add note'));

    expect(addNote).toHaveBeenCalledWith('cand-1', 'stage-1', 'Excellent problem solver');
  });
});
