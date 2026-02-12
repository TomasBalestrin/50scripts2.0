'use client';

import { useCallback, useRef, useState } from 'react';

interface UseGridNavigationOptions {
  /** Total number of items in the grid */
  itemCount: number;
  /** Number of columns (responsive - pass current visible columns) */
  columns: number;
  /** Called when Enter/Space is pressed on focused item */
  onSelect?: (index: number) => void;
}

/**
 * Hook for arrow key + Enter navigation in card grids.
 * Returns props to spread on the grid container and individual items.
 */
export function useGridNavigation({
  itemCount,
  columns,
  onSelect,
}: UseGridNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerRef = useCallback((index: number, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(index, el);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  const focusItem = useCallback((index: number) => {
    setFocusedIndex(index);
    itemRefs.current.get(index)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (itemCount === 0) return;

      let nextIndex = focusedIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = Math.min(focusedIndex + 1, itemCount - 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = Math.max(focusedIndex - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = Math.min(focusedIndex + columns, itemCount - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = Math.max(focusedIndex - columns, 0);
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = itemCount - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0) onSelect?.(focusedIndex);
          return;
        default:
          return;
      }

      if (nextIndex !== focusedIndex) {
        focusItem(nextIndex);
      }
    },
    [focusedIndex, itemCount, columns, onSelect, focusItem]
  );

  const getGridProps = useCallback(
    () => ({
      role: 'grid' as const,
      'aria-label': 'Grade de itens',
      onKeyDown: handleKeyDown,
    }),
    [handleKeyDown]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      role: 'gridcell' as const,
      tabIndex: focusedIndex === index ? 0 : index === 0 && focusedIndex === -1 ? 0 : -1,
      ref: (el: HTMLElement | null) => registerRef(index, el),
      onFocus: () => setFocusedIndex(index),
      'aria-selected': focusedIndex === index,
    }),
    [focusedIndex, registerRef]
  );

  return { focusedIndex, getGridProps, getItemProps };
}
