'use client';

import { createContext, useState, useCallback } from 'react';

export interface ComposeWindow {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  applicationId: string | null;
  minimized: boolean;
}

interface ComposeContextValue {
  windows: ComposeWindow[];
  openCompose: (params: Omit<ComposeWindow, 'id' | 'minimized'>) => void;
  closeCompose: (id: string) => void;
  toggleMinimize: (id: string) => void;
}

export const ComposeContext = createContext<ComposeContextValue | null>(null);

const MAX_WINDOWS = 3;

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<ComposeWindow[]>([]);

  const openCompose = useCallback((params: Omit<ComposeWindow, 'id' | 'minimized'>) => {
    setWindows((prev) => {
      // If already open for this candidate, un-minimize it
      const existing = prev.find((w) => w.candidateId === params.candidateId);
      if (existing) {
        return prev.map((w) =>
          w.id === existing.id ? { ...w, minimized: false } : w
        );
      }

      // At max windows: minimize the oldest, then add new
      const next = prev.length >= MAX_WINDOWS
        ? prev.map((w, i) => (i === 0 ? { ...w, minimized: true } : w))
        : prev;

      const newWindow: ComposeWindow = {
        ...params,
        id: `${params.candidateId}-${Date.now()}`,
        minimized: false,
      };

      return [...next, newWindow];
    });
  }, []);

  const closeCompose = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w))
    );
  }, []);

  return (
    <ComposeContext.Provider value={{ windows, openCompose, closeCompose, toggleMinimize }}>
      {children}
    </ComposeContext.Provider>
  );
}
