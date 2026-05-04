/**
 * @particle-academy/fancy-inertia
 *
 * Inertia.js integration for the fancy UI set.
 *
 * Six exports cover the friction surface between Inertia and fancy:
 *   - <FancyAppRoot> — composite provider (Toast.Provider + Screen.System
 *     + echarts module registration)
 *   - <FancyClientOnly> — skip-SSR helper for components that need `window`
 *   - useFancyForm — Inertia useForm() wrapper shaped for react-fancy inputs
 *   - usePersistFancyState — preserves fancy-screens port store across
 *     Inertia navigations
 *   - registerFancyComponents — pre-registers the fancy component
 *     whitelist for fancy-screens schema mode
 *   - <InertiaSchemaScreen> — sugar over <Screen schema={...} /> reading
 *     the schema from usePage().props
 */

export { FancyAppRoot } from "./FancyAppRoot";
export type { FancyAppRootProps } from "./FancyAppRoot";

export { FancyClientOnly } from "./FancyClientOnly";
export type { FancyClientOnlyProps } from "./FancyClientOnly";

export { useFancyForm } from "./useFancyForm";
export type { FancyFormBridge, FancyFieldBridge } from "./useFancyForm";

export { usePersistFancyState } from "./usePersistFancyState";
export type { PersistOptions } from "./usePersistFancyState";

export { registerFancyComponents, getFancyComponents } from "./registerFancyComponents";
export type { ComponentRegistry, RegisterOptions } from "./registerFancyComponents";

export { InertiaSchemaScreen } from "./InertiaSchemaScreen";
export type { InertiaSchemaScreenProps } from "./InertiaSchemaScreen";
