/**
 * Printing and PDF export are handled entirely in the main process. The
 * renderer has no direct access to printers or the file system (by design,
 * for security). It builds a complete, self-contained HTML document and
 * sends it here over IPC.
 */

import { ipcMain, BrowserWindow, dialog } from "electron";
import { promises as fs } from "fs";

export interface PrintOptions {
  silent?: boolean;
  deviceName?: string;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface SavePdfResult {
  success: boolean;
  /** True when the user closed the save dialog without choosing a file. */
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

const PDF_FOOTER_TEMPLATE = `
  <div style="font-size:9px; width:100%; text-align:center; color:#6b7280; font-family:Arial,sans-serif;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

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

  ipcMain.handle(
    "print:savePdf",
    async (event, html: string, defaultFileName: string): Promise<SavePdfResult> => {
      const parentWindow = BrowserWindow.fromWebContents(event.sender);
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true },
      });

      try {
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        const pdfBuffer = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          preferCSSPageSize: true, // honors @page size/margins in the report HTML
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate: PDF_FOOTER_TEMPLATE,
        });

        const saveOptions = {
          title: "Save PDF",
          defaultPath: defaultFileName,
          filters: [{ name: "PDF document", extensions: ["pdf"] }],
        };
        const { canceled, filePath } = parentWindow
          ? await dialog.showSaveDialog(parentWindow, saveOptions)
          : await dialog.showSaveDialog(saveOptions);

        if (canceled || !filePath) {
          return { success: false, canceled: true };
        }

        await fs.writeFile(filePath, pdfBuffer);
        return { success: true, filePath };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      } finally {
        pdfWindow.close();
      }
    }
  );
}