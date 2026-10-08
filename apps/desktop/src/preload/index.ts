import { contextBridge, ipcRenderer } from "electron";
import type { PrintOptions, PrintResult, SavePdfResult } from "../main/printing/print";

contextBridge.exposeInMainWorld("muzammilPOS", {
  platform: process.platform,
  print: (html: string, options?: PrintOptions): Promise<PrintResult> =>
    ipcRenderer.invoke("print:html", html, options),
  savePdf: (html: string, defaultFileName: string): Promise<SavePdfResult> =>
    ipcRenderer.invoke("print:savePdf", html, defaultFileName),
});