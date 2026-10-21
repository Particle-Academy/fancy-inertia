/**
 * @particle-academy/fancy-inertia/stack
 *
 * fancy-app-update's stacked refresh notice -- the release's feature cards
 * stacked like react-fancy's `Toast.Stack`, each with a close button and a
 * "Refresh to get the latest" action -- with fancy-inertia's Inertia version
 * check as its default detector, exactly as `AppUpdateAlert` has.
 *
 * A separate entry, mirroring `@particle-academy/fancy-app-update/stack`: it is
 * built from react-fancy's `Toast.Stack` (react-fancy >=5.41.0), so the package
 * root keeps working on older react-fancy versions and apps that never show a
 * stack never load it.
 */
import { Toast } from "@particle-academy/react-fancy";
import {
  AppUpdateStack as CoreAppUpdateStack,
  type AppUpdateStackProps,
} from "@particle-academy/fancy-app-update/stack";
import { inertiaDefaultCheck, useInertiaVersionCheck } from "./useInertiaVersionCheck";

export type {
  AppUpdateStackProps,
  AppUpdateStackApi,
  AppUpdateStackPosition,
  AppUpdateFeature,
  AppUpdateFeatures,
} from "@particle-academy/fancy-app-update/stack";

export { useInertiaVersionCheck } from "./useInertiaVersionCheck";
export type { InertiaVersionCheckOptions } from "./useInertiaVersionCheck";

let warnedNoStack = false;

/**
 * Drop-in "a new version is available" notice that can say what is new.
 * Every prop is fancy-app-update's `AppUpdateStack` prop and goes straight
 * through; only the default detector differs (the Inertia 409 ping). Pass
 * `check`, or `currentVersion` + `latestVersion`, to override it.
 *
 * Mount it once, inside Inertia's `<App>` -- the easiest way is
 * `setupFancyApp({ appUpdate: <AppUpdateStack ... /> })`.
 *
 * ```tsx
 * import { AppUpdateStack } from "@particle-academy/fancy-inertia/stack";
 *
 * <AppUpdateStack />                                             // plain notice
 * <AppUpdateStack features={() => fetch("/whats-new").then((r) => r.json())} />
 * ```
 */
export function AppUpdateStack(props: AppUpdateStackProps) {
  const inertiaCheck = useInertiaVersionCheck({ pingUrl: props.pingUrl });
  const check = inertiaDefaultCheck(props, inertiaCheck);

  // npm cannot give one subpath its own peer floor, so an app on react-fancy
  // < 5.41.0 can import this entry. Say what it needs instead of letting React
  // throw "element type is invalid" -- an update notice is never worth the page.
  if ((Toast as { Stack?: unknown } | undefined)?.Stack == null) {
    if (!warnedNoStack) {
      warnedNoStack = true;
      console.error(
        "[fancy-inertia] AppUpdateStack needs @particle-academy/react-fancy >=5.41.0 (Toast.Stack); " +
          "the installed version has none, so the notice is not shown. Upgrade react-fancy, or use AppUpdateAlert.",
      );
    }
    return null;
  }

  return <CoreAppUpdateStack {...props} check={check} />;
}

AppUpdateStack.displayName = "AppUpdateStack";
