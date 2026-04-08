'use client';

import { useState, useEffect, useCallback } from 'react';
import { addNote, updateNote, deleteNote, getNotesForCandidate } from '@/actions/notes';
import type { CandidateNote } from '@/types/feedback';

interface NoteItem extends CandidateNote {
  stage_name: string;
  is_own: boolean;
}

interface NotesTabProps {
  candidateId: string;
  currentStageId: string;
  currentStageName: string;
}

export function NotesTab({ candidateId, currentStageId, currentStageName }: NotesTabProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newNoteBody, setNewNoteBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getNotesForCandidate(candidateId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotes((result.data ?? []) as NoteItem[]);
  }, [candidateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleAddNote = async () => {
    if (!newNoteBody.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await addNote(candidateId, currentStageId, newNoteBody.trim());
    setSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setNewNoteBody('');
    await load();
  };

  const handleEditSave = async (noteId: string) => {
    if (!editBody.trim()) return;
    const result = await updateNote(noteId, editBody.trim());
    if (!result.error) {
      setEditingNoteId(null);
      setEditBody('');
      await load();
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    setDeletingNoteId(noteId);
    await deleteNote(noteId);
    setDeletingNoteId(null);
    await load();
  };

  if (loading) {
    return <p className="text-sm text-[#8fa8a6] py-8 text-center">Loading notes...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 py-8 text-center">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="border border-[#d4e0de] rounded-lg p-4 space-y-3">
        <p className="text-xs text-[#8fa8a6]">
          Adding note for <span className="font-medium text-[#3e4947]">{currentStageName}</span> stage
        </p>
        <textarea
          value={newNoteBody}
          onChange={(e) => setNewNoteBody(e.target.value)}
          placeholder="Add a note about this candidate..."
          rows={3}
          className="w-full text-sm border border-[#d4e0de] rounded-lg px-3 py-2 text-[#3e4947] placeholder-[#b8c8c6] focus:outline-none focus:border-[#3e6b66] resize-none"
        />
        {submitError && <p className="text-xs text-red-600">{submitError}</p>}
        <button
          type="button"
          onClick={handleAddNote}
          disabled={submitting || !newNoteBody.trim()}
          className="px-4 py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Add note'}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-[#8fa8a6] text-center py-8">
          No notes yet. Add a note to capture observations about this candidate.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="border border-[#d4e0de] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#3e4947]">{note.user_name}</span>
                  <span className="text-[10px] bg-[#eaf2f1] text-[#3e6b66] px-1.5 py-0.5 rounded-full">
                    {note.stage_name}
                  </span>
                </div>
                <span className="text-[10px] text-[#b8c8c6]">
                  {new Date(note.updated_at).toLocaleDateString()}
                  {note.created_at !== note.updated_at && ' (edited)'}
                </span>
              </div>

              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-[#d4e0de] rounded-lg px-3 py-2 text-[#3e4947] focus:outline-none focus:border-[#3e6b66] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSave(note.id)}
                      className="text-xs text-[#3e6b66] border border-[#d4e0de] px-3 py-1 rounded hover:bg-[#f4f9f8]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(null)}
                      className="text-xs text-[#8fa8a6] px-3 py-1 rounded hover:bg-[#f4f9f8]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[#3e4947] whitespace-pre-wrap">{note.body}</p>
                  {note.is_own && (
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditBody(note.body);
                        }}
                        className="text-xs text-[#3e6b66] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingNoteId === note.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
