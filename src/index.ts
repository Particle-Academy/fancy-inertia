/**
 * @particle-academy/fancy-inertia
 *
 * Inertia.js integration for the fancy UI set. Five exports cover the
 * friction surface between Inertia and the rest of the fancy stack:
 *
 *   - <FancyAppRoot>          composite provider (Toast + ScreenSystem + echarts)
 *   - <FancyClientOnly>       skip-SSR helper for components that need `window`
 *   - useFancyForm            Inertia useForm() wrapper shaped for react-fancy inputs
 *   - registerFancyComponents pre-registers the fancy component whitelist
 *                             for fancy-screens schema mode
 *   - <InertiaSchemaScreen>   sugar over <Screen schema={...}> reading
 *                             the schema from usePage().props
 *
 * State persistence across Inertia navigation is no longer this package's
 * job — Zustand's `persist` middleware handles it per store. See
 * /docs/Migration.md.
 */

export { FancyAppRoot } from "./FancyAppRoot";
export type { FancyAppRootProps } from "./FancyAppRoot";

export { FancyClientOnly } from "./FancyClientOnly";
export type { FancyClientOnlyProps } from "./FancyClientOnly";

export { useFancyForm } from "./useFancyForm";
export type { FancyFormBridge, FancyFieldBridge } from "./useFancyForm";

export { registerFancyComponents, getFancyComponents } from "./registerFancyComponents";
export type { ComponentRegistry, RegisterOptions } from "./registerFancyComponents";

export { InertiaSchemaScreen } from "./InertiaSchemaScreen";
export type { InertiaSchemaScreenProps } from "./InertiaSchemaScreen";
