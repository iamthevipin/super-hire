import { useContext } from 'react';
import { ComposeContext } from '@/components/email/compose-provider';

export function useCompose() {
  const ctx = useContext(ComposeContext);
  if (!ctx) {
    throw new Error('useCompose must be used within ComposeProvider');
  }
  return ctx;
}
