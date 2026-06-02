// Type declaration for Clerk's global window.Clerk
// This prevents TS errors when accessing window.Clerk.session.getToken()

export {};

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(): Promise<string | null>;
      };
    };
  }
}
