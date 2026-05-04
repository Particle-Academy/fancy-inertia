import { useEffect, useState, type ReactNode } from "react";

export interface FancyClientOnlyProps {
  children: ReactNode;
  /** Optional fallback rendered during SSR + the first client paint. */
  fallback?: ReactNode;
}

/**
 * Skip-SSR boundary. Renders `fallback` during server-side rendering
 * and the first client paint, then swaps in `children` after hydration
 * completes.
 *
 * Use this around components that touch browser-only globals
 * (`window`, `IntersectionObserver`, Babylon, ECharts canvas init):
 *
 *   <FancyClientOnly fallback={<div className="h-96 animate-pulse bg-zinc-100" />}>
 *     <EChart option={option} />
 *   </FancyClientOnly>
 *
 * Inertia 1.x ships SSR by default; without this wrapper, pages
 * containing fancy-3d / fancy-echarts / fancy-screens (uses
 * IntersectionObserver) will throw during the SSR pass.
 */
export function FancyClientOnly({ children, fallback = null }: FancyClientOnlyProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return <>{mounted ? children : fallback}</>;
}

FancyClientOnly.displayName = "FancyClientOnly";
