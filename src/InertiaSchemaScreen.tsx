import { usePage } from "@inertiajs/react";
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
// Type-only import — erased at build, so it adds NO runtime edge to the
// optional `fancy-screens` peer. The value (`Screen`) is loaded lazily below.
import type { ScreenSchema } from "@particle-academy/fancy-screens";

type ScreenComp = ComponentType<{ id?: string; title?: string; schema: ScreenSchema }>;
// Renders nothing if fancy-screens is absent — InertiaSchemaScreen needs it.
const ScreenUnavailable: ScreenComp = () => null;

const ScreenLazy = lazy<ScreenComp>(() =>
  import("@particle-academy/fancy-screens")
    .then((m) => {
      // Guard a resolved-but-absent export (a bundler's stub for a missing
      // optional peer is { default: undefined } → React #306), not just rejection.
      const Comp = (m as { Screen?: ScreenComp })?.Screen;
      if (!Comp) {
        console.warn("[fancy-inertia] <InertiaSchemaScreen> needs @particle-academy/fancy-screens, which isn't available.");
        return { default: ScreenUnavailable };
      }
      return { default: Comp };
    })
    .catch((err) => {
      console.warn("[fancy-inertia] <InertiaSchemaScreen> needs @particle-academy/fancy-screens, which isn't available.", err);
      return { default: ScreenUnavailable };
    }),
);

export interface InertiaSchemaScreenProps {
  /**
   * Inertia page-prop key holding the schema. Default `"schema"`. Override
   * if you have multiple schema-driven pages keyed under different names.
   */
  propKey?: string;

  /** Optional fallback rendered when the prop is missing or empty. */
  fallback?: ReactNode;

  /**
   * Screen id for the rendered surface. Default `"inertia-schema"`. Override
   * when you have multiple schema-driven screens mounted at once.
   */
  screenId?: string;

  /** Optional title for the rendered screen. */
  title?: string;
}

/**
 * Sugar over `<Screen schema={...} />` that pulls the schema directly
 * from Inertia's `usePage().props[propKey]`. The whole React page becomes
 * one line when paired with a server-side controller (typically an
 * agent-driven one) that emits the schema:
 *
 *   // PHP
 *   return Inertia::render('AgentScreen', [
 *       'schema' => $agent->buildPageFor($user),
 *   ]);
 *
 *   // React
 *   import { InertiaSchemaScreen } from "@particle-academy/fancy-inertia";
 *   export default () => <InertiaSchemaScreen />;
 *
 * Requires the optional `@particle-academy/fancy-screens` peer (loaded
 * lazily, so it never enters the base import graph). Pairs with
 * `registerFancyComponents()` — call that once at app boot so the schema
 * can reference any component by name without per-page wiring.
 */
export function InertiaSchemaScreen({
  propKey = "schema",
  fallback = null,
  screenId = "inertia-schema",
  title,
}: InertiaSchemaScreenProps) {
  const page = usePage();
  const schema = page.props?.[propKey] as ScreenSchema | undefined;

  if (!schema) return <>{fallback}</>;

  return (
    <Suspense fallback={fallback}>
      <ScreenLazy id={screenId} title={title} schema={schema} />
    </Suspense>
  );
}

InertiaSchemaScreen.displayName = "InertiaSchemaScreen";
