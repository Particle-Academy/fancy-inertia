import type { ComponentType } from "react";

export type ComponentRegistry = Record<string, ComponentType<unknown>>;

export interface RegisterOptions {
  /** Add chart components (EChart). Requires fancy-echarts installed. */
  withECharts?: boolean;
  /** Add Screen primitives (Screen.Body, Screen.Port). Requires fancy-screens. */
  withScreens?: boolean;
  /** Append your app's own components to the registry. */
  extra?: ComponentRegistry;
}

let cached: ComponentRegistry | null = null;

/**
 * Pre-registers a curated component whitelist for fancy-screens'
 * schema-driven mode. Call once on app boot — typically inside
 * `createInertiaApp({ setup })` or your equivalent app-shell init.
 *
 *   import { registerFancyComponents } from "@particle-academy/fancy-inertia";
 *   import { Screen } from "@particle-academy/fancy-screens";
 *
 *   const registry = await registerFancyComponents({ withECharts: true });
 *   Screen.registerComponents?.(registry);
 *
 * After registration, server-supplied schemas can reference any
 * component in the registry by name:
 *
 *   { component: "Card", props: { ... }, children: [
 *     { component: "Chart", props: { from: "@dashboard.timeseries" } }
 *   ] }
 *
 * The default whitelist is intentionally minimal (Card, Action, Badge,
 * Heading, Text, Table, Input, Select, Modal, Callout) to keep the
 * agent surface predictable and bundles small. Pass `extra: {...}` to
 * register your own app-specific components.
 */
export async function registerFancyComponents(
  options: RegisterOptions = {},
): Promise<ComponentRegistry> {
  if (cached && options.extra === undefined) return cached;

  const registry: ComponentRegistry = {};

  // react-fancy core (always included; the package is the raison d'être).
  try {
    const fancy = (await import("@particle-academy/react-fancy")) as Record<string, unknown>;
    addIfPresent(registry, fancy, [
      "Card",
      "Action",
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
  } catch (err) {
    console.warn("[fancy-inertia] @particle-academy/react-fancy not installed", err);
  }

  if (options.withECharts) {
    try {
      const echarts = (await import("@particle-academy/fancy-echarts")) as Record<string, unknown>;
      addIfPresent(registry, echarts, ["EChart", "EChart3D", "DataDiagram", "Flowchart", "Mindmap", "OrgChart"]);
    } catch (err) {
      console.warn("[fancy-inertia] @particle-academy/fancy-echarts not installed", err);
    }
  }

  if (options.withScreens) {
    try {
      const screens = (await import("@particle-academy/fancy-screens")) as Record<string, unknown>;
      addIfPresent(registry, screens, ["Screen"]);
    } catch (err) {
      console.warn("[fancy-inertia] @particle-academy/fancy-screens not installed", err);
    }
  }

  if (options.extra) {
    Object.assign(registry, options.extra);
  }

  cached = options.extra === undefined ? registry : cached;
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
      target[name] = value as ComponentType<unknown>;
    }
  }
}
