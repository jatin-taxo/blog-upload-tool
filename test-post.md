---
slug: "getting-started-with-nextjs"
title: "Getting Started with Next.js"
description: "A beginner-friendly guide to building modern web applications with Next.js, covering setup, routing, and deployment."
author: "Soumya Mukherjee"
date: "2026-02-11"
coverImage: "/images/blogs/nextjs-getting-started.jpg"
tags: ["nextjs", "react", "web-development"]
---

# Getting Started with Next.js

Next.js has become one of the most popular frameworks for building React applications. In this post, we'll walk through the basics and get you up and running.

## Why Next.js?

There are several reasons developers love Next.js:

- **Server-side rendering** out of the box
- **File-based routing** that just works
- **API routes** for backend logic
- Built-in **image optimization**
- Zero-config **TypeScript** support

> Next.js gives you the best developer experience with all the features you need for production.

![Next.js homepage](https://assets.vercel.com/image/upload/v1662130559/nextjs/Icon_dark_background.png)

## Setting Up Your First Project

Getting started is simple. Run the following command:

```bash
npx create-next-app@latest my-app
cd my-app
npm run dev
```

This will scaffold a new project with all the defaults configured.

## Project Structure

Here's what a typical Next.js project looks like:

| Directory | Purpose |
|-----------|---------|
| `src/app` | App router pages and layouts |
| `public` | Static assets |
| `src/components` | Reusable UI components |
| `src/lib` | Utility functions |

## Your First Page

Create a file at `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main>
      <h1>Hello, Next.js!</h1>
      <p>Welcome to your first page.</p>
    </main>
  );
}
```

That's it — no router config, no boilerplate. Just export a component and Next.js handles the rest.

## What's Next?

1. Learn about **dynamic routes** with `[slug]` folders
2. Explore **server components** vs client components
3. Add a database with **Prisma** or **Drizzle**
4. Deploy to **Vercel** with a single click

Happy coding!
