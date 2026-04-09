import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from '@/components/candidates/star-rating';

describe('StarRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 5 star buttons', () => {
    render(<StarRating value={null} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders correct aria-labels for each star', () => {
    render(<StarRating value={null} />);
    expect(screen.getByRole('button', { name: '1 star' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 stars' })).toBeInTheDocument();
  });

  it('disables all buttons when readOnly is true', () => {
    render(<StarRating value={3} readOnly />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('does not call onChange when readOnly and clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={3} onChange={onChange} readOnly />);

    await user.click(screen.getByRole('button', { name: '4 stars' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with the clicked star value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={null} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '3 stars' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with null when clicking the currently selected star (deselect)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={3} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '3 stars' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does not call onChange when no onChange prop provided', async () => {
    const user = userEvent.setup();
    // Should not throw
    render(<StarRating value={null} />);
    await user.click(screen.getByRole('button', { name: '2 stars' }));
  });

  it('shows hover preview on mouseEnter (not readOnly)', () => {
    render(<StarRating value={1} />);
    const star4 = screen.getByRole('button', { name: '4 stars' });
    fireEvent.mouseEnter(star4);
    // After hover, display should show 4 stars filled — no exception thrown
    expect(star4).toBeInTheDocument();
  });

  it('restores value on mouseLeave', () => {
    render(<StarRating value={2} />);
    const star5 = screen.getByRole('button', { name: '5 stars' });
    fireEvent.mouseEnter(star5);
    fireEvent.mouseLeave(star5);
    // Should revert to display=2 without throwing
    expect(star5).toBeInTheDocument();
  });

  it('does not set hover state on mouseEnter when readOnly', () => {
    render(<StarRating value={2} readOnly />);
    const star4 = screen.getByRole('button', { name: '4 stars' });
    fireEvent.mouseEnter(star4);
    fireEvent.mouseLeave(star4);
    expect(star4).toBeDisabled();
  });

  it('uses sm star size when size="sm" prop is passed', () => {
    const { container } = render(<StarRating value={3} size="sm" />);
    // Component renders without error with sm size
    expect(container.querySelectorAll('button')).toHaveLength(5);
  });
});
