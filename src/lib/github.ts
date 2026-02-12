import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const owner = process.env.GITHUB_REPO_OWNER!;
const repo = process.env.GITHUB_REPO_NAME!;
const branch = process.env.GITHUB_BRANCH!;

export async function checkFileExists(
  slug: string,
): Promise<{ exists: boolean; sha?: string }> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: `content/blogs/${slug}.md`,
      ref: branch,
    });

    if (!Array.isArray(data) && data.type === "file") {
      return { exists: true, sha: data.sha };
    }

    return { exists: false };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "status" in error &&
      (error as { status: number }).status === 404
    ) {
      return { exists: false };
    }
    throw error;
  }
}

export async function commitFile(
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch: branch,
    ...(sha ? { sha } : {}),
  });
}
