import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://77c609423ba11d3ad7dbe2e47390c9950e04511485796483072.ingest.us.sentry.io/4511485815685120",
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
})
