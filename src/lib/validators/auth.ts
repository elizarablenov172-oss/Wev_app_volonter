import { z } from "zod";

/** Роли, доступные для самостоятельной регистрации (ADMIN — нельзя). */
export const SELF_SIGNUP_ROLES = ["VOLUNTEER", "ORGANIZATION", "PARTNER"] as const;

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Некорректный e-mail"),
    password: z.string().min(6, "Минимум 6 символов"),
    displayName: z.string().trim().min(2, "Минимум 2 символа").max(80),
    role: z.enum(SELF_SIGNUP_ROLES),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    nickname: z
      .string()
      .trim()
      .min(2, "Минимум 2 символа")
      .max(40)
      .optional()
      .or(z.literal("")),
    // Название организации (role=ORGANIZATION)
    orgName: z.string().trim().max(120).optional().or(z.literal("")),
    // Бренд партнёра (role=PARTNER)
    brandName: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.role === "ORGANIZATION" && !data.orgName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orgName"],
        message: "Укажите название организации",
      });
    }
    if (data.role === "PARTNER" && !data.brandName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["brandName"],
        message: "Укажите название бренда",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректный e-mail"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginInput = z.infer<typeof loginSchema>;
