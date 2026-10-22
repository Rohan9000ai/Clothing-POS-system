import { useLayoutEffect, useRef, useState } from "react";

/**
 * Measures how wide an element is, and keeps up as the window is resized.
 * Returns 0 until the first measurement. The element must exist when the
 * component using this hook first renders.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Ignore sub-pixel changes so the chart never redraws in a loop.
    const update = (next: number) => setWidth((previous) => (Math.abs(previous - next) >= 1 ? next : previous));

    update(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width: Math.floor(width) };
}