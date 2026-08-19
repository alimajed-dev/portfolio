import { afterEach, describe, expect, it, vi } from "vitest";
import { contentMaxAgeHours, lookbackHours, manualMonthlyRequestLimit, maxPostsPerScan, monthlyRequestLimit, radarUseCaseApproved, refreshIntervalHours } from "@/lib/x-radar/config";

afterEach(() => vi.unstubAllEnvs());

describe("Radar numeric configuration", () => {
  it("uses conservative fallbacks for missing or invalid values", () => {
    vi.stubEnv("X_REFRESH_INTERVAL_HOURS", "invalid");
    vi.stubEnv("X_CONTENT_MAX_AGE_HOURS", "invalid");
    vi.stubEnv("X_MAX_POSTS_PER_SCAN", "invalid");
    vi.stubEnv("X_LOOKBACK_HOURS", "invalid");
    vi.stubEnv("X_MONTHLY_REQUEST_LIMIT", "invalid");
    vi.stubEnv("X_MANUAL_MONTHLY_REQUEST_LIMIT", "invalid");

    expect(refreshIntervalHours()).toBe(240);
    expect(contentMaxAgeHours()).toBe(12);
    expect(maxPostsPerScan()).toBe(30);
    expect(lookbackHours()).toBe(24);
    expect(monthlyRequestLimit()).toBe(14);
    expect(manualMonthlyRequestLimit()).toBe(10);
  });

  it("treats blank Railway values as missing", () => {
    vi.stubEnv("X_REFRESH_INTERVAL_HOURS", " ");
    vi.stubEnv("X_CONTENT_MAX_AGE_HOURS", " ");
    vi.stubEnv("X_MAX_POSTS_PER_SCAN", " ");
    vi.stubEnv("X_LOOKBACK_HOURS", " ");
    vi.stubEnv("X_MONTHLY_REQUEST_LIMIT", " ");
    vi.stubEnv("X_MANUAL_MONTHLY_REQUEST_LIMIT", " ");

    expect(refreshIntervalHours()).toBe(240);
    expect(contentMaxAgeHours()).toBe(12);
    expect(maxPostsPerScan()).toBe(30);
    expect(lookbackHours()).toBe(24);
    expect(monthlyRequestLimit()).toBe(14);
    expect(manualMonthlyRequestLimit()).toBe(10);
  });

  it("clamps explicit values to hard safe bounds", () => {
    vi.stubEnv("X_REFRESH_INTERVAL_HOURS", "9999");
    vi.stubEnv("X_CONTENT_MAX_AGE_HOURS", "9999");
    vi.stubEnv("X_MAX_POSTS_PER_SCAN", "9999");
    vi.stubEnv("X_LOOKBACK_HOURS", "9999");
    vi.stubEnv("X_MONTHLY_REQUEST_LIMIT", "9999");
    vi.stubEnv("X_MANUAL_MONTHLY_REQUEST_LIMIT", "9999");

    expect(refreshIntervalHours()).toBe(576);
    expect(contentMaxAgeHours()).toBe(24);
    expect(maxPostsPerScan()).toBe(100);
    expect(lookbackHours()).toBe(168);
    expect(monthlyRequestLimit()).toBe(200);
    expect(manualMonthlyRequestLimit()).toBe(100);
  });

  it("requires an explicit true approval flag", () => {
    expect(radarUseCaseApproved()).toBe(false);
    vi.stubEnv("X_RADAR_USE_CASE_APPROVED", "TRUE");
    expect(radarUseCaseApproved()).toBe(false);
    vi.stubEnv("X_RADAR_USE_CASE_APPROVED", "true");
    expect(radarUseCaseApproved()).toBe(true);
  });
});
