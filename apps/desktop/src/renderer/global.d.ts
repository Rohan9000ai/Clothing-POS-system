export {};

declare global {
  interface Window {
    muzammilPOS: {
      platform: string;
      print: (
        html: string,
        options?: { silent?: boolean; deviceName?: string }
      ) => Promise<{ success: boolean; error?: string }>;
    };
  }
}