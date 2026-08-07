import * as Sentry from "@sentry/nextjs";
import { monitoringOptions } from "@/lib/monitoring-config";

Sentry.init(monitoringOptions);
