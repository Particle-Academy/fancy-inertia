import { useEffect, useState, type ReactNode } from "react";

export interface InertiaSchemaScreenProps {
  /**
   * Inertia page-prop key holding the schema. Default `"schema"`.
   * Use this to swap to other prop names (`"layout"`, `"page"`, etc.)
   * if you have multiple schema-driven pages with different shapes.
   */
  propKey?: string;

  /** Optional fallback rendered while waiting for fancy-screens to load. */
  fallback?: ReactNode;
}

/**
 * Sugar over `<Screen schema={...} />` that pulls the schema directly
 * from Inertia's `usePage().props[propKey]`. Lets a server-side
 * controller render an entire screen with one return:
 *
 *   // PHP
 *   return Inertia::render('AgentScreen', [
 *       'schema' => $agent->screenFor($user),
 *   ]);
 *
 *   // React page component — no schema parsing needed
 *   import { InertiaSchemaScreen } from "@particle-academy/fancy-inertia";
 *   export default function AgentScreen() {
 *     return <InertiaSchemaScreen />;
 *   }
 *
 * Pairs with `registerFancyComponents()` so the schema can reference
 * any component by name without per-page registration.
 */
export function InertiaSchemaScreen({
  propKey = "schema",
  fallback = null,
}: InertiaSchemaScreenProps) {
  const [Screen, setScreen] = useState<React.ComponentType<{ schema: unknown }> | null>(null);
  const [usePageHook, setUsePage] = useState<(() => { props: Record<string, unknown> }) | null>(
    null,
  );

  useEffect(() => {
    Promise.all([
      import("@particle-academy/fancy-screens").catch(() => null),
      import("@inertiajs/react").catch(() => null),
    ]).then(([screensMod, inertiaMod]) => {
      if (!screensMod || !inertiaMod) {
        console.warn(
          "[fancy-inertia] InertiaSchemaScreen needs both @particle-academy/fancy-screens and @inertiajs/react",
        );
        return;
      }
      setScreen(() => screensMod.Screen as unknown as React.ComponentType<{ schema: unknown }>);
      setUsePage(() => (inertiaMod as unknown as { usePage: () => { props: Record<string, unknown> } }).usePage);
    });
  }, []);

  if (!Screen || !usePageHook) return <>{fallback}</>;

  return <SchemaInner Screen={Screen} usePage={usePageHook} propKey={propKey} fallback={fallback} />;
}

function SchemaInner({
  Screen,
  usePage,
  propKey,
  fallback,
}: {
  Screen: React.ComponentType<{ schema: unknown }>;
  usePage: () => { props: Record<string, unknown> };
  propKey: string;
  fallback: ReactNode;
}) {
  const page = usePage();
  const schema = page.props?.[propKey];
  if (!schema) return <>{fallback}</>;
  return <Screen schema={schema} />;
}

InertiaSchemaScreen.displayName = "InertiaSchemaScreen";
