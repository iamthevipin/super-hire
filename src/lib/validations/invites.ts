import { z } from 'zod';

export const inviteSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  role: z.enum(['admin', 'member']),
});

export type InviteSchema = z.infer<typeof inviteSchema>;
