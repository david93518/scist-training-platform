import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/sentry";

Sentry.init({
  ...sentryInitOptions(),
  // 高中生瀏覽器不上 Session Replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
