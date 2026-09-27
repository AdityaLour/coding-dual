import { useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { ApiError, errorMessage } from "@/shared/api/client.js";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";

const SHAKE = [
  { transform: "translateX(0)" },
  { transform: "translateX(-7px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(0)" },
];

// Form state for every auth page. Values live in AuthLayout, so they survive page switches.
export function useAuthForm() {
  const { values, setField } = useOutletContext();
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // { tone: "error" | "info", text }
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const formRef = useRef(null);
  const reduceMotion = usePrefersReducedMotion();

  function flagErrors(next) {
    setErrors(next);
    if (!reduceMotion)
      formRef.current?.animate(SHAKE, { duration: 320, easing: "ease-out" });
    // Move focus to the first field with a problem, once it has rendered.
    setTimeout(() =>
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus(),
    );
  }

  function update(field) {
    return (event) => {
      setField(field, event.target.value);
      if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    };
  }

  // rules: { field: (value) => message | null }
  function validate(fieldRules) {
    const next = {};
    for (const [field, rule] of Object.entries(fieldRules)) {
      const message = rule(values[field] ?? "");
      if (message) next[field] = message;
    }
    if (Object.keys(next).length > 0) {
      flagErrors(next);
      return false;
    }
    setErrors({});
    return true;
  }

  // Runs one request at a time. Field errors from the server land on their fields; anything
  // else becomes the status message. onError can claim an error (return true) to handle it itself.
  async function submit(request, { pending, onError } = {}) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setStatus(pending ? { tone: "info", text: pending } : null);
    try {
      await request();
    } catch (error) {
      setStatus(null);
      if (onError?.(error)) return;
      if (error instanceof ApiError && error.data?.errors)
        flagErrors(error.data.errors);
      else setStatus({ tone: "error", text: errorMessage(error) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return {
    values,
    setField,
    errors,
    status,
    setStatus,
    busy,
    update,
    validate,
    submit,
    formRef,
  };
}
