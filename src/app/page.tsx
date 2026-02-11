"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import matter from "gray-matter";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Status =
  | { type: "idle" }
  | { type: "publishing" }
  | { type: "success"; slug: string; isUpdate: boolean }
  | { type: "error"; message: string }
  | { type: "conflict"; slug: string };

type Frontmatter = Record<string, unknown>;

const REQUIRED_FIELDS = ["title", "date", "description", "slug"];

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [frontmatter, setFrontmatter] = useState<Frontmatter | null>(null);
  const [body, setBody] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setAuthenticated(true);
    } else {
      setAuthError("Wrong password. Please try again.");
    }
    setAuthLoading(false);
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".md")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      setFileName(file.name);
      setStatus({ type: "idle" });

      try {
        const { data, content } = matter(text);
        setFrontmatter(data);
        setBody(content);
        setMissingFields(REQUIRED_FIELDS.filter((f) => !data[f]));
      } catch {
        setFrontmatter(null);
        setBody(text);
        setMissingFields(REQUIRED_FIELDS);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleClear = () => {
    setFileContent(null);
    setFileName(null);
    setFrontmatter(null);
    setBody("");
    setMissingFields([]);
    setStatus({ type: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = async (overwrite = false) => {
    if (!fileContent) return;
    setStatus({ type: "publishing" });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileContent, overwrite }),
      });

      const data = await res.json();

      if (res.status === 409 && data.conflict) {
        setStatus({ type: "conflict", slug: data.message });
        return;
      }

      if (!res.ok) {
        setStatus({ type: "error", message: data.error });
        return;
      }

      setStatus({
        type: "success",
        slug: data.slug,
        isUpdate: data.isUpdate,
      });
    } catch {
      setStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  };

  const canPublish = missingFields.length === 0 && fileContent !== null;

  // Loading state
  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800" />
      </div>
    );
  }

  // Auth gate
  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-zinc-900">
            Blog Uploader
          </h1>
          <p className="text-sm text-zinc-500">
            Enter the password to continue.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            autoFocus
          />
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading || !password}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {authLoading ? "Checking..." : "Log In"}
          </button>
        </form>
      </div>
    );
  }

  // Main upload interface
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        Blog Uploader
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Upload a markdown file to publish a new blog post.
      </p>

      {/* Drop zone */}
      {!fileContent && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            dragging
              ? "border-zinc-500 bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
          }`}
        >
          <svg
            className="mb-3 h-10 w-10 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-zinc-700">
            Drop your .md file here or click to browse
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Only markdown files accepted
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* File loaded */}
      {fileContent && (
        <div className="space-y-6">
          {/* File header */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <span className="text-sm font-medium text-zinc-700">
              {fileName}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-zinc-500 hover:text-zinc-800"
            >
              Clear
            </button>
          </div>

          {/* Validation warnings */}
          {missingFields.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                Missing required fields:{" "}
                {missingFields.join(", ")}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                Add these to the frontmatter at the top of your markdown file.
              </p>
            </div>
          )}

          {/* Frontmatter display */}
          {frontmatter && Object.keys(frontmatter).length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                Post Details
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {Object.entries(frontmatter).map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="font-medium text-zinc-500 capitalize">
                      {key}
                    </dt>
                    <dd className="text-zinc-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Markdown preview */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Preview
            </h2>
            <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-a:text-blue-600">
              <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
            </div>
          </div>

          {/* Status messages */}
          {status.type === "publishing" && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" />
              <span className="text-sm text-zinc-700">Publishing...</span>
            </div>
          )}

          {status.type === "success" && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4">
              <p className="text-sm font-medium text-green-800">
                {status.isUpdate ? "Post updated" : "Post published"}{" "}
                successfully!
              </p>
              <p className="mt-1 text-sm text-green-700">
                It will be live at{" "}
                <span className="font-medium">
                  taxocity.com/blog/{status.slug}
                </span>
              </p>
              <p className="mt-1 text-xs text-green-600">
                The site may take a minute to rebuild.
              </p>
            </div>
          )}

          {status.type === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-800">{status.message}</p>
              <button
                type="button"
                onClick={() => handlePublish()}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          )}

          {status.type === "conflict" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                A post with this slug already exists.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => handlePublish(true)}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                >
                  Overwrite
                </button>
                <button
                  type="button"
                  onClick={() => setStatus({ type: "idle" })}
                  className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Publish button */}
          {status.type !== "publishing" && status.type !== "success" && (
            <button
              type="button"
              onClick={() => handlePublish()}
              disabled={!canPublish}
              className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publish
            </button>
          )}
        </div>
      )}
    </div>
  );
}
