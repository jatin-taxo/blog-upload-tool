"use client";

import { useCallback, useRef, useState } from "react";
import matter from "gray-matter";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CircleHelp, Copy, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Status =
  | { type: "idle" }
  | { type: "publishing" }
  | { type: "success"; slug: string; isUpdate: boolean }
  | { type: "error"; message: string }
  | { type: "conflict"; slug: string };

type Frontmatter = Record<string, unknown>;

const REQUIRED_FIELDS = [
  "slug",
  "title",
  "description",
  "author",
  "date",
  "coverImage",
  "tags",
];

export default function Home() {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [frontmatter, setFrontmatter] = useState<Frontmatter | null>(null);
  const [body, setBody] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const publishingRef = useRef(false);

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
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
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
    if (!fileContent || publishingRef.current) return;
    publishingRef.current = true;
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
    } finally {
      publishingRef.current = false;
    }
  };

  const canPublish = missingFields.length === 0 && fileContent !== null;

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
            Blog Uploader
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a markdown file to publish a new blog post.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <CircleHelp className="size-4" />
              Setup Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>GitHub Token Setup</DialogTitle>
              <DialogDescription>
                A personal access token lets this tool commit blog posts to your
                GitHub repository.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {/* Step 1 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-zinc-900">1. Open GitHub token settings</h3>
                <p className="text-muted-foreground">
                  Go to{" "}
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
                  >
                    github.com/settings/tokens
                  </a>{" "}
                  and click <strong>Generate new token</strong> (fine-grained).
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-zinc-900">2. Configure the token</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <span><strong>Token name</strong> &mdash; something like <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">blog-uploader</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <span><strong>Expiration</strong> &mdash; choose a duration or set no expiration</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <span><strong>Repository access</strong> &mdash; select <em>Only select repositories</em> and pick your blog repo</span>
                  </li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-zinc-900">3. Set permissions</h3>
                <p className="text-muted-foreground">
                  Under <strong>Repository permissions</strong>, enable:
                </p>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-700">Contents</span>
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">Read and write</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  No other permissions are needed. Click <strong>Generate token</strong> and copy it.
                </p>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-zinc-900">4. Add to environment variables</h3>
                <p className="text-muted-foreground">
                  Set the following variables in your <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">.env.local</code> file
                  or in your hosting provider&apos;s settings:
                </p>
                <div className="relative rounded-md border border-zinc-200 bg-zinc-950 p-4">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    onClick={() =>
                      handleCopy(
                        "GITHUB_TOKEN=ghp_your_token_here\nGITHUB_REPO_OWNER=your-username\nGITHUB_REPO_NAME=your-repo"
                      )
                    }
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                  <pre className="font-mono text-xs leading-relaxed text-zinc-300">
{`GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=your-repo`}
                  </pre>
                </div>
              </div>

              {/* Note */}
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs text-amber-800">
                  <strong>Keep your token secret.</strong> Never commit it to version control.
                  If compromised, revoke it immediately from GitHub settings.
                </p>
              </div>
            </div>

            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </div>

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
          <Card className="flex-row items-center justify-between py-3 px-4">
            <span className="text-sm font-medium">{fileName}</span>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </Card>

          {/* Validation warnings */}
          {missingFields.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTitle>
                Missing required fields: {missingFields.join(", ")}
              </AlertTitle>
              <AlertDescription className="text-amber-600">
                Add these to the frontmatter at the top of your markdown file.
              </AlertDescription>
            </Alert>
          )}

          {/* Frontmatter display */}
          {frontmatter && Object.keys(frontmatter).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                  Post Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  {Object.entries(frontmatter).map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="font-medium text-muted-foreground capitalize">
                        {key}
                      </dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Markdown preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-a:text-blue-600">
                <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
              </div>
            </CardContent>
          </Card>

          {/* Status messages */}
          {status.type === "publishing" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Publishing...</AlertDescription>
            </Alert>
          )}

          {status.type === "success" && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertTitle>
                {status.isUpdate ? "Post updated" : "Post published"}{" "}
                successfully!
              </AlertTitle>
              <AlertDescription className="text-green-700">
                <p>
                  It will be live at{" "}
                  <a
                    href={`https://www.taxocity.com/blog/${status.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-green-900"
                  >
                    taxocity.com/blog/{status.slug}
                  </a>
                </p>
                <p className="text-xs text-green-600">
                  The site may take a minute to rebuild.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {status.type === "error" && (
            <Alert variant="destructive">
              <AlertTitle>{status.message}</AlertTitle>
              <AlertDescription>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handlePublish()}
                  className="h-auto p-0 text-destructive hover:text-destructive/80"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {status.type === "conflict" && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTitle>A post with this slug already exists.</AlertTitle>
              <AlertDescription>
                <div className="mt-2 flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => handlePublish(true)}
                    className="bg-amber-600 text-white hover:bg-amber-700"
                  >
                    Overwrite
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus({ type: "idle" })}
                    className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Publish button */}
          {status.type !== "publishing" && status.type !== "success" && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => handlePublish()}
              disabled={!canPublish}
            >
              Publish
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
