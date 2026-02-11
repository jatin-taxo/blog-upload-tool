import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import matter from "gray-matter";
import { checkFileExists, commitFile } from "@/lib/github";

const REQUIRED_FIELDS = ["title", "date", "description", "slug"];

export async function POST(request: Request) {
  // Check auth
  const cookieStore = await cookies();
  const auth = cookieStore.get("blog-auth");
  if (auth?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, overwrite } = await request.json();

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Missing file content" },
      { status: 400 },
    );
  }

  // Parse and validate frontmatter
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse markdown frontmatter" },
      { status: 400 },
    );
  }

  const missing = REQUIRED_FIELDS.filter((field) => !parsed.data[field]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required frontmatter fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const slug = String(parsed.data.slug);
  const path = `content/blogs/${slug}.md`;

  // Check if file exists
  const existing = await checkFileExists(slug);

  if (existing.exists && !overwrite) {
    return NextResponse.json(
      {
        conflict: true,
        message: `A post with slug "${slug}" already exists. Do you want to overwrite it?`,
      },
      { status: 409 },
    );
  }

  // Commit to GitHub
  const isUpdate = existing.exists && overwrite;
  const commitMessage = isUpdate ? `blog: update ${slug}` : `blog: add ${slug}`;

  try {
    await commitFile(path, content, commitMessage, existing.sha);
  } catch (error: unknown) {
    console.error("GitHub commit failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to commit to GitHub";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    slug,
    isUpdate,
  });
}
