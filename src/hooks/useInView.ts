import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Lazily mounts horizontal rows when they come within `rootMargin` (default 300px) of the viewport.
 * Disconnects the IntersectionObserver once visible or on unmount.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  rootMargin = '300px'
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    // Fallback to true if IntersectionObserver is unsupported
    return typeof window !== 'undefined' && !('IntersectionObserver' in window);
  });

  useEffect(() => {
    if (isVisible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin]);

  return [ref, isVisible];
}
