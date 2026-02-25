"use client";
import React, { Component, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

class MdxErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function MdxRenderer({ source }: { source: string }) {
  const [MdxComponent, setMdxComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { evaluate } = await import("@mdx-js/mdx");
        const { Fragment, jsx, jsxs } = await import("react/jsx-runtime");
        const { default: Component } = await evaluate(source, {
          Fragment,
          jsx: jsx as never,
          jsxs: jsxs as never,
          remarkPlugins: [remarkGfm],
        });
        if (!cancelled) setMdxComponent(() => Component);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "MDX compile error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) throw new Error(error);
  if (!MdxComponent)
    return <p className="text-sm text-zinc-400">Rendering preview…</p>;
  return <MdxComponent />;
}

export function MdxPreview({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const fallback = (
    <div className={className}>
      <p className="mb-2 text-xs text-amber-500">
        MDX preview unavailable — showing plain markdown fallback.
      </p>
      <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
    </div>
  );
  return (
    <MdxErrorBoundary fallback={fallback}>
      <div className={className}>
        <MdxRenderer source={source} />
      </div>
    </MdxErrorBoundary>
  );
}
