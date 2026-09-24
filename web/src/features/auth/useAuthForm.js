import { useState } from "react";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared field state + client-side checks for the login and signup forms.
export function useAuthForm() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  function update(field) {
    return (event) => {
      setValues((v) => ({ ...v, [field]: event.target.value }));
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
    return Object.keys(next).length === 0;
  }

  return { values, errors, status, setStatus, update, validate };
}
