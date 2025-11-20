import { z } from "zod";

export const getTrialUsersSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val) : 1;
      if (isNaN(parsed) || parsed < 1) {
        throw new Error("Invalid page number");
      }
      return parsed;
    }),
  search: z.string().optional().default(""),
});

export type GetTrialUsersInput = z.infer<typeof getTrialUsersSchema>;
