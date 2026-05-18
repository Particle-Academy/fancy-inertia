import { usePage } from "@inertiajs/react";
import { Screen, type ScreenSchema } from "@particle-academy/fancy-screens";
import type { ReactNode } from "react";

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
 * Pairs with `registerFancyComponents()` — call that once at app boot so
 * the schema can reference any component by name without per-page wiring.
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

  return <Screen id={screenId} title={title} schema={schema} />;
}

InertiaSchemaScreen.displayName = "InertiaSchemaScreen";
