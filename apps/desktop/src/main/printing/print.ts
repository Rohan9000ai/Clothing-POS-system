/**
 * Printing is handled entirely in the main process — the renderer has no
 * direct access to system printers (by design, for security). The renderer
 * builds a complete, self-contained HTML document (see
 * renderer/utils/receiptTemplates.ts) and sends it here over IPC; this
 * loads it into a hidden window and triggers the OS print dialog.
 */

import { ipcMain, BrowserWindow } from "electron";

export interface PrintOptions {
  silent?: boolean;
  deviceName?: string;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

export function registerPrintHandlers() {
  ipcMain.handle(
    "print:html",
    async (_event, html: string, options?: PrintOptions): Promise<PrintResult> => {
      return new Promise((resolve) => {
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: { sandbox: true },
        });

        printWindow.webContents.once("did-finish-load", () => {
          printWindow.webContents.print(
            {
              silent: options?.silent ?? false,
              printBackground: true,
              deviceName: options?.deviceName,
            },
            (success, errorType) => {
              printWindow.close();
              resolve(success ? { success: true } : { success: false, error: errorType });
            }
          );
        });

        printWindow.webContents.once("did-fail-load", () => {
          printWindow.close();
          resolve({ success: false, error: "Failed to load the print content." });
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      });
    }
  );
}