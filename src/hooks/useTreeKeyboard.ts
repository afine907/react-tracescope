/**
 * useTreeKeyboard Hook
 * Shared keyboard navigation handler for tree components
 */

import { useCallback } from 'react';

/**
 * Keyboard handler options
 */
export interface UseTreeKeyboardOptions {
  /** Whether the node has children and can be expanded */
  hasChildren: boolean;

  /** Callback to toggle expand/collapse state */
  onToggle: () => void;
}

/**
 * Returns keyboard event handler for tree item navigation
 * Supports Enter and Space keys to toggle expand/collapse
 */
export function useTreeKeyboard(options: UseTreeKeyboardOptions) {
  const { hasChildren, onToggle } = options;

  return useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && hasChildren) {
        e.preventDefault();
        onToggle();
      }
    },
    [hasChildren, onToggle]
  );
}

export default useTreeKeyboard;
