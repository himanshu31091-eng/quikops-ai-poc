"use client";

import * as React from "react";

/**
 * Fixed-height row virtualisation for the case table.
 *
 * No dependency: the table has uniform row heights, which is the one case where
 * windowing is twenty lines rather than a library. Rows outside the viewport are
 * replaced by a single spacer row at each end, so a 10,000-case plant scrolls at
 * the same cost as a 25-case one and the DOM stays under a hundred nodes.
 */

interface VirtualRowsOptions {
  rowCount: number;
  rowHeight: number;
  /** Rows rendered beyond each edge, so fast scrolling never shows a gap. */
  overscan?: number;
}

export interface VirtualRows {
  /** Attach to the scrolling element. */
  setContainer: (element: HTMLDivElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
  totalHeight: number;
  scrollToTop: () => void;
}

/** Server render height. Matches the container's CSS min-height so the first
 *  client render produces the same window and hydration stays clean. */
const ASSUMED_VIEWPORT = 640;

export function useVirtualRows({
  rowCount,
  rowHeight,
  overscan = 8,
}: VirtualRowsOptions): VirtualRows {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(ASSUMED_VIEWPORT);

  const setContainer = React.useCallback((next: HTMLDivElement | null) => {
    containerRef.current = next;
    setElement(next);
  }, []);

  React.useEffect(() => {
    if (!element) return;

    let frame = 0;
    const readScroll = () => {
      frame = 0;
      setScrollTop(element.scrollTop);
    };
    const onScroll = () => {
      // One state update per animation frame, not one per scroll event.
      if (frame === 0) frame = requestAnimationFrame(readScroll);
    };

    const observer = new ResizeObserver(() => {
      setViewportHeight(element.clientHeight);
    });

    element.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(element);
    setViewportHeight(element.clientHeight);
    setScrollTop(element.scrollTop);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      element.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [element]);

  const scrollToTop = React.useCallback(() => {
    containerRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(rowCount, startIndex + visibleCount);

  return {
    setContainer,
    containerRef,
    startIndex,
    endIndex,
    paddingTop: startIndex * rowHeight,
    paddingBottom: Math.max(0, (rowCount - endIndex) * rowHeight),
    totalHeight: rowCount * rowHeight,
    scrollToTop,
  };
}
