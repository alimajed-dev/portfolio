/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PixelExperience } from "@/components/experiences/PixelExperience";

vi.mock("next/dynamic", () => ({
  default: () => function MockPixelCanvas() {
    return <div data-testid="pixel-canvas" />;
  },
}));

afterEach(cleanup);

describe("How Pixels Create Color", () => {
  it("opens as a guided interactive experience", async () => {
    const user = userEvent.setup();
    render(<PixelExperience />);

    expect(screen.getByRole("heading", { name: "How Pixels Create Color" })).toBeDefined();
    expect(screen.getByTestId("pixel-canvas")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Start exploring" }));
    expect(screen.getByRole("heading", { name: "The smallest addressable point" })).toBeDefined();
  });

  it("lets visitors mix red, green, and blue channels", async () => {
    const user = userEvent.setup();
    render(<PixelExperience />);
    await user.click(screen.getByRole("button", { name: /Scene 4: Make a color/ }));

    expect(screen.getByLabelText("RGB color mixer")).toBeDefined();
    expect(screen.getByRole("slider", { name: "Red channel" })).toBeDefined();
    expect(screen.getByRole("slider", { name: "Green channel" })).toBeDefined();
    expect(screen.getByRole("slider", { name: "Blue channel" })).toBeDefined();
  });

  it("keeps editable hex, RGB, and sliders synchronized", async () => {
    const user = userEvent.setup();
    render(<PixelExperience />);
    await user.click(screen.getByRole("button", { name: /Scene 4: Make a color/ }));

    const hex = screen.getByRole("textbox", { name: "Hex value" }) as HTMLInputElement;
    const rgb = screen.getByRole("textbox", { name: "RGB value" }) as HTMLInputElement;
    const red = screen.getByRole("slider", { name: "Red channel" }) as HTMLInputElement;
    const green = screen.getByRole("slider", { name: "Green channel" }) as HTMLInputElement;
    const blue = screen.getByRole("slider", { name: "Blue channel" }) as HTMLInputElement;

    await user.clear(hex);
    await user.type(hex, "#000");
    expect([red.value, green.value, blue.value]).toEqual(["0", "0", "0"]);
    expect(rgb.value).toBe("rgb(0, 0, 0)");
    expect((screen.getByRole("heading", { name: "How Pixels Create Color — interactive 3D experience" }).parentElement as HTMLElement).style.getPropertyValue("--experience-accent")).toBe("rgb(0,0,0)");

    await user.clear(rgb);
    await user.type(rgb, "255, 128, 64");
    expect([red.value, green.value, blue.value]).toEqual(["255", "128", "64"]);
    expect(hex.value).toBe("#FF8040");
    expect((screen.getByRole("heading", { name: "How Pixels Create Color — interactive 3D experience" }).parentElement as HTMLElement).style.getPropertyValue("--experience-accent")).toBe("rgb(255,128,64)");
  });
});
