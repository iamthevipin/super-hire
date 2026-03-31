import { z } from "zod";

export const EMPLOYEE_COUNT_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export const createEnterpriseSchema = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be 100 characters or less"),
  website_url: z
    .string()
    .url("Enter a valid URL (e.g. https://yourcompany.com)")
    .optional()
    .or(z.literal("")),
  employee_count: z.enum(EMPLOYEE_COUNT_OPTIONS, {
    error: "Please select a team size",
  }),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
});

export type CreateEnterpriseSchema = z.infer<typeof createEnterpriseSchema>;
