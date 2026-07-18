"use client";

/**
 * ANIMATED CABIN ASSEMBLY — playback state hook (spec: "Playback controls").
 *
 * Owns the transport state (playing / speed / loop) and the read-out state (current time, step,
 * progress) that the controls, overlay and step-list render from. The animation CLOCK itself lives
 * inside the R3F scene's render loop (AssemblyScene) for smoothness + determinism; the scene reports
 * its time back up through `reportTick`, and this hook pushes seek / step-jump commands DOWN through a
 * monotonic `seek` signal. Keeping the loop in the scene and the transport here means a ~20 fps
 * read-out never re-renders the WebGL subtree (AssemblyScene is memoised on stable props).
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { AssemblyTimeline } from "./assemblyTypes";

export interface SeekCommand {
  ms: number;
  /** monotonically increasing so re-seeking to the same ms still fires the scene effect. */
  nonce: number;
}

export interface AssemblyPlayer {
  playing: boolean;
  speed: number;
  loop: boolean;
  timeMs: number;
  stepIndex: number;
  progress: number;
  seek: SeekCommand;
  ended: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  nextStep: () => void;
  prevStep: () => void;
  seekTo: (ms: number) => void;
  jumpToStep: (index: number) => void;
  setSpeed: (s: number) => void;
  toggleLoop: () => void;
  /** called by the scene each animated frame (throttled internally to state). */
  reportTick: (timeMs: number, stepIndex: number, progress: number) => void;
}

export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;

export function useAssemblyPlayer(timeline: AssemblyTimeline): AssemblyPlayer {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [loop, setLoop] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const [seek, setSeek] = useState<SeekCommand>({ ms: 0, nonce: 0 });

  const total = timeline.totalMs;
  const playheadRef = useRef(0);   // latest known playhead ms (avoids stale closures)
  const stepRef = useRef(-1);
  const lastPushRef = useRef(0);
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const doSeek = useCallback((ms: number) => {
    const clamped = Math.min(Math.max(ms, 0), total);
    playheadRef.current = clamped;
    setSeek((s) => ({ ms: clamped, nonce: s.nonce + 1 }));
    setTimeMs(clamped);
    setEnded(false);
  }, [total]);

  const play = useCallback(() => {
    if (playheadRef.current >= total - 1) doSeek(0); // replay from the top when finished
    setEnded(false);
    setPlaying(true);
  }, [total, doSeek]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => {
    if (!p && playheadRef.current >= total - 1) doSeek(0);
    return !p;
  }), [total, doSeek]);
  const restart = useCallback(() => { doSeek(0); setPlaying(true); }, [doSeek]);

  const resolveStepIndex = useCallback(() => {
    const idx = stepRef.current;
    if (idx < 0) return -1;
    if (idx >= timeline.steps.length) return timeline.steps.length - 1;
    return idx;
  }, [timeline.steps.length]);

  const jumpToStep = useCallback((index: number) => {
    const s = timeline.steps[index];
    if (!s) return;
    setPlaying(false);
    stepRef.current = index;
    setStepIndex(index);
    doSeek(s.startMs + 1);
  }, [timeline.steps, doSeek]);

  const nextStep = useCallback(() => {
    const cur = resolveStepIndex();
    jumpToStep(cur < 0 ? 0 : Math.min(timeline.steps.length - 1, cur + 1));
  }, [resolveStepIndex, timeline.steps.length, jumpToStep]);

  const prevStep = useCallback(() => {
    jumpToStep(Math.max(0, resolveStepIndex() - 1));
  }, [resolveStepIndex, jumpToStep]);

  const seekTo = useCallback((ms: number) => { setPlaying(false); doSeek(ms); }, [doSeek]);
  const setSpeed = useCallback((s: number) => setSpeedState(s), []);
  const toggleLoop = useCallback(() => setLoop((v) => !v), []);

  const reportTick = useCallback((t: number, idx: number, prog: number) => {
    playheadRef.current = t;
    stepRef.current = idx;
    // throttle the state churn to ~20 fps; always push the terminal frame
    if (prog < 1 && prog > 0 && Math.abs(t - lastPushRef.current) < 48) return;
    lastPushRef.current = t;
    setTimeMs(t);
    setStepIndex(idx);
    setProgress(prog);
    if (prog >= 1) {
      setEnded(true);
      if (!loopRef.current) setPlaying(false);
    }
  }, []);

  return useMemo(() => ({
    playing, speed, loop, timeMs, stepIndex, progress, seek, ended,
    play, pause, toggle, restart, nextStep, prevStep, seekTo, jumpToStep, setSpeed, toggleLoop, reportTick,
  }), [playing, speed, loop, timeMs, stepIndex, progress, seek, ended,
    play, pause, toggle, restart, nextStep, prevStep, seekTo, jumpToStep, setSpeed, toggleLoop, reportTick]);
}
