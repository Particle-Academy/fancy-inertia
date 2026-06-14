/**
 * @particle-academy/fancy-inertia
 *
 * Inertia.js integration for the fancy UI set. The exports cover the
 * friction surface between Inertia and the rest of the fancy stack:
 *
 *   - <FancyAppRoot>          composite provider (Toast + ScreenSystem + echarts)
 *   - <FancyClientOnly>       skip-SSR helper for components that need `window`
 *   - useFancyForm            Inertia useForm() wrapper shaped for react-fancy inputs
 *   - registerFancyComponents pre-registers the fancy component whitelist
 *                             for fancy-screens schema mode
 *   - <InertiaSchemaScreen>   sugar over <Screen schema={...}> reading
 *                             the schema from usePage().props
 *   - <FancyPageTransition>   zero-dep enter/exit page crossfade keyed on the
 *                             Inertia page; <FancyTransitionProvider> +
 *                             useFancyTransition power a live transition switcher
 *
 * State persistence across Inertia navigation is no longer this package's
 * job — Zustand's `persist` middleware handles it per store. See
 * /docs/Migration.md.
 */

export { FancyAppRoot } from "./FancyAppRoot";
export type { FancyAppRootProps } from "./FancyAppRoot";

export { FancyClientOnly } from "./FancyClientOnly";
export type { FancyClientOnlyProps } from "./FancyClientOnly";

export { setupFancyApp } from "./setupFancyApp";
export type { SetupFancyAppOptions } from "./setupFancyApp";

export { buildFancyAppTree } from "./buildFancyAppTree";
export type { FancyAppTreeOptions } from "./buildFancyAppTree";

export { useFancyForm } from "./useFancyForm";
export type { FancyFormBridge, FancyFieldBridge } from "./useFancyForm";

export { registerFancyComponents, getFancyComponents } from "./registerFancyComponents";
export type { ComponentRegistry, RegisterOptions } from "./registerFancyComponents";

export { InertiaSchemaScreen } from "./InertiaSchemaScreen";
export type { InertiaSchemaScreenProps } from "./InertiaSchemaScreen";

export {
  FancyPageTransition,
  FancyTransitionProvider,
  useFancyTransition,
  FANCY_TRANSITIONS,
  FANCY_TRANSITION_LABELS,
} from "./PageTransition";
export type {
  FancyTransition,
  FancyPageTransitionProps,
  FancyTransitionProviderProps,
} from "./PageTransition";
