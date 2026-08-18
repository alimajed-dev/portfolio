/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CursorTigerExperience,
  pointerXToVideoTime,
  renderedSourceAnchorX,
  touchXToVideoTime,
} from "@/components/experiences/CursorTigerExperience";
import { CURSOR_TIGER_VIDEO_SRC } from "@/lib/site";

let finePointer = true;
let reducedMotion = false;
let nextFrameId = 1;
const frames = new Map<number, FrameRequestCallback>();

function installMediaQueries() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : finePointer,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function prepareVideo(video: HTMLVideoElement) {
  let currentTime = 0;
  const seeks: number[] = [];

  Object.defineProperties(video, {
    duration: { configurable: true, get: () => 5 },
    videoWidth: { configurable: true, get: () => 1920 },
    videoHeight: { configurable: true, get: () => 1080 },
    currentTime: {
      configurable: true,
      get: () => currentTime,
      set: (value: number) => {
        currentTime = value;
        seeks.push(value);
      },
    },
    seeking: { configurable: true, get: () => false },
  });

  return {
    seeks,
    currentTime: () => currentTime,
    completeSeekAt: (time: number) => {
      currentTime = time;
    },
  };
}

function prepareExperience(experience: HTMLElement) {
  vi.spyOn(experience, "getBoundingClientRect").mockReturnValue({
    x: 272,
    y: 56,
    left: 272,
    right: 920,
    top: 56,
    bottom: 720,
    width: 648,
    height: 664,
    toJSON: () => ({}),
  });
}

beforeEach(() => {
  finePointer = true;
  reducedMotion = false;
  nextFrameId = 1;
  frames.clear();
  installMediaQueries();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CursorTigerExperience", () => {
  it("uses the approved paused video as the complete visual scene", () => {
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;

    expect(experience.style.cursor).toContain("/cursor-tiger/ladybug-cursor.png");
    expect(video.getAttribute("src")).toBe(CURSOR_TIGER_VIDEO_SRC);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.preload).toBe("auto");
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(false);
    expect(video.className).toContain("object-cover");
  });

  it("shows a themed loading state until the video can display a frame", () => {
    render(<CursorTigerExperience />);
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;

    expect(screen.getByText("Waking up the tiger")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("Preparing the interactive scene");
    expect(video.className).toContain("opacity-0");

    fireEvent.canPlay(video);

    expect(video.className).toContain("opacity-100");
  });

  it("starts on the neutral center frame when metadata loads", () => {
    render(<CursorTigerExperience />);
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    const { currentTime } = prepareVideo(video);

    fireEvent.loadedMetadata(video);

    expect(currentTime()).toBe(1.5);
    expect(video.pause).toHaveBeenCalled();
  });

  it("maps the project edges and tiger center across the first three seconds", () => {
    const mapping = { left: 272, neutral: 616, right: 920 };

    expect(pointerXToVideoTime(272, mapping, 9)).toBe(0);
    expect(pointerXToVideoTime(444, mapping, 9)).toBe(0.75);
    expect(pointerXToVideoTime(616, mapping, 9)).toBe(1.5);
    expect(pointerXToVideoTime(768, mapping, 9)).toBe(2.25);
    expect(pointerXToVideoTime(920, mapping, 9)).toBe(3);
    expect(pointerXToVideoTime(1200, mapping, 9)).toBe(3);
    expect(pointerXToVideoTime(920, mapping, 2)).toBe(2);
  });

  it("maps touch taps to the middle of the left, center, and right sections", () => {
    expect(touchXToVideoTime(272, 272, 920, 5)).toBe(0.5);
    expect(touchXToVideoTime(600, 272, 920, 5)).toBe(1.5);
    expect(touchXToVideoTime(920, 272, 920, 5)).toBe(2.5);
  });

  it("keeps the neutral anchor on the tiger after object-cover cropping", () => {
    const offset = renderedSourceAnchorX(648, 664, 1920, 1080);

    expect(272 + offset).toBeCloseTo(616, 0);
  });

  it("prevents overlapping seeks while keeping only the latest cursor target", () => {
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks } = prepareVideo(video);
    fireEvent.loadedMetadata(video);
    fireEvent.seeked(video);
    seeks.length = 0;

    fireEvent.pointerMove(experience, { clientX: 1000 });
    const firstFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(firstFrame[0]);
    firstFrame[1](0);
    expect(seeks).toHaveLength(1);

    fireEvent.pointerMove(experience, { clientX: 0 });
    expect(frames.size).toBe(1);
    expect(seeks).toHaveLength(1);
    expect(Number(video.dataset.cursorTigerSkippedSeeks)).toBeGreaterThan(0);

    fireEvent.seeked(video);
    const nextAllowedFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(nextAllowedFrame[0]);
    nextAllowedFrame[1](34);

    expect(seeks).toHaveLength(2);
    expect(seeks[1]).toBeLessThan(seeks[0]);
    expect(frames.size).toBe(1);
  });

  it("restarts gently after the pointer has been idle", () => {
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks } = prepareVideo(video);
    fireEvent.loadedMetadata(video);
    fireEvent.seeked(video);
    seeks.length = 0;

    fireEvent.pointerMove(experience, { clientX: 616 });
    const idleFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(idleFrame[0]);
    idleFrame[1](0);
    expect(frames.size).toBe(0);

    fireEvent.pointerMove(experience, { clientX: 1000 });
    const resumedFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(resumedFrame[0]);
    resumedFrame[1](5000);

    expect(seeks).toHaveLength(1);
    expect(seeks[0]).toBeGreaterThan(1.5);
    expect(seeks[0]).toBeLessThan(2.1);
  });

  it("uses a faster follow response near the timeline edges", () => {
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks } = prepareVideo(video);
    fireEvent.loadedMetadata(video);
    fireEvent.seeked(video);
    seeks.length = 0;

    fireEvent.pointerMove(experience, { clientX: 272 });
    const edgeFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(edgeFrame[0]);
    edgeFrame[1](0);

    expect(seeks).toHaveLength(1);
    expect(seeks[0]).toBeLessThan(1);
  });

  it("accumulates sub-frame interpolation until a meaningful seek is ready", () => {
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks } = prepareVideo(video);
    fireEvent.loadedMetadata(video);
    fireEvent.seeked(video);
    seeks.length = 0;

    fireEvent.pointerMove(experience, { clientX: 622 });
    const firstFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(firstFrame[0]);
    firstFrame[1](0);
    expect(seeks).toHaveLength(0);

    const accumulatedFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(accumulatedFrame[0]);
    accumulatedFrame[1](16);
    expect(seeks).toHaveLength(0);

    const meaningfulFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(meaningfulFrame[0]);
    meaningfulFrame[1](32);
    expect(seeks).toHaveLength(1);
  });

  it("resumes interpolation from the video time confirmed by seeked", () => {
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks, completeSeekAt } = prepareVideo(video);
    fireEvent.loadedMetadata(video);
    fireEvent.seeked(video);
    seeks.length = 0;

    fireEvent.pointerMove(experience, { clientX: 920 });
    const firstFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(firstFrame[0]);
    firstFrame[1](0);
    expect(seeks).toHaveLength(1);

    completeSeekAt(1);
    fireEvent.seeked(video);
    const reconciledFrame = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(reconciledFrame[0]);
    reconciledFrame[1](16);

    expect(seeks).toHaveLength(2);
    expect(seeks[1]).toBeGreaterThan(1);
    expect(seeks[1]).toBeLessThan(2.2);
  });

  it.each([
    ["touch pointer", false, false],
    ["reduced motion", true, true],
  ])("keeps the neutral frame for %s", (_label, isFine, isReduced) => {
    finePointer = isFine;
    reducedMotion = isReduced;
    installMediaQueries();
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks, currentTime } = prepareVideo(video);

    fireEvent.loadedMetadata(video);
    seeks.length = 0;
    fireEvent.pointerMove(experience, { clientX: 1000 });

    expect(currentTime()).toBe(1.5);
    expect(seeks).toHaveLength(0);
    expect(frames.size).toBe(0);
  });

  it("lets touch visitors select left, center, and right gaze positions", () => {
    finePointer = false;
    installMediaQueries();
    render(<CursorTigerExperience />);
    const experience = screen.getByLabelText("Cursor Tiger interactive experience");
    const video = screen.getByLabelText("Baby tiger following the visitor’s horizontal pointer") as HTMLVideoElement;
    prepareExperience(experience);
    const { seeks } = prepareVideo(video);

    fireEvent.loadedMetadata(video);
    fireEvent.seeked(video);
    seeks.length = 0;

    fireEvent.pointerDown(experience, { clientX: 300, pointerType: "touch" });
    expect(seeks).toEqual([0.5]);
    fireEvent.seeked(video);

    fireEvent.pointerDown(experience, { clientX: 600, pointerType: "touch" });
    expect(seeks).toEqual([0.5, 1.5]);
    fireEvent.seeked(video);

    fireEvent.pointerDown(experience, { clientX: 900, pointerType: "touch" });
    expect(seeks).toEqual([0.5, 1.5, 2.5]);
    expect(frames.size).toBe(0);
  });
});
