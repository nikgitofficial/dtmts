"use client";
import { useCallback, useState, type ChangeEvent } from "react";
import { FIELD_FORMAT, driverFormSchema, toForm, type DriverFormValues, type DriverKey } from "@/schemas/driver";
import { validate, type FieldErrors } from "@/lib/validation";
import type { Driver } from "@/types/driver";

/** Form state + schema validation shared by DriverModal and DriverForm. */
export function useDriverForm(driver?: Driver | null) {
  const [form, setForm] = useState<DriverFormValues>(() => toForm(driver));
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = useCallback((k: DriverKey) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }, []);

  /** Tidy a field when the user leaves it (trim, Title Case). No-op for fields without a formatter. */
  const blur = useCallback((k: DriverKey) => () => {
    const fmt = FIELD_FORMAT[k];
    if (!fmt) return;
    setForm((f) => {
      const next = fmt(f[k] as string);
      return next === f[k] ? f : { ...f, [k]: next };
    });
  }, []);

  const validateForm = useCallback(() => {
    const v = validate(driverFormSchema, form);
    setErrors(v.ok ? {} : v.errors);
    return v.ok;
  }, [form]);

  return { form, errors, set, blur, validateForm };
}