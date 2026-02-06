'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
}

export function StarRating({ value, onChange, readonly = false, size = 20 }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverValue || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={cn(
              'transition-colors duration-150',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'
            )}
            onClick={() => {
              if (!readonly && onChange) {
                onChange(star);
              }
            }}
            onMouseEnter={() => {
              if (!readonly) setHoverValue(star);
            }}
            onMouseLeave={() => {
              if (!readonly) setHoverValue(0);
            }}
          >
            <Star
              size={size}
              className={cn(
                'transition-colors',
                isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
