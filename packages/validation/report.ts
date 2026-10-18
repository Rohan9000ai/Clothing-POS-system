import { z } from "zod";

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

/**
 * One query shape for every report (sales, expenses, financial).
 * topN means: top products (sales report), largest expenses (expense report),
 * products missing a cost price (financial report).
 */
export const reportQuerySchema = z
  .object({
    period: z.enum(["day", "week", "month", "custom"]).default("day"),
    /** Any day inside the wanted day/week/month. Defaults to today. */
    date: ymdSchema.optional(),
    /** Only for period=custom. */
    dateFrom: ymdSchema.optional(),
    dateTo: ymdSchema.optional(),
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
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const salesReportQuerySchema = reportQuerySchema;
export const expenseReportQuerySchema = reportQuerySchema;
export const financialReportQuerySchema = reportQuerySchema;
export type SalesReportQuery = ReportQuery;
export type ExpenseReportQuery = ReportQuery;
export type FinancialReportQuery = ReportQuery;
export const stockReportQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  topN: z.coerce.number().int().min(1).max(50).default(10),
});
export type StockReportQuery = z.infer<typeof stockReportQuerySchema>;

/** Receivables and payables are "as of now" snapshots and take no filters. */
export const snapshotReportQuerySchema = z.object({});