import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("muzammilPOS", {
  platform: process.platform,
});