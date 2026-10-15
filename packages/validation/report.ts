import { z } from "zod";

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

export const salesReportQuerySchema = z
  .object({
    period: z.enum(["day", "week", "month", "custom"]).default("day"),
    /** Any day inside the wanted day/week/month. Defaults to today. */
    date: ymdSchema.optional(),
    /** Only for period=custom. */
    dateFrom: ymdSchema.optional(),
    dateTo: ymdSchema.optional(),
    /** How many products to list in the top-selling tables. */
    topN: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((data, ctx) => {
    if (data.period === "custom") {
      if (!data.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateFrom"],
          message: "dateFrom is required for a custom range.",
        });
      }
      if (!data.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateTo"],
          message: "dateTo is required for a custom range.",
        });
      }
    }
  });
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;