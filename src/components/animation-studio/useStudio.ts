"use client";

/**
 * THE WORKSPACE STATE MACHINE.
 *
 * One hook owns every piece of studio state and every server call, so the panels stay dumb and
 * the fourteen required states (empty → uploading → analyzing → storyboard ready → … → completed)
 * are decided in exactly one place.
 *
 * ── THE SERVER IS THE SOURCE OF TRUTH ───────────────────────────────────────────────────────
 * Every mutating call returns the whole project, and this hook replaces its state with what came
 * back rather than with what it optimistically hoped for. That is why scene durations always show
 * a 30-second total: the server rebalanced them, and the timeline renders the server's answer.
 *
 * ── POLLING ─────────────────────────────────────────────────────────────────────────────────
 * While anything is queued or processing, the hook polls the status endpoint, which is what
 * actually advances the provider jobs. It backs off from 4s to 15s, stops when nothing is
 * running, and restarts on mount — so closing the tab and coming back resumes a live render.
 *
 * The project id is persisted in localStorage. Ownership is NOT: that lives in an httpOnly cookie
 * the browser cannot read, so a stolen localStorage value opens nothing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { retimeScenes } from "@/lib/animation/storyboard";
import { sumDurations } from "@/lib/animation/duration";
import {
  REQUIRED_ASSET_ROLES,
  TOTAL_DURATION_SECONDS,
  type AssetRole,
  type ProviderConfigStatus,
  type StudioOutput,
  type StudioProject,
  type StudioScene,
} from "@/lib/animation/types";

import { studioApi, StudioError, type StudioComment, type StudioJob } from "./api";

const STORAGE_KEY = "poc.animation-studio.projectId";

/** The visible workspace state. Drives the status banner and which controls are enabled. */
export type StudioPhase =
  | "loading"
  | "provider-missing"
  | "empty"
  | "uploading"
  | "analyzing"
  | "storyboard-ready"
  | "awaiting-approval"
  | "queued"
  | "generating"
  | "assembling"
  | "completed"
  | "failed"
  | "cancelled";

export interface StudioState {
  phase: StudioPhase;
  config: ProviderConfigStatus | null;
  project: StudioProject | null;
  outputs: StudioOutput[];
  jobs: StudioJob[];
  comments: StudioComment[];
  versions: { version: number; label: string | null; created_at: string }[];
  busy: string | null;
  error: string | null;
  notice: string | null;
  analysisNotice: string | null;
  shareUrl: string | null;
}

export function useStudio() {
  const [config, setConfig] = useState<ProviderConfigStatus | null>(null);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [outputs, setOutputs] = useState<StudioOutput[]>([]);
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [comments, setComments] = useState<StudioComment[]>([]);
  const [versions, setVersions] = useState<StudioState["versions"]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [analysisNotice, setAnalysisNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDelay = useRef(4000);
  // Guards against a late response from an abandoned project overwriting the current one.
  const activeId = useRef<string | null>(null);

  const absorb = useCallback(
    (payload: {
      project: StudioProject;
      outputs: StudioOutput[];
      jobs?: StudioJob[];
      comments?: StudioComment[];
      versions?: StudioState["versions"];
    }) => {
      if (activeId.current && payload.project.publicId !== activeId.current) return;
      setProject(payload.project);
      setOutputs(payload.outputs ?? []);
      if (payload.jobs) setJobs(payload.jobs);
      if (payload.comments) setComments(payload.comments);
      if (payload.versions) setVersions(payload.versions);
    },
    [],
  );

  const fail = useCallback((err: unknown, fallback: string) => {
    const message = err instanceof StudioError ? err.message : fallback;
    setError(message);
    return err instanceof StudioError ? err : new StudioError(message, 500);
  }, []);

  /* ---------------------------------------------------------------- boot ------------------ */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await studioApi.config();
        if (!cancelled) setConfig(cfg);
      } catch {
        // A failed config read is not fatal — it degrades to "provider unknown", and the render
        // route will still refuse correctly if nothing is configured.
        if (!cancelled) setConfig(null);
      }

      const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        try {
          activeId.current = saved;
          const payload = await studioApi.getProject(saved);
          if (!cancelled) absorb(payload);
        } catch {
          // The project was deleted, or this is a different browser. Start clean.
          if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
          activeId.current = null;
        }
      }
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [absorb]);

  /* ---------------------------------------------------------------- phase ----------------- */

  const phase: StudioPhase = useMemo(() => {
    if (!booted) return "loading";
    if (busy === "uploading") return "uploading";
    if (busy === "analyzing") return "analyzing";
    // The readiness gate covers provider, database AND ffmpeg — a server missing any of them
    // cannot complete a render, so the workspace says so rather than offering an empty canvas.
    if (!project) return config && !config.ready ? "provider-missing" : "empty";

    switch (project.status) {
      case "analyzing":
        return "analyzing";
      case "queued":
        return "queued";
      case "generating":
        return "generating";
      case "assembling":
        return "assembling";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      case "cancelled":
        return "cancelled";
      case "awaiting_approval":
        return "awaiting-approval";
      case "storyboard_ready":
        return "storyboard-ready";
      default:
        return project.assets.length === 0 ? "empty" : "storyboard-ready";
    }
  }, [booted, busy, project, config]);

  /* ---------------------------------------------------------------- polling --------------- */

  const running = useMemo(
    () => jobs.some((j) => j.status === "queued" || j.status === "processing"),
    [jobs],
  );

  const poll = useCallback(async () => {
    const id = activeId.current;
    if (!id) return;
    try {
      const payload = await studioApi.renderStatus(id);
      absorb(payload);
    } catch {
      // Transient failures are expected while a render runs; the next tick tries again.
    }
  }, [absorb]);

  useEffect(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    if (!running) {
      pollDelay.current = 4000;
      return;
    }
    const tick = async () => {
      await poll();
      // Back off gently: a 30-second film takes minutes, and hammering the route helps nobody.
      pollDelay.current = Math.min(15000, Math.round(pollDelay.current * 1.25));
      pollRef.current = setTimeout(tick, pollDelay.current);
    };
    pollRef.current = setTimeout(tick, pollDelay.current);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [running, poll]);

  /* ---------------------------------------------------------------- actions --------------- */

  const ensureProject = useCallback(async (): Promise<string> => {
    if (activeId.current && project) return activeId.current;
    const { publicId } = await studioApi.createProject();
    activeId.current = publicId;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, publicId);
    const payload = await studioApi.getProject(publicId);
    absorb(payload);
    return publicId;
  }, [project, absorb]);

  const uploadAsset = useCallback(
    async (file: File, role: AssetRole | "logo" | "comparison") => {
      setError(null);
      setNotice(null);
      setBusy("uploading");
      try {
        const id = await ensureProject();
        const result = await studioApi.uploadAsset(id, file, role);
        if (result.duplicate && result.message) setNotice(result.message);
        const payload = await studioApi.getProject(id);
        absorb(payload);
      } catch (err) {
        fail(err, "The image could not be uploaded.");
      } finally {
        setBusy(null);
      }
    },
    [ensureProject, absorb, fail],
  );

  const removeAsset = useCallback(
    async (assetId: string) => {
      if (!activeId.current) return;
      setError(null);
      setBusy("removing");
      try {
        await studioApi.deleteAsset(activeId.current, assetId);
        absorb(await studioApi.getProject(activeId.current));
      } catch (err) {
        fail(err, "The image could not be removed.");
      } finally {
        setBusy(null);
      }
    },
    [absorb, fail],
  );

  const analyze = useCallback(async () => {
    if (!activeId.current) return;
    setError(null);
    setNotice(null);
    setBusy("analyzing");
    try {
      const payload = await studioApi.analyze(activeId.current, true);
      absorb(payload);
      setAnalysisNotice(payload.notice);
    } catch (err) {
      fail(err, "The analysis could not be completed.");
    } finally {
      setBusy(null);
    }
  }, [absorb, fail]);

  const saveProject = useCallback(
    async (
      body: Parameters<typeof studioApi.patchProject>[1],
      busyLabel = "saving",
    ) => {
      if (!activeId.current) return;
      setError(null);
      setBusy(busyLabel);
      try {
        absorb(await studioApi.patchProject(activeId.current, body));
      } catch (err) {
        fail(err, "Your changes could not be saved.");
        // Re-read so the UI shows what the server actually has, not a failed optimistic edit.
        try {
          absorb(await studioApi.getProject(activeId.current));
        } catch {
          /* the error banner already explains */
        }
      } finally {
        setBusy(null);
      }
    },
    [absorb, fail],
  );

  /**
   * Update the scene list locally AND persist it.
   *
   * The local retime is only so the timeline does not visibly jump while the request is in
   * flight — the server rebalances authoritatively and its answer replaces this.
   */
  const updateScenes = useCallback(
    async (next: StudioScene[], versionLabel: string) => {
      if (!project) return;
      // Same cap the server will apply, so the optimistic timeline does not flash a duration
      // the save is about to take back.
      const optimistic = retimeScenes(
        next.map((s, i) => ({ ...s, index: i })),
        config?.capabilities?.maxSceneSeconds,
      );
      setProject({ ...project, scenes: optimistic });
      await saveProject({ scenes: optimistic, versionLabel }, "saving");
    },
    [project, saveProject, config],
  );

  const generate = useCallback(
    async (sceneIds?: string[], retry = false) => {
      if (!activeId.current) return;
      setError(null);
      setNotice(null);
      setBusy("generating");
      try {
        const payload = await studioApi.render(activeId.current, sceneIds, retry);
        absorb(payload);
        if (payload.failed.length > 0) {
          setError(
            `${payload.failed.length} scene${payload.failed.length === 1 ? "" : "s"} could not be started: ${payload.failed[0].error}`,
          );
        } else if (payload.submitted === 0 && payload.reused > 0) {
          setNotice("Those scenes were already generating — nothing was submitted twice.");
        } else if (payload.message) {
          setNotice(payload.message);
        }
        if (payload.assemblyAvailable === false) {
          setNotice(
            "Note: this server cannot join clips into a single file (no ffmpeg installed). Scenes will " +
              "render and can be downloaded individually, but the 30-second export will not run here.",
          );
        }
        pollDelay.current = 4000;
      } catch (err) {
        fail(err, "The render could not be started.");
      } finally {
        setBusy(null);
      }
    },
    [absorb, fail],
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      if (!activeId.current) return;
      setBusy("cancelling");
      try {
        const result = await studioApi.cancelJob(activeId.current, jobId);
        setNotice(result.message);
        absorb(await studioApi.renderStatus(activeId.current));
      } catch (err) {
        fail(err, "The render could not be cancelled.");
      } finally {
        setBusy(null);
      }
    },
    [absorb, fail],
  );

  const exportVideo = useCallback(
    async (body: { aspectRatio?: string; resolution?: string; kind?: "preview" | "final" }) => {
      if (!activeId.current) return;
      setError(null);
      setNotice(null);
      setBusy("exporting");
      try {
        const payload = await studioApi.exportVideo(activeId.current, body);
        absorb(payload);
        const measured = payload.export.verifiedDurationSeconds;
        setNotice(
          measured !== null
            ? `Exported ${payload.export.width}×${payload.export.height} ${payload.export.codec}. ` +
                `Duration verified server-side at ${measured.toFixed(3)}s via ${payload.export.probeSource}.`
            : "Exported.",
        );
      } catch (err) {
        fail(err, "The export failed.");
      } finally {
        setBusy(null);
      }
    },
    [absorb, fail],
  );

  const improvePrompt = useCallback(
    async (sceneId: string, prompt: string): Promise<string | null> => {
      if (!activeId.current) return null;
      setError(null);
      setBusy("improving");
      try {
        const result = await studioApi.improvePrompt(activeId.current, sceneId, prompt);
        setNotice(result.notice);
        return result.improved;
      } catch (err) {
        fail(err, "The prompt could not be improved.");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [fail],
  );

  const toggleShare = useCallback(async () => {
    if (!activeId.current || !project) return;
    setBusy("sharing");
    try {
      if (project.shareEnabled) {
        await studioApi.unshare(activeId.current);
        setShareUrl(null);
        setNotice("The preview link has been revoked. Anyone holding it now sees nothing.");
      } else {
        const result = await studioApi.share(activeId.current);
        setShareUrl(result.shareUrl);
        setNotice("Read-only preview link created. It shows the film and the disclaimer only — never your uploads or prompts.");
      }
      absorb(await studioApi.getProject(activeId.current));
    } catch (err) {
      fail(err, "The preview link could not be updated.");
    } finally {
      setBusy(null);
    }
  }, [project, absorb, fail]);

  const duplicateProject = useCallback(async () => {
    if (!activeId.current) return;
    setBusy("duplicating");
    try {
      const { publicId } = await studioApi.duplicateProject(activeId.current);
      activeId.current = publicId;
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, publicId);
      absorb(await studioApi.getProject(publicId));
      setNotice("Duplicated. You are now working on the copy — the original is untouched and still in your project list.");
    } catch (err) {
      fail(err, "The project could not be duplicated.");
    } finally {
      setBusy(null);
    }
  }, [absorb, fail]);

  const deleteProject = useCallback(async () => {
    if (!activeId.current) return;
    setBusy("deleting");
    try {
      const result = await studioApi.deleteProject(activeId.current);
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      activeId.current = null;
      setProject(null);
      setOutputs([]);
      setJobs([]);
      setComments([]);
      setVersions([]);
      setShareUrl(null);
      setNotice(`Project deleted. ${result.filesRemoved} uploaded file${result.filesRemoved === 1 ? "" : "s"} removed from our storage.`);
    } catch (err) {
      fail(err, "The project could not be deleted.");
    } finally {
      setBusy(null);
    }
  }, [fail]);

  const restoreVersion = useCallback(
    async (version: number) => {
      if (!activeId.current) return;
      setBusy("restoring");
      try {
        absorb(await studioApi.restoreVersion(activeId.current, version));
        setNotice(`Restored version ${version}.`);
      } catch (err) {
        fail(err, "That version could not be restored.");
      } finally {
        setBusy(null);
      }
    },
    [absorb, fail],
  );

  const loadVersions = useCallback(async () => {
    if (!activeId.current) return;
    try {
      const result = await studioApi.listVersions(activeId.current);
      setVersions(result.versions);
    } catch {
      /* the history panel simply stays empty */
    }
  }, []);

  const addComment = useCallback(
    async (body: string, sceneId: string | null) => {
      if (!activeId.current) return;
      setBusy("commenting");
      try {
        const result = await studioApi.addComment(activeId.current, body, sceneId);
        setComments((prev) => [result.comment, ...prev]);
      } catch (err) {
        fail(err, "The comment could not be posted.");
      } finally {
        setBusy(null);
      }
    },
    [fail],
  );

  const setApproval = useCallback(
    async (approvalStatus: string) => {
      await saveProject({ approvalStatus, versionLabel: `Approval: ${approvalStatus}` }, "saving");
    },
    [saveProject],
  );

  /* ---------------------------------------------------------------- derived --------------- */

  /* `project?.scenes ?? []` allocates a NEW empty array on every render while there is no
     project, which would invalidate the memo below on every render. Memoising the fallback
     keeps `scenes` referentially stable, so the timeline is not re-derived while a visitor is
     simply typing in a prompt box. */
  const scenes = useMemo(() => project?.scenes ?? [], [project]);
  const totalDuration = useMemo(() => sumDurations(scenes.map((s) => s.durationSeconds)), [scenes]);
  const uploadedRoles = useMemo(() => (project?.assets ?? []).map((a) => a.role), [project]);
  const missingRoles = useMemo(
    () => REQUIRED_ASSET_ROLES.filter((r) => !uploadedRoles.includes(r)),
    [uploadedRoles],
  );
  const renderedScenes = scenes.filter((s) => s.status === "completed" && s.clipPath).length;
  const finalOutput = outputs.find((o) => o.kind === "final") ?? null;
  const previewOutput = outputs.find((o) => o.kind === "preview") ?? null;
  const posterOutput = outputs.find((o) => o.kind === "poster") ?? null;

  return {
    // state
    phase,
    config,
    project,
    outputs,
    jobs,
    comments,
    versions,
    busy,
    error,
    notice,
    analysisNotice,
    shareUrl,
    // derived
    scenes,
    totalDuration,
    targetDuration: TOTAL_DURATION_SECONDS,
    missingRoles,
    renderedScenes,
    finalOutput,
    previewOutput,
    posterOutput,
    /** The configured provider's hard per-clip cap, or undefined when nothing is configured. */
    providerMaxSceneSeconds: config?.capabilities?.maxSceneSeconds,
    readyToGenerate: missingRoles.length === 0 && scenes.length > 0,
    readyToExport: scenes.length > 0 && renderedScenes === scenes.length,
    // actions
    uploadAsset,
    removeAsset,
    analyze,
    saveProject,
    updateScenes,
    generate,
    cancelJob,
    exportVideo,
    improvePrompt,
    toggleShare,
    duplicateProject,
    deleteProject,
    restoreVersion,
    loadVersions,
    addComment,
    setApproval,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
    summaryHref: activeId.current ? studioApi.summaryUrl(activeId.current) : null,
  };
}

export type StudioController = ReturnType<typeof useStudio>;
