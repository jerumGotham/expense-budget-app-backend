import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),

    currentPassword: z.string().optional(),

    newPassword: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) {
        return false;
      }

      return true;
    },
    {
      message: "Current password is required.",
      path: ["currentPassword"],
    },
  );

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
