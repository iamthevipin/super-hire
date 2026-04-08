'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ value, onChange, readOnly = false, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const starSize = size === 'sm' ? 14 : 18;
  const display = hovered ?? value;

  const handleClick = (star: number) => {
    if (readOnly || !onChange) return;
    if (value === star) {
      onChange(null);
    } else {
      onChange(star);
    }
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={cn(
            'transition-colors',
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          )}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            size={starSize}
            className={cn(
              'transition-colors',
              display !== null && star <= display
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-[#d4e0de]'
            )}
          />
        </button>
      ))}
    </div>
  );
}
