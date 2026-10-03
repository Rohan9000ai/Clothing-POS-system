import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./windows/createMainWindow";
import { registerPrintHandlers } from "./printing/print";

app.whenReady().then(() => {
  registerPrintHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});