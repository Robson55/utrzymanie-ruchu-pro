/**
 * Centralized error handler that sanitizes error output in production.
 * In development, full error details are logged. In production, only
 * a generic context message is logged to prevent information leakage.
 */
export const logError = (context: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    // In production, log only the context without sensitive details
    console.error(`[${context}] An error occurred`);
  }
};
