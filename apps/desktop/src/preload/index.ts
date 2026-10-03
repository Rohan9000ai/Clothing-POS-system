import { contextBridge, ipcRenderer } from "electron";
import type { PrintOptions, PrintResult } from "../main/printing/print";

contextBridge.exposeInMainWorld("muzammilPOS", {
  platform: process.platform,
  print: (html: string, options?: PrintOptions): Promise<PrintResult> =>
    ipcRenderer.invoke("print:html", html, options),
});