import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Page transitions for Inertia apps — a zero-dependency, CSS-driven
 * enter/exit crossfade keyed on the Inertia page.
 *
 * Two pieces:
 *   - <FancyPageTransition pageKey={url}>   the engine: wrap the page body
 *     (inside your persistent layout, NOT the whole tree, so chrome stays put).
 *   - <FancyTransitionProvider> + useFancyTransition()   optional state +
 *     localStorage persistence for a live "pick your transition" switcher.
 *
 * The engine is self-contained: it injects its own keyframes once on the
 * client and respects `prefers-reduced-motion`. No framer-motion, no peer.
 */

export const FANCY_TRANSITIONS = ["fade", "slide", "scale", "blur", "none"] as const;
export type FancyTransition = (typeof FANCY_TRANSITIONS)[number];

/** Human labels for building a switcher control. */
export const FANCY_TRANSITION_LABELS: Record<FancyTransition, string> = {
  fade: "Fade",
  slide: "Slide",
  scale: "Zoom",
  blur: "Blur",
  none: "None",
};

/** Default crossfade duration (ms). Kept in sync with the injected keyframes. */
const DEFAULT_DURATION = 280;

const ENTER_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EXIT_EASE = "cubic-bezier(0.4, 0, 1, 1)";

const TRANSITION_CSS = `
@keyframes fancy-pt-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes fancy-pt-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes fancy-pt-slide-in { from { opacity: 0; transform: translate3d(24px,0,0) } to { opacity: 1; transform: none } }
@keyframes fancy-pt-slide-out { from { opacity: 1; transform: none } to { opacity: 0; transform: translate3d(-24px,0,0) } }
@keyframes fancy-pt-scale-in { from { opacity: 0; transform: scale(0.97) } to { opacity: 1; transform: none } }
@keyframes fancy-pt-scale-out { from { opacity: 1; transform: none } to { opacity: 0; transform: scale(1.02) } }
@keyframes fancy-pt-blur-in { from { opacity: 0; filter: blur(10px) } to { opacity: 1; filter: blur(0) } }
@keyframes fancy-pt-blur-out { from { opacity: 1; filter: blur(0) } to { opacity: 0; filter: blur(10px) } }
@media (prefers-reduced-motion: reduce) {
  [data-fancy-pt-layer] { animation: none !important; }
}
`.trim();

let stylesInjected = false;

/** Inject the keyframes once per document, client-side only (SSR no-op). */
function useTransitionStyles(): void {
  useEffect(() => {
    if (stylesInjected || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.setAttribute("data-fancy-pt-styles", "");
    el.textContent = TRANSITION_CSS;
    document.head.appendChild(el);
    stylesInjected = true;
  }, []);
}

function animationFor(
  transition: FancyTransition,
  dir: "in" | "out",
  duration: number,
): string | undefined {
  if (transition === "none") return undefined;
  const ease = dir === "in" ? ENTER_EASE : EXIT_EASE;
  return `fancy-pt-${transition}-${dir} ${duration}ms ${ease} both`;
}

// ── Provider + hook (optional — for a live switcher) ─────────────────────────

interface TransitionContextValue {
  transition: FancyTransition;
  setTransition: (t: FancyTransition) => void;
  transitions: readonly FancyTransition[];
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

export interface FancyTransitionProviderProps {
  children: ReactNode;
  /** Transition used until the user picks one (or storage is read). Default `"fade"`. */
  defaultTransition?: FancyTransition;
  /** localStorage key for persisting the choice. Default `"fancy:page-transition"`. */
  storageKey?: string;
}

/**
 * Holds the active page transition + persists it to localStorage, so a
 * switcher control anywhere in the app can change how every navigation
 * animates. Wrap your Inertia `<App>` once. Optional — `<FancyPageTransition>`
 * also accepts a `transition` prop directly.
 */
export function FancyTransitionProvider({
  children,
  defaultTransition = "fade",
  storageKey = "fancy:page-transition",
}: FancyTransitionProviderProps) {
  const [transition, setTransitionState] = useState<FancyTransition>(defaultTransition);

  // Hydrate from storage AFTER first paint — keeps SSR markup deterministic
  // (first paint = default), and the choice only affects subsequent navigation.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && (FANCY_TRANSITIONS as readonly string[]).includes(stored)) {
        setTransitionState(stored as FancyTransition);
      }
    } catch {
      /* private mode / no storage — fall back to default */
    }
  }, [storageKey]);

  const setTransition = useCallback(
    (t: FancyTransition) => {
      setTransitionState(t);
      try {
        localStorage.setItem(storageKey, t);
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  return (
    <TransitionContext.Provider value={{ transition, setTransition, transitions: FANCY_TRANSITIONS }}>
      {children}
    </TransitionContext.Provider>
  );
}

/** Read/set the active page transition. Requires a `<FancyTransitionProvider>` ancestor. */
export function useFancyTransition(): TransitionContextValue {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("useFancyTransition must be used within a <FancyTransitionProvider>.");
  }
  return ctx;
}

// ── The engine ───────────────────────────────────────────────────────────────

export interface FancyPageTransitionProps {
  /**
   * A value that changes on every navigation — Inertia's page `url` (or the
   * `key` from `<App>`'s children render-prop). The crossfade fires whenever it
   * changes.
   */
  pageKey: string | number;
  children: ReactNode;
  /** Force a transition, ignoring any `<FancyTransitionProvider>`. */
  transition?: FancyTransition;
  /** Crossfade duration (ms). Default `280`. */
  duration?: number;
  /** Animate the very first mount too. Default `false` (instant first paint). */
  animateInitial?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Layer {
  key: string | number;
  node: ReactNode;
  transition: FancyTransition;
}

/**
 * Crossfades between Inertia pages. Mount it AROUND the page body inside your
 * persistent layout so the chrome (nav/footer) stays static:
 *
 *   <main>
 *     <FancyPageTransition pageKey={url}>{children}</FancyPageTransition>
 *   </main>
 *
 * On each `pageKey` change it briefly holds the outgoing page (absolutely
 * positioned, animating out) while the incoming page animates in, then drops
 * the outgoing layer on `animationend`. The outgoing DOM is preserved (matched
 * by key) — no remount flash.
 */
export function FancyPageTransition({
  pageKey,
  children,
  transition,
  duration = DEFAULT_DURATION,
  animateInitial = false,
  className,
  style,
}: FancyPageTransitionProps) {
  useTransitionStyles();

  const ctx = useContext(TransitionContext);
  const active: FancyTransition = transition ?? ctx?.transition ?? "fade";
  const animate = active !== "none";

  // Latest rendered page, so we can snapshot it as the outgoing layer on nav.
  const current = useRef<{ key: string | number; node: ReactNode }>({ key: pageKey, node: children });
  const [exiting, setExiting] = useState<Layer | null>(null);
  const firstMount = useRef(true);

  // Detect navigation during render: snapshot the outgoing page, then advance.
  // (Adjusting state during render is the supported "store previous value"
  // pattern — it converges because the next render sees the keys match.)
  if (pageKey !== current.current.key) {
    const outgoing = current.current;
    current.current = { key: pageKey, node: children };
    if (animate) {
      setExiting({ key: outgoing.key, node: outgoing.node, transition: active });
    }
  } else {
    // Same page, props changed — keep the snapshot fresh for the next nav.
    current.current.node = children;
  }

  const enterAnimate = animate && (animateInitial || !firstMount.current);
  useEffect(() => {
    firstMount.current = false;
  }, []);

  return (
    <div className={className} data-fancy-pt-root style={{ position: "relative", ...style }}>
      <div
        key={pageKey}
        data-fancy-pt-layer
        data-fancy-pt-phase="enter"
        style={enterAnimate ? { animation: animationFor(active, "in", duration) } : undefined}
      >
        {children}
      </div>

      {exiting && (
        <div
          key={exiting.key}
          data-fancy-pt-layer
          data-fancy-pt-phase="exit"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            animation: animationFor(exiting.transition, "out", duration),
          }}
          onAnimationEnd={() =>
            setExiting((e) => (e && e.key === exiting.key ? null : e))
          }
        >
          {exiting.node}
        </div>
      )}
    </div>
  );
}

FancyPageTransition.displayName = "FancyPageTransition";
