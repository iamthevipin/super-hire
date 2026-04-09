'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { cn } from '@/lib/utils';
import type { ComposeWindow } from '@/components/email/compose-provider';

interface ComposePopoverProps {
  window: ComposeWindow;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onSent: () => void;
}

export function ComposePopover({ window: win, onClose, onMinimize, onSent }: ComposePopoverProps) {
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false, underline: false }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] text-sm text-[#141d1c] px-3 py-2',
      },
    },
  });

  const getPlainText = useCallback(() => {
    return editor?.getText() ?? '';
  }, [editor]);

  const getHtml = useCallback(() => {
    return editor?.getHTML() ?? '';
  }, [editor]);

  const handleSend = useCallback(async () => {
    const bodyHtml = getHtml();
    const bodyText = getPlainText();

    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!bodyText.trim()) {
      setError('Message body is required.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: win.candidateId,
          applicationId: win.applicationId,
          toEmail: win.candidateEmail,
          toName: win.candidateName,
          subject: subject.trim(),
          bodyHtml,
          bodyText,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to send email. Please try again.');
        return;
      }

      onSent();
      onClose(win.id);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }, [subject, getHtml, getPlainText, win, onClose, onSent]);

  if (win.minimized) {
    return (
      <div className="w-64 bg-[#141d1c] text-white rounded-t-xl shadow-xl">
        <div
          role="button"
          tabIndex={0}
          className="flex items-center justify-between px-3 py-2 cursor-pointer"
          onClick={() => onMinimize(win.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMinimize(win.id); } }}
        >
          <span className="text-xs font-medium truncate">
            {win.candidateName}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}
              className="text-white/70 hover:text-white transition-colors p-0.5"
              aria-label="Expand"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
              className="text-white/70 hover:text-white transition-colors p-0.5"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white rounded-t-xl shadow-2xl border border-[#d4e0de] flex flex-col">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        className="flex items-center justify-between px-3 py-2 bg-[#141d1c] text-white rounded-t-xl cursor-pointer select-none"
        onClick={() => onMinimize(win.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMinimize(win.id); } }}
      >
        <span className="text-xs font-medium truncate">
          New Message — {win.candidateName}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}
            className="text-white/70 hover:text-white transition-colors p-0.5"
            aria-label="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
            className="text-white/70 hover:text-white transition-colors p-0.5"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* To field */}
      <div className="px-3 py-1.5 border-b border-[#eaf2f1]">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8fa8a6] shrink-0">To</span>
          <span className="text-[#141d1c] truncate">
            {win.candidateName} &lt;{win.candidateEmail}&gt;
          </span>
        </div>
      </div>

      {/* Subject field */}
      <div className="px-3 py-1.5 border-b border-[#eaf2f1]">
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full text-xs text-[#141d1c] placeholder:text-[#b8c8c6] focus:outline-none bg-transparent"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[#eaf2f1]">
        <ToolbarButton
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <strong className="text-xs">B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <em className="text-xs not-italic" style={{ fontStyle: 'italic' }}>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('underline') ?? false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          label="Underline"
        >
          <span className="text-xs underline">U</span>
        </ToolbarButton>
        <div className="w-px h-4 bg-[#d4e0de] mx-1" />
        <ToolbarButton
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto max-h-48">
        <EditorContent editor={editor} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#eaf2f1]">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="px-3 py-1.5 bg-[#117a72] text-white text-xs font-medium rounded-lg hover:bg-[#0e6860] transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'w-6 h-6 flex items-center justify-center rounded text-[#3e4947] transition-colors',
        active ? 'bg-[#eaf2f1] text-[#141d1c]' : 'hover:bg-[#f4f9f8]'
      )}
    >
      {children}
    </button>
  );
}
