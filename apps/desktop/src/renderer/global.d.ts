export {};

declare global {
  interface Window {
    muzammilPOS: {
      platform: string;
      print: (
        html: string,
        options?: { silent?: boolean; deviceName?: string }
      ) => Promise<{ success: boolean; error?: string }>;
      savePdf: (
        html: string,
        defaultFileName: string
      ) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
    };
  }
}