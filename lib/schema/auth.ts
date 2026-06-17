import { z } from "zod";

/**
 * Zod schemas for the auth surface. Every Server Action validates its input
 * with one of these before touching Supabase (CLAUDE.md: Zod-validate all
 * inputs). Messages are in the app's voice — specific and fixable.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address.");

// Sign-in accepts any non-empty password (strength is enforced at sign-up).
export const passwordSchema = z.string().min(1, "Enter your password.");

// Sign-up enforces a minimum strength.
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords can be at most 72 characters."); // bcrypt's byte ceiling

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  fullName: z.string().trim().min(1, "Enter your name.").max(120).optional(),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const oauthProviderSchema = z.enum(["google"]);

export const ssoSchema = z.object({
  // Enterprise SSO is keyed by the email domain registered with the IdP.
  domain: z
    .string()
    .trim()
    .min(1, "Enter your organization's email domain.")
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Enter a valid domain, e.g. acme.com."),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
