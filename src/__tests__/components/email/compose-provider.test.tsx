import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposeProvider } from '@/components/email/compose-provider';
import { useCompose } from '@/hooks/use-compose';

function TestConsumer() {
  const { windows, openCompose, closeCompose, toggleMinimize } = useCompose();
  return (
    <div>
      <div data-testid="window-count">{windows.length}</div>
      {windows.map((w) => (
        <div key={w.id} data-testid={`window-${w.candidateId}`}>
          <span data-testid={`minimized-${w.candidateId}`}>{w.minimized ? 'minimized' : 'open'}</span>
          <button onClick={() => closeCompose(w.id)}>close-{w.candidateId}</button>
          <button onClick={() => toggleMinimize(w.id)}>toggle-{w.candidateId}</button>
        </div>
      ))}
      <button onClick={() => openCompose({ candidateId: 'c1', candidateName: 'Alice', candidateEmail: 'a@x.com', applicationId: null })}>
        open-c1
      </button>
      <button onClick={() => openCompose({ candidateId: 'c2', candidateName: 'Bob', candidateEmail: 'b@x.com', applicationId: null })}>
        open-c2
      </button>
      <button onClick={() => openCompose({ candidateId: 'c3', candidateName: 'Carol', candidateEmail: 'c@x.com', applicationId: null })}>
        open-c3
      </button>
      <button onClick={() => openCompose({ candidateId: 'c4', candidateName: 'Dave', candidateEmail: 'd@x.com', applicationId: null })}>
        open-c4
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ComposeProvider>
      <TestConsumer />
    </ComposeProvider>
  );
}

describe('ComposeProvider', () => {
  it('starts with zero windows', () => {
    renderWithProvider();
    expect(screen.getByTestId('window-count').textContent).toBe('0');
  });

  it('opens a compose window', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('open-c1'));
    expect(screen.getByTestId('window-count').textContent).toBe('1');
    expect(screen.getByTestId('window-c1')).toBeInTheDocument();
  });

  it('re-opening same candidate un-minimizes existing window', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('open-c1'));
    await user.click(screen.getByText('toggle-c1'));
    expect(screen.getByTestId('minimized-c1').textContent).toBe('minimized');

    await user.click(screen.getByText('open-c1'));
    expect(screen.getByTestId('window-count').textContent).toBe('1');
    expect(screen.getByTestId('minimized-c1').textContent).toBe('open');
  });

  it('closes a window', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('open-c1'));
    expect(screen.getByTestId('window-count').textContent).toBe('1');

    await user.click(screen.getByText('close-c1'));
    expect(screen.getByTestId('window-count').textContent).toBe('0');
  });

  it('toggles minimize state', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('open-c1'));
    expect(screen.getByTestId('minimized-c1').textContent).toBe('open');

    await user.click(screen.getByText('toggle-c1'));
    expect(screen.getByTestId('minimized-c1').textContent).toBe('minimized');

    await user.click(screen.getByText('toggle-c1'));
    expect(screen.getByTestId('minimized-c1').textContent).toBe('open');
  });

  it('supports up to 3 windows', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('open-c1'));
    await user.click(screen.getByText('open-c2'));
    await user.click(screen.getByText('open-c3'));
    expect(screen.getByTestId('window-count').textContent).toBe('3');
  });

  it('minimizes oldest window when MAX_WINDOWS is reached', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('open-c1'));
    await user.click(screen.getByText('open-c2'));
    await user.click(screen.getByText('open-c3'));
    // All three should be open
    expect(screen.getByTestId('minimized-c1').textContent).toBe('open');

    await user.click(screen.getByText('open-c4'));
    // Still 4 windows, c1 (oldest) should be minimized
    expect(screen.getByTestId('window-count').textContent).toBe('4');
    expect(screen.getByTestId('minimized-c1').textContent).toBe('minimized');
  });
});

describe('useCompose', () => {
  it('throws when used outside ComposeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useCompose must be used within ComposeProvider'
    );
    spy.mockRestore();
  });
});
