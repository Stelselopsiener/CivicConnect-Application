/**
 * Form validation — DESIGN PATTERN: Strategy.
 *
 * Each rule is a small interchangeable function `(value, allValues) => message | null`.
 * A schema lists the rules that apply to each field, and `validate` runs whichever rules it is
 * given. Adding a rule never means editing `validate` or a form component.
 *
 * These are the UI-layer checks of PED §12.3 (layer 1). The API and the database repeat them
 * (layers 2 and 3); the UI copy exists to give immediate, specific feedback (WCAG 3.3.1/3.3.3).
 */
import { isKnownCategory } from "./categories";

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 1000;
export const PASSWORD_MIN = 8;

export const rules = {
  required: (message) => (value) =>
    String(value ?? "").trim() ? null : message,
  maxLength: (max, message) => (value) =>
    String(value ?? "").length <= max ? null : message,
  minLength: (min, message) => (value) =>
    String(value ?? "").length >= min ? null : message,
  email: (message) => (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim())
      ? null
      : message,
  oneOf: (isAllowed, message) => (value) => (isAllowed(value) ? null : message),
  sameAs: (otherField, message) => (value, all) =>
    value === all[otherField] ? null : message,
  /** Optional date that may not be earlier than another field's date. */
  notBefore: (otherField, message) => (value, all) => {
    if (!value || !all[otherField]) return null;
    return value >= all[otherField] ? null : message(all[otherField]);
  },
  notInFuture: (message) => (value) => {
    if (!value) return null;
    return value <= new Date().toLocaleDateString("en-CA") ? null : message;
  },
};

/**
 * Runs a schema against form values.
 * @returns {{ valid: boolean, errors: Record<string,string>, list: {field:string,message:string}[] }}
 *   `errors` feeds each field; `list` (in schema order) feeds the error summary.
 */
export function validate(values, schema) {
  const errors = {};
  const list = [];
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of fieldRules) {
      const message = rule(values[field], values);
      if (message) {
        errors[field] = message;
        list.push({ field, message });
        break; // first failing rule per field: one clear instruction at a time
      }
    }
  }
  return { valid: list.length === 0, errors, list };
}

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** REQ-001 to REQ-003, CR-001 (single street address), CR-002 (no contact number). */
export const requestSchema = {
  category: [
    rules.oneOf(
      isKnownCategory,
      "Choose the category that fits best. Staff can correct it later.",
    ),
  ],
  title: [
    rules.required(
      'Enter a short title, for example "Broken tap in hall kitchen".',
    ),
    rules.maxLength(
      TITLE_MAX,
      `Shorten the title to ${TITLE_MAX} characters or fewer.`,
    ),
  ],
  description: [
    rules.required("Describe the problem so staff know what to look for."),
    rules.maxLength(
      DESCRIPTION_MAX,
      `Shorten the description to ${DESCRIPTION_MAX} characters or fewer.`,
    ),
  ],
  streetAddress: [
    rules.required(
      "Enter a street address or a landmark staff will recognise.",
    ),
  ],
  startDate: [
    rules.required("Enter the date the problem started."),
    rules.notInFuture("The start date cannot be in the future."),
  ],
  endDate: [
    rules.notBefore(
      "startDate",
      (start) =>
        `End date cannot be before the start date (${formatDate(start)}). Leave it empty if the problem is ongoing.`,
    ),
  ],
};

/** REQ-023, REQ-030: name, email and password only. */
export const registerSchema = {
  name: [rules.required("Enter your full name.")],
  email: [
    rules.required("Enter your email address."),
    rules.email("Enter an email address like name@example.org."),
  ],
  password: [
    rules.required("Choose a password."),
    rules.minLength(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`),
  ],
  confirmPassword: [
    rules.sameAs(
      "password",
      "The two passwords do not match. Retype the second one.",
    ),
  ],
};

export const signInSchema = {
  email: [
    rules.required("Enter your email address."),
    rules.email("Enter an email address like name@example.org."),
  ],
  password: [rules.required("Enter your password.")],
};
