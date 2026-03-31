import { z } from "zod";

const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
];

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .refine((email) => {
      const domain = email.split("@")[1]?.toLowerCase();
      return domain !== undefined && !DISPOSABLE_EMAIL_DOMAINS.includes(domain);
    }, "Please use a valid email address"),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only numbers"),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;
export type OtpSchema = z.infer<typeof otpSchema>;
