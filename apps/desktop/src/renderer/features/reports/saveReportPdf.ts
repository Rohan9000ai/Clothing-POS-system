import { useToastStore } from "../../store/toastStore";

/** Builds the report HTML, opens the native save dialog and reports the result with a toast. */
export async function saveReportPdf(build: () => string, fileName: string, successMessage: string): Promise<void> {
  const push = useToastStore.getState().push;
  try {
    const html = build();
    const result = await window.muzammilPOS.savePdf(html, fileName);
    if (result.success) push("success", successMessage);
    else if (!result.canceled) push("error", result.error ?? "Could not create the PDF. Please try again.");
  } catch (err) {
    push("error", err instanceof Error ? err.message : "Could not create the PDF. Please try again.");
  }
}