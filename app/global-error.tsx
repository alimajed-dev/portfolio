"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#f8fafc",
          color: "#111827",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100dvh",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "480px", textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{ color: "#1a73e8", fontSize: "32px", fontWeight: 700, marginBottom: "20px" }}
          >
            AM
          </div>
          <h1 style={{ fontSize: "24px", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#5f6673", lineHeight: 1.6, margin: "0 0 24px" }}>
            The error has been reported. Please try again.
          </p>
          <button
            onClick={retry}
            style={{
              background: "#1a73e8",
              border: 0,
              borderRadius: "10px",
              color: "white",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 600,
              padding: "11px 18px",
            }}
            type="button"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
