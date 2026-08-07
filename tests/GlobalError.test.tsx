/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureException }));

import GlobalError from "@/app/global-error";

afterEach(cleanup);

describe("GlobalError", () => {
  it("reports an unrecoverable render error and offers a retry", () => {
    const error = new Error("render failed");
    const retry = vi.fn();

    render(<GlobalError error={error} retry={retry} />, { container: document });

    expect(captureException).toHaveBeenCalledWith(error);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
