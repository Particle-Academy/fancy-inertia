import { useCallback } from "react";
import { useForm as inertiaUseForm } from "@inertiajs/react";

/**
 * Per-field bridge returned by `useFancyForm().field(name)`. Shaped to
 * drop directly into react-fancy form components without further
 * wiring.
 */
export interface FancyFieldBridge<T = unknown> {
  /** Pass to `<Input value={...} />` — current field value (string). */
  value: T;
  /** Pass to `<Input onChange={...} />`. Accepts the React event *or* a raw value (Select, Switch). */
  onChange: (e: React.ChangeEvent<HTMLInputElement> | T) => void;
  /** Pass to `<Input error={...} />` — last server validation error for this field. */
  error?: string;
  /** True while a submit is in flight. */
  loading?: boolean;
  /** Stable name attribute. */
  name: string;
}

/**
 * Bridge type returned by useFancyForm. Wraps Inertia's `useForm()` and
 * adds a `field(name)` helper that returns props ready to spread into
 * react-fancy's `<Input>`, `<Select>`, `<Switch>`, `<Textarea>`, etc.
 */
export interface FancyFormBridge<TData extends Record<string, unknown>> {
  data: TData;
  setData: <K extends keyof TData>(key: K, value: TData[K]) => void;
  errors: Partial<Record<keyof TData, string>>;
  processing: boolean;

  /**
   * Returns `{ value, onChange, error, loading, name }` for a field.
   * `onChange` accepts both a React change event (native input/textarea)
   * and a raw value (Select/Switch/MultiSwitch which pass the new value
   * directly).
   */
  field<K extends keyof TData & string>(name: K): FancyFieldBridge<TData[K]>;

  /** Forwarded from Inertia's useForm. */
  submit: (method: string, url: string, options?: object) => void;
  post: (url: string, options?: object) => void;
  put: (url: string, options?: object) => void;
  patch: (url: string, options?: object) => void;
  delete: (url: string, options?: object) => void;
  reset: (...fields: Array<keyof TData>) => void;
  clearErrors: (...fields: Array<keyof TData>) => void;
}

/**
 * Inertia's `useForm()` shape (loose typing — we don't import @inertiajs
 * statically since it's an optional peer when fancy-inertia is used
 * outside of Inertia for code-sharing reasons).
 */
type InertiaForm<T> = {
  data: T;
  setData: (key: keyof T, value: unknown) => void;
  errors: Partial<Record<keyof T, string>>;
  processing: boolean;
  submit: (method: string, url: string, options?: object) => void;
  post: (url: string, options?: object) => void;
  put: (url: string, options?: object) => void;
  patch: (url: string, options?: object) => void;
  delete: (url: string, options?: object) => void;
  reset: (...fields: Array<keyof T>) => void;
  clearErrors: (...fields: Array<keyof T>) => void;
};

/**
 * Wraps Inertia's `useForm()` so each field can be wired into react-fancy
 * inputs in one line:
 *
 *   const form = useFancyForm({ name: "", email: "" });
 *   <Input {...form.field("name")} placeholder="Name" />
 *   <Input {...form.field("email")} placeholder="Email" />
 *   <Button onClick={() => form.post("/users")}>Save</Button>
 *
 * Call signature mirrors `useForm()` from @inertiajs/react. Pass either
 * the initial values, or the result of `useForm(...)` if you've already
 * called it (lets you compose with library-supplied form objects):
 *
 *   const inertiaForm = useForm({ name: "" });
 *   const form = useFancyForm(inertiaForm);
 */
export function useFancyForm<TData extends Record<string, unknown>>(
  initialOrForm: TData | InertiaForm<TData>,
): FancyFormBridge<TData> {
  // If the consumer already called useForm() and passed the result in, re-use
  // it; otherwise instantiate one here.
  //
  // The shim is called UNCONDITIONALLY and at the top level. It used to live
  // inside a useMemo keyed on `initialOrForm`, which meant Inertia's useForm ran
  // only when that memo recomputed. Pass a stable reference — a module-level
  // constant, or anything memoised — and the memo is cached from the second
  // render on, the inner hooks are skipped, React's hook order desyncs, and the
  // next render dies with "Cannot read properties of undefined (reading
  // 'length')" from deep inside React.
  //
  // It hid well: every call site that passes an inline object literal gets a new
  // reference each render, so the memo always recomputed and the hooks always
  // ran. Only callers doing the tidier thing were affected.
  const provided = isInertiaForm<TData>(initialOrForm) ? initialOrForm : null;

  // EMPTY_INITIAL is module-level and therefore stable, so this costs one idle
  // Inertia form when a caller supplied their own. Rules of Hooks over
  // micro-optimisation: the alternative is a conditional hook.
  const shim = useInertiaFormShim<TData>(
    (provided ? EMPTY_INITIAL : initialOrForm) as TData,
  );

  const form: InertiaForm<TData> = provided ?? shim;

  const field = useCallback(
    <K extends keyof TData & string>(name: K): FancyFieldBridge<TData[K]> => ({
      name,
      value: form.data[name],
      onChange: (e) => {
        const next =
          e !== null && typeof e === "object" && "target" in (e as object)
            ? ((e as React.ChangeEvent<HTMLInputElement>).target as HTMLInputElement & {
                checked?: boolean;
                type?: string;
              })
            : null;
        if (next) {
          const value = next.type === "checkbox" ? next.checked : next.value;
          form.setData(name, value as unknown as TData[K]);
        } else {
          form.setData(name, e as unknown as TData[K]);
        }
      },
      error: form.errors[name],
      loading: form.processing,
    }),
    [form],
  );

  return {
    data: form.data,
    setData: form.setData as FancyFormBridge<TData>["setData"],
    errors: form.errors,
    processing: form.processing,
    field,
    submit: form.submit,
    post: form.post,
    put: form.put,
    patch: form.patch,
    delete: form.delete,
    reset: form.reset,
    clearErrors: form.clearErrors,
  };
}

function isInertiaForm<T>(x: unknown): x is InertiaForm<T> {
  return (
    typeof x === "object" &&
    x !== null &&
    "data" in (x as object) &&
    "setData" in (x as object) &&
    "errors" in (x as object) &&
    "processing" in (x as object)
  );
}

/**
 * Stable placeholder for the case where the caller supplied their own form.
 * Module-level so the reference never changes between renders.
 */
const EMPTY_INITIAL = Object.freeze({}) as Record<string, unknown>;

function useInertiaFormShim<TData extends Record<string, unknown>>(initial: TData): InertiaForm<TData> {
  return inertiaUseForm(initial as any) as unknown as InertiaForm<TData>;
}
