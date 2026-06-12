import type { ComponentType } from "react";

export type ComponentRegistry = Record<string, ComponentType<Record<string, unknown>>>;

export interface RegisterOptions {
  /** Add chart components (EChart, EChart3D, DataDiagram, …). Requires fancy-echarts. */
  withECharts?: boolean;
  /** Append your app's own components to the registry. */
  extra?: ComponentRegistry;
  /**
   * Actually wire the registry into fancy-screens' schema engine. Default
   * `true`. Set `false` if you only want the returned map (e.g. for testing).
   */
  install?: boolean;
}

let cached: ComponentRegistry | null = null;

/**
 * Pre-registers a curated component whitelist for fancy-screens'
 * schema-driven mode AND wires it into the schema engine so
 * `<Screen schema={...}>` can resolve components by name immediately.
 *
 *   import { registerFancyComponents } from "@particle-academy/fancy-inertia";
 *
 *   // On app boot (e.g. inside createInertiaApp({ setup })):
 *   await registerFancyComponents({ withECharts: true });
 *
 *   // Later: a Laravel controller returns a schema in Inertia props.
 *   // <InertiaSchemaScreen /> renders it with no extra wiring.
 *
 * The default whitelist is intentionally minimal so the agent surface
 * stays predictable and bundles stay small. Pass `extra: {...}` to
 * register your own app-specific components.
 *
 * Returns the registry so test code can introspect it; pass
 * `install: false` to skip the side-effect on fancy-screens.
 */
export async function registerFancyComponents(
  options: RegisterOptions = {},
): Promise<ComponentRegistry> {
  const { install = true, extra, withECharts } = options;

  if (cached && extra === undefined) return cached;

  const registry: ComponentRegistry = {};

  try {
    const fancy = (await import("@particle-academy/react-fancy")) as Record<string, unknown>;
    addIfPresent(registry, fancy, [
      "Card",
      "Button",
      "Badge",
      "Heading",
      "Text",
      "Input",
      "Select",
      "Textarea",
      "Switch",
      "Checkbox",
      "Modal",
      "Callout",
      "Tabs",
      "Accordion",
      "Avatar",
      "Profile",
      "Timeline",
      "Tooltip",
      "Popover",
    ]);
    // `Action` is the legacy schema type name for the button — keep it working
    // for older agent-emitted schemas; `Button` is the canonical name.
    if (registry["Button"]) registry["Action"] = registry["Button"];
    // Card has dotted subcomponents — register them explicitly so schemas
    // can address them by their human-readable names.
    const Card = fancy.Card as { Header?: ComponentType; Body?: ComponentType; Footer?: ComponentType } | undefined;
    if (Card?.Header) registry["Card.Header"] = Card.Header as ComponentType<Record<string, unknown>>;
    if (Card?.Body) registry["Card.Body"] = Card.Body as ComponentType<Record<string, unknown>>;
    if (Card?.Footer) registry["Card.Footer"] = Card.Footer as ComponentType<Record<string, unknown>>;
  } catch (err) {
    console.warn("[fancy-inertia] @particle-academy/react-fancy not installed", err);
  }

  if (withECharts) {
    try {
      const echarts = (await import("@particle-academy/fancy-echarts")) as Record<string, unknown>;
      addIfPresent(registry, echarts, ["EChart", "EChart3D", "DataDiagram", "Flowchart", "Mindmap", "OrgChart"]);
    } catch (err) {
      console.warn("[fancy-inertia] @particle-academy/fancy-echarts not installed", err);
    }
  }

  if (extra) {
    Object.assign(registry, extra);
  }

  if (install) {
    try {
      const screens = (await import("@particle-academy/fancy-screens")) as {
        registerSchemaComponents?: (entries: ComponentRegistry) => void;
      };
      screens.registerSchemaComponents?.(registry);
    } catch (err) {
      console.warn(
        "[fancy-inertia] @particle-academy/fancy-screens not installed; schema components not wired",
        err,
      );
    }
  }

  cached = extra === undefined ? registry : cached;
  return registry;
}

/** Returns the cached registry from the last `registerFancyComponents` call. */
export function getFancyComponents(): ComponentRegistry | null {
  return cached;
}

function addIfPresent(
  target: ComponentRegistry,
  source: Record<string, unknown>,
  names: string[],
): void {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "function" || (typeof value === "object" && value !== null)) {
      target[name] = value as ComponentType<Record<string, unknown>>;
    }
  }
}
