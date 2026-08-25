/**
 * The workspace's HTTP layer.
 *
 * Every call goes to a same-origin /api/animation-studio route. NO provider key, provider URL or
 * Supabase service key is ever referenced in this directory — the browser bundle contains none of
 * them, which is the point of routing everything through the server.
 *
 * `request()` normalises errors into one shape so the UI can always show a sentence rather than
 * "[object Object]". Server routes already write their messages for a visitor to read, so the
 * message is passed through verbatim.
 */

import type {
  ProviderConfigStatus,
  StudioOutput,
  StudioProject,
} from "@/lib/animation/types";

export interface StudioJob {
  id: string;
  sceneId: string | null;
  kind: "scene" | "assembly";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number | null;
  error: string | null;
  attempt: number;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioComment {
  id: string;
  sceneId: string | null;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}

export interface ProjectPayload {
  project: StudioProject;
  outputs: StudioOutput[];
  jobs?: StudioJob[];
  comments?: StudioComment[];
  versions?: { version: number; label: string | null; created_at: string }[];
}

export interface StudioApiError {
  message: string;
  status: number;
  /** Extra fields the route attached, e.g. missingEnv or missingRoles. */
  detail: Record<string, unknown>;
}

export class StudioError extends Error implements StudioApiError {
  status: number;
  detail: Record<string, unknown>;
  constructor(message: string, status: number, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = "StudioError";
    this.status = status;
    this.detail = detail;
  }
}

const BASE = "/api/animation-studio";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      // Same-origin credentials so the httpOnly ownership cookie travels with every call.
      credentials: "same-origin",
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new StudioError(
      "Could not reach the server. Check your connection and try again — your project is saved and nothing has been lost.",
      0,
    );
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // A non-JSON body (an HTML error page from a proxy) is not an error shape we can read;
      // the status code below is then the only thing we have to report.
      body = null;
    }
  }

  if (!res.ok) {
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const { error, ...detail } = record;
    throw new StudioError(
      typeof error === "string" ? error : `The server returned an error (${res.status}).`,
      res.status,
      detail,
    );
  }
  return body as T;
}

export const studioApi = {
  config: () => request<ProviderConfigStatus>("/config"),

  listProjects: () =>
    request<{
      projects: {
        publicId: string;
        title: string;
        status: string;
        approvalStatus: string;
        shareEnabled: boolean;
        createdAt: string;
        updatedAt: string;
      }[];
    }>("/projects"),

  createProject: (title?: string) =>
    request<{ publicId: string }>("/projects", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getProject: (id: string) => request<ProjectPayload>(`/projects/${id}`),

  patchProject: (
    id: string,
    body: {
      title?: string;
      settings?: unknown;
      featureEdits?: Record<string, unknown>;
      scenes?: unknown[];
      approvalStatus?: string;
      versionLabel?: string;
    },
  ) => request<ProjectPayload>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteProject: (id: string) =>
    request<{ deleted: boolean; filesRemoved: number }>(`/projects/${id}`, { method: "DELETE" }),

  duplicateProject: (id: string, title?: string) =>
    request<{ publicId: string; title: string }>(`/projects/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  uploadAsset: (id: string, file: File, role: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("role", role);
    return request<{ asset: StudioProject["assets"][number]; duplicate?: boolean; message?: string }>(
      `/projects/${id}/assets`,
      { method: "POST", body: form },
    );
  },

  deleteAsset: (id: string, assetId: string) =>
    request<{ deleted: boolean }>(`/projects/${id}/assets?assetId=${encodeURIComponent(assetId)}`, {
      method: "DELETE",
    }),

  analyze: (id: string, regenerateStoryboard = true) =>
    request<ProjectPayload & { analysed: boolean; notice: string; sceneCount: number }>(
      `/projects/${id}/analyze`,
      { method: "POST", body: JSON.stringify({ regenerateStoryboard }) },
    ),

  improvePrompt: (id: string, sceneId: string, prompt: string) =>
    request<{ improved: string; source: "model" | "rules"; notice: string }>(
      `/projects/${id}/improve-prompt`,
      { method: "POST", body: JSON.stringify({ sceneId, prompt }) },
    ),

  render: (id: string, sceneIds?: string[], retry = false) =>
    request<
      ProjectPayload & {
        submitted: number;
        reused: number;
        failed: { sceneId: string; error: string }[];
        assemblyAvailable: boolean;
        message?: string;
      }
    >(`/projects/${id}/render`, { method: "POST", body: JSON.stringify({ sceneIds, retry }) }),

  renderStatus: (id: string) =>
    request<
      ProjectPayload & {
        readyToAssemble: boolean;
        renderedScenes: number;
        totalScenes: number;
        totalDurationSeconds: number;
      }
    >(`/projects/${id}/render`),

  cancelJob: (id: string, jobId: string) =>
    request<{ cancelled: boolean; providerCancelled: boolean; message: string }>(
      `/projects/${id}/render?jobId=${encodeURIComponent(jobId)}`,
      { method: "DELETE" },
    ),

  exportVideo: (
    id: string,
    body: { aspectRatio?: string; resolution?: string; kind?: "preview" | "final" },
  ) =>
    request<
      ProjectPayload & {
        export: {
          kind: string;
          aspectRatio: string;
          resolution: string;
          width: number;
          height: number;
          verifiedDurationSeconds: number | null;
          probeSource: string | null;
          codec: string;
        };
      }
    >(`/projects/${id}/export`, { method: "POST", body: JSON.stringify(body) }),

  share: (id: string) =>
    request<{ shareSlug: string; shareUrl: string; shareEnabled: boolean }>(`/projects/${id}/share`, {
      method: "POST",
    }),

  unshare: (id: string) =>
    request<{ shareEnabled: boolean; shareSlug: null }>(`/projects/${id}/share`, { method: "DELETE" }),

  listVersions: (id: string) =>
    request<{ versions: { version: number; label: string | null; created_at: string }[]; current: number }>(
      `/projects/${id}/versions`,
    ),

  restoreVersion: (id: string, version: number) =>
    request<ProjectPayload & { restoredFrom: number }>(`/projects/${id}/versions`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),

  addComment: (id: string, body: string, sceneId: string | null, shareSlug?: string) =>
    request<{ comment: StudioComment }>(`/projects/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, sceneId, shareSlug }),
    }),

  resolveComment: (id: string, commentId: string, resolved: boolean) =>
    request<{ updated: boolean }>(`/projects/${id}/comments`, {
      method: "PATCH",
      body: JSON.stringify({ commentId, resolved }),
    }),

  summaryUrl: (id: string) => `${BASE}/projects/${id}/summary`,
};
