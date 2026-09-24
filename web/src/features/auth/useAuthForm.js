import { useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHAKE = [
  { transform: "translateX(0)" },
  { transform: "translateX(-7px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(0)" },
];

// Form state for login and signup. Values live in AuthLayout, so they survive the page switch.
export function useAuthForm() {
  const { values, setField } = useOutletContext();
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const formRef = useRef(null);
  const reduceMotion = usePrefersReducedMotion();

  function update(field) {
    return (event) => {
      setField(field, event.target.value);
      if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    };
  }

  function validate() {
    const next = {};
    if (!values.email.trim()) next.email = "Enter your email address.";
    else if (!EMAIL.test(values.email.trim()))
      next.email = "Enter an email like name@example.com.";
    if (!values.password) next.password = "Enter your password.";
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    if (!ok && !reduceMotion)
      formRef.current?.animate(SHAKE, { duration: 320, easing: "ease-out" });
    return ok;
  }

  return { values, errors, status, setStatus, update, validate, formRef };
}
