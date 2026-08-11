import { z } from "zod";

// Placeholder only — no backend auth exists yet. This validates shape, not
// credentials, and the submit handler never calls a real auth endpoint.
export const loginFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;
