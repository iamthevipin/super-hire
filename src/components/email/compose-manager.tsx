'use client';

import { useRouter } from 'next/navigation';
import { useCompose } from '@/hooks/use-compose';
import { ComposePopover } from './compose-popover';

export function ComposeManager() {
  const { windows, closeCompose, toggleMinimize } = useCompose();
  const router = useRouter();

  if (windows.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-4 flex items-end gap-2 z-50">
      {windows.map((win) => (
        <ComposePopover
          key={win.id}
          window={win}
          onClose={closeCompose}
          onMinimize={toggleMinimize}
          onSent={() => router.refresh()}
        />
      ))}
    </div>
  );
}
