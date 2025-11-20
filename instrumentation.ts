export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0,
      integrations: [],
      beforeSend(event) {
        if (event.level === "error") {
          // Remove IP address from server events
          if (event.request && event.request.headers) {
            delete event.request.headers["Remote-Addr"];
          }
          if (event.user && event.user.ip_address) {
            delete event.user.ip_address;
          }
          return event;
        }
        return null;
      },
      sendDefaultPii: false,
    });
  }
}
