"use client";

import { useEffect, useRef } from "react";
import { CURSOR_TIGER_VIDEO_SRC } from "@/lib/site";

const FOLLOW_RATE = 18;
const EDGE_FOLLOW_RATE = 28;
const MAX_FRAME_DELTA_SECONDS = 0.04;
const SEEK_THRESHOLD_SECONDS = 1 / 60;
const EDGE_SETTLE_THRESHOLD_SECONDS = 1 / 30;
const EDGE_TARGET_WINDOW_SECONDS = 0.12;
const CURSOR_TIMELINE_LIMIT_SECONDS = 3;
const LADYBUG_CURSOR = "url('/cursor-tiger/ladybug-cursor.png') 32 32, auto";
// Horizontal center of the tiger's face in the approved source render.
const TIGER_SOURCE_ANCHOR_X = 0.517;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cursorTimelineDuration(videoDuration: number) {
  return Math.min(videoDuration, CURSOR_TIMELINE_LIMIT_SECONDS);
}

type HorizontalMapping = {
  left: number;
  right: number;
  neutral: number;
};

export function renderedSourceAnchorX(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
) {
  if (containerWidth <= 0 || containerHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return containerWidth / 2;
  }

  const coverScale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  const renderedWidth = videoWidth * coverScale;
  const croppedFromLeft = (renderedWidth - containerWidth) / 2;
  return TIGER_SOURCE_ANCHOR_X * renderedWidth - croppedFromLeft;
}

export function pointerXToVideoTime(
  pointerX: number,
  mapping: HorizontalMapping,
  duration: number,
) {
  const { left, right } = mapping;
  if (right <= left || !Number.isFinite(duration) || duration <= 0) return 0;

  const neutral = clamp(mapping.neutral, left + 1, right - 1);
  const x = clamp(pointerX, left, right);
  const progress = x <= neutral
    ? 0.5 * ((x - left) / (neutral - left))
    : 0.5 + 0.5 * ((x - neutral) / (right - neutral));

  return progress * cursorTimelineDuration(duration);
}

export function touchXToVideoTime(
  pointerX: number,
  left: number,
  right: number,
  duration: number,
) {
  if (right <= left || !Number.isFinite(duration) || duration <= 0) return 0;

  const progress = clamp((pointerX - left) / (right - left), 0, 1);
  const zone = Math.min(2, Math.floor(progress * 3));
  return ((zone + 0.5) / 3) * cursorTimelineDuration(duration);
}

export function CursorTigerExperience() {
  const experienceRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const latestTargetTimeRef = useRef(0);
  const displayedTimeRef = useRef(0);
  const pointerXRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const lastSeekTimeRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const seekStartedAtRef = useRef<number | null>(null);
  const lastPointerAtRef = useRef<number | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const devMeasurementsRef = useRef({
    completedSeeks: 0,
    totalSeekDurationMs: 0,
    skippedSeeks: 0,
    visibleUpdates: 0,
    totalPointerToVisibleMs: 0,
  });

  useEffect(() => {
    const experience = experienceRef.current;
    const video = videoRef.current;
    if (!experience || !video) return;
    const videoElement = video;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let horizontalMapping: HorizontalMapping | null = null;

    const canScrub = () => finePointer.matches && !reducedMotion.matches;
    const hasDuration = () => Number.isFinite(videoElement.duration) && videoElement.duration > 0;

    const cancelFrame = () => {
      if (frameRef.current === null) return;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const updateDevMeasurements = () => {
      if (process.env.NODE_ENV === "production") return;
      const measurements = devMeasurementsRef.current;
      videoElement.dataset.cursorTigerAverageSeekMs = measurements.completedSeeks > 0
        ? (measurements.totalSeekDurationMs / measurements.completedSeeks).toFixed(1)
        : "0.0";
      videoElement.dataset.cursorTigerSkippedSeeks = String(measurements.skippedSeeks);
      videoElement.dataset.cursorTigerAveragePointerToVisibleMs = measurements.visibleUpdates > 0
        ? (measurements.totalPointerToVisibleMs / measurements.visibleUpdates).toFixed(1)
        : "0.0";
    };

    const recordVisibleUpdate = () => {
      if (process.env.NODE_ENV === "production" || lastPointerAtRef.current === null) return;
      const measurements = devMeasurementsRef.current;
      measurements.visibleUpdates += 1;
      measurements.totalPointerToVisibleMs += performance.now() - lastPointerAtRef.current;
      lastPointerAtRef.current = null;
      updateDevMeasurements();
    };

    const measureNextVisibleFrame = () => {
      if (process.env.NODE_ENV === "production") return;
      if (typeof videoElement.requestVideoFrameCallback !== "function") {
        recordVisibleUpdate();
        return;
      }
      if (
        videoFrameCallbackRef.current !== null &&
        typeof videoElement.cancelVideoFrameCallback === "function"
      ) {
        videoElement.cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
      videoFrameCallbackRef.current = videoElement.requestVideoFrameCallback(() => {
        videoFrameCallbackRef.current = null;
        recordVisibleUpdate();
      });
    };

    const measureHorizontalMapping = () => {
      const bounds = experience.getBoundingClientRect();
      const neutralOffset = renderedSourceAnchorX(
        bounds.width,
        bounds.height,
        videoElement.videoWidth,
        videoElement.videoHeight,
      );
      horizontalMapping = {
        left: bounds.left,
        right: bounds.right,
        neutral: bounds.left + neutralOffset,
      };
    };

    const startSeek = (time: number) => {
      const safeTime = clamp(time, 0, videoElement.duration);
      pendingSeekRef.current = safeTime;

      if (isSeekingRef.current || videoElement.seeking) {
        if (process.env.NODE_ENV !== "production") {
          devMeasurementsRef.current.skippedSeeks += 1;
          updateDevMeasurements();
        }
        return false;
      }

      if (Math.abs(videoElement.currentTime - safeTime) < SEEK_THRESHOLD_SECONDS) {
        lastSeekTimeRef.current = videoElement.currentTime;
        return false;
      }

      videoElement.pause();
      isSeekingRef.current = true;
      lastSeekTimeRef.current = safeTime;
      pendingSeekRef.current = null;
      seekStartedAtRef.current = performance.now();

      try {
        videoElement.currentTime = safeTime;
        requestFrame();
        return true;
      } catch {
        isSeekingRef.current = false;
        seekStartedAtRef.current = null;
        return false;
      }
    };

    function finishSeek() {
      if (!isSeekingRef.current) return;
      cancelFrame();

      const now = performance.now();
      if (process.env.NODE_ENV !== "production" && seekStartedAtRef.current !== null) {
        const measurements = devMeasurementsRef.current;
        measurements.completedSeeks += 1;
        measurements.totalSeekDurationMs += now - seekStartedAtRef.current;
        updateDevMeasurements();
      }

      seekStartedAtRef.current = null;
      isSeekingRef.current = false;
      displayedTimeRef.current = videoElement.currentTime;
      lastSeekTimeRef.current = videoElement.currentTime;
      measureNextVisibleFrame();

      const latestDesiredTime = pendingSeekRef.current ?? latestTargetTimeRef.current;
      pendingSeekRef.current = null;
      if (
        !document.hidden &&
        Math.abs(videoElement.currentTime - latestDesiredTime) >= SEEK_THRESHOLD_SECONDS
      ) {
        if (canScrub()) {
          requestFrame();
        } else {
          startSeek(latestDesiredTime);
        }
      } else {
        lastFrameAtRef.current = null;
      }
    }

    function runFrame(timestamp: number) {
      frameRef.current = null;
      if (document.hidden || !canScrub() || !hasDuration()) return;

      if (isSeekingRef.current) {
        pendingSeekRef.current = latestTargetTimeRef.current;
        if (videoElement.seeking) {
          requestFrame();
        } else {
          // Browsers may coalesce media events during rapid paused-video
          // scrubbing. The element's seeking state is the fallback source of
          // truth so a missed event cannot leave the controller locked.
          finishSeek();
        }
        return;
      }

      const target = latestTargetTimeRef.current;
      const current = displayedTimeRef.current;
      const difference = target - current;
      const timelineEnd = cursorTimelineDuration(videoElement.duration);
      const nearTimelineEdge = target <= EDGE_TARGET_WINDOW_SECONDS ||
        timelineEnd - target <= EDGE_TARGET_WINDOW_SECONDS;
      const elapsedSeconds = lastFrameAtRef.current === null
        ? 1 / 60
        : Math.min((timestamp - lastFrameAtRef.current) / 1000, MAX_FRAME_DELTA_SECONDS);
      const smoothing = 1 - Math.exp(
        -(nearTimelineEdge ? EDGE_FOLLOW_RATE : FOLLOW_RATE) * elapsedSeconds,
      );
      const settleThreshold = nearTimelineEdge
        ? EDGE_SETTLE_THRESHOLD_SECONDS
        : SEEK_THRESHOLD_SECONDS;
      const next = Math.abs(difference) <= settleThreshold
        ? target
        : current + difference * smoothing;

      lastFrameAtRef.current = timestamp;
      displayedTimeRef.current = next;
      pendingSeekRef.current = next;

      if (startSeek(next)) return;

      if (Math.abs(videoElement.currentTime - target) >= SEEK_THRESHOLD_SECONDS) {
        requestFrame();
      } else {
        displayedTimeRef.current = videoElement.currentTime;
        pendingSeekRef.current = null;
        lastFrameAtRef.current = null;
      }
    }

    const requestFrame = () => {
      if (
        frameRef.current !== null ||
        document.hidden ||
        !canScrub() ||
        !hasDuration()
      ) {
        return;
      }
      frameRef.current = requestAnimationFrame(runFrame);
    };

    const setNeutralFrame = () => {
      if (!hasDuration()) return;
      cancelFrame();
      const neutralTime = cursorTimelineDuration(videoElement.duration) / 2;
      latestTargetTimeRef.current = neutralTime;
      displayedTimeRef.current = videoElement.currentTime;
      pendingSeekRef.current = neutralTime;
      lastFrameAtRef.current = null;
      startSeek(neutralTime);
    };

    const onLoadedMetadata = () => {
      measureHorizontalMapping();
      setNeutralFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!canScrub() || !hasDuration()) return;
      if (!horizontalMapping) measureHorizontalMapping();
      if (!horizontalMapping) return;
      pointerXRef.current = event.clientX;
      latestTargetTimeRef.current = pointerXToVideoTime(
        pointerXRef.current,
        horizontalMapping,
        videoElement.duration,
      );
      if (process.env.NODE_ENV !== "production") lastPointerAtRef.current = performance.now();

      if (isSeekingRef.current || videoElement.seeking) {
        pendingSeekRef.current = latestTargetTimeRef.current;
        if (process.env.NODE_ENV !== "production") {
          devMeasurementsRef.current.skippedSeeks += 1;
          updateDevMeasurements();
        }
        return;
      }
      requestFrame();
    };

    const onPointerLeave = () => {
      if (!canScrub() || !hasDuration()) return;
      pointerXRef.current = horizontalMapping?.neutral ?? window.innerWidth / 2;
      latestTargetTimeRef.current = cursorTimelineDuration(videoElement.duration) / 2;
      if (process.env.NODE_ENV !== "production") lastPointerAtRef.current = performance.now();

      if (isSeekingRef.current || videoElement.seeking) {
        pendingSeekRef.current = latestTargetTimeRef.current;
        return;
      }
      requestFrame();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !hasDuration()) return;

      const bounds = experience.getBoundingClientRect();
      const target = touchXToVideoTime(
        event.clientX,
        bounds.left,
        bounds.right,
        videoElement.duration,
      );
      pointerXRef.current = event.clientX;
      latestTargetTimeRef.current = target;
      displayedTimeRef.current = videoElement.currentTime;
      lastFrameAtRef.current = null;
      if (process.env.NODE_ENV !== "production") lastPointerAtRef.current = performance.now();

      if (isSeekingRef.current || videoElement.seeking) {
        pendingSeekRef.current = target;
        if (process.env.NODE_ENV !== "production") {
          devMeasurementsRef.current.skippedSeeks += 1;
          updateDevMeasurements();
        }
        return;
      }

      startSeek(target);
    };

    const onSeeking = () => {
      isSeekingRef.current = true;
    };

    const onSeeked = () => finishSeek();

    const onInteractionPreferenceChange = () => {
      if (canScrub()) {
        requestFrame();
      } else {
        setNeutralFrame();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelFrame();
      } else if (canScrub()) {
        if (isSeekingRef.current && !videoElement.seeking) {
          onSeeked();
        } else if (!isSeekingRef.current) {
          lastFrameAtRef.current = null;
          requestFrame();
        }
      }
    };

    videoElement.addEventListener("loadedmetadata", onLoadedMetadata);
    videoElement.addEventListener("seeking", onSeeking);
    videoElement.addEventListener("seeked", onSeeked);
    experience.addEventListener("pointerdown", onPointerDown, { passive: true });
    experience.addEventListener("pointermove", onPointerMove, { passive: true });
    experience.addEventListener("pointerleave", onPointerLeave);
    experience.addEventListener("pointercancel", onPointerLeave);
    finePointer.addEventListener("change", onInteractionPreferenceChange);
    reducedMotion.addEventListener("change", onInteractionPreferenceChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", measureHorizontalMapping);

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measureHorizontalMapping);
    resizeObserver?.observe(experience);

    if (videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) onLoadedMetadata();

    return () => {
      cancelFrame();
      videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
      videoElement.removeEventListener("seeking", onSeeking);
      videoElement.removeEventListener("seeked", onSeeked);
      experience.removeEventListener("pointerdown", onPointerDown);
      experience.removeEventListener("pointermove", onPointerMove);
      experience.removeEventListener("pointerleave", onPointerLeave);
      experience.removeEventListener("pointercancel", onPointerLeave);
      finePointer.removeEventListener("change", onInteractionPreferenceChange);
      reducedMotion.removeEventListener("change", onInteractionPreferenceChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", measureHorizontalMapping);
      resizeObserver?.disconnect();
      if (
        videoFrameCallbackRef.current !== null &&
        typeof videoElement.cancelVideoFrameCallback === "function"
      ) {
        videoElement.cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={experienceRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-black"
      style={{ cursor: LADYBUG_CURSOR }}
      aria-label="Cursor Tiger interactive experience"
    >
      <h1 className="sr-only">Cursor Tiger</h1>
      <p className="sr-only">
        Move a fine pointer, or tap the left, center, or right side on a touch screen, to guide the tiger’s gaze. The tiger’s center is the neutral position.
      </p>
      <video
        ref={videoRef}
        src={CURSOR_TIGER_VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        aria-label="Baby tiger following the visitor’s horizontal pointer"
        className="block h-full w-full object-cover"
      />
    </div>
  );
}
