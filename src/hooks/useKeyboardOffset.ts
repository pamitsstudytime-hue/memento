import { useState, useEffect } from 'react';

/**
 * Custom hook that tracks mobile virtual keyboard appearance via window.visualViewport
 * and provides smooth bottom offset calculation so drawers effortlessly ride above the keyboard.
 */
export function useKeyboardOffset(): number {
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    const updateOffset = () => {
      if (!vv) return;

      // In mobile browsers (iOS Safari, Android Chrome, WebViews), when the virtual keyboard opens,
      // visualViewport.height shrinks.
      const windowHeight = window.innerHeight;
      const visibleHeight = vv.height;
      const offsetTop = vv.offsetTop;

      // Calculate the difference between layout window height and visible viewport bottom
      const diff = Math.max(0, Math.round(windowHeight - (visibleHeight + offsetTop)));

      // If diff is greater than 40px, the soft keyboard is actively pushed up
      if (diff > 40) {
        setKeyboardOffset(diff);
      } else {
        setKeyboardOffset(0);
      }
    };

    vv.addEventListener('resize', updateOffset);
    vv.addEventListener('scroll', updateOffset);

    // Initial measurement
    updateOffset();

    return () => {
      vv.removeEventListener('resize', updateOffset);
      vv.removeEventListener('scroll', updateOffset);
    };
  }, []);

  return keyboardOffset;
}
