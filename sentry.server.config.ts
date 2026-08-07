import * as Sentry from "@sentry/nextjs";
import { monitoringOptions } from "@/lib/monitoring-config";

Sentry.init({
  ...monitoringOptions,
  integrations: [
    Sentry.vercelAIIntegration({
      recordInputs: false,
      recordOutputs: false,
    }),
  ],
});
