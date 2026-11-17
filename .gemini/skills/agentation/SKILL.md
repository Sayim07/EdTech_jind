---
name: agentation
description: "Visual feedback and UI annotation loop using Agentation. Use when the user wants to inspect, watch, or fix visual feedback, click-to-edit annotations, or design adjustments submitted from the localhost browser toolbar via the agentation MCP server."
---

# Agentation Visual Feedback & Annotation Fix-Loop

This skill guides the agent to autonomously receive, inspect, implement, and resolve visual UI annotations submitted by the user through the Agentation browser toolbar.

---

## 1. Zero-Leak Localhost Integration (Never Ship to Production)

The Agentation popup toolbar must **ONLY** render in local development (`localhost` / `127.0.0.1`) and must **NEVER** be included in production builds or deployed sites.

### Option A: Next.js / React (App Router or Pages Router)

Install the package as a `devDependency`:
```bash
npm install -D agentation
```

In your root layout (`app/layout.tsx` or `pages/_app.tsx`), conditionally render `<Agentation />` strictly when `process.env.NODE_ENV === 'development'`:

```tsx
import { Agentation } from 'agentation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body>
        {children}
        {isDev && <Agentation endpoint="http://localhost:4747" />}
      </body>
    </html>
  );
}
```
> **Bundler Guarantee**: Modern bundlers (Webpack, Turbopack, Vite) statically replace `process.env.NODE_ENV === 'development'` with `false` during `npm run build`, causing tree-shaking to eliminate the entire Agentation bundle from the production deployment.

---

### Option B: Vite (React / Vue / Svelte)

Use Vite's compile-time boolean `import.meta.env.DEV`:

```tsx
import { Agentation } from 'agentation';

export default function App() {
  return (
    <>
      <MainApp />
      {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
    </>
  );
}
```

---

### Option C: Plain HTML / Static Sites / Vanilla JS

Add this lightweight script snippet before the closing `</body>` tag. It checks `location.hostname` at runtime and will **never execute or fetch Agentation on production domains**:

```html
<!-- Agentation Dev-Only Toolbar: Automatically excluded in production -->
<script>
  (function() {
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/agentation/dist/agentation.min.js';
      script.async = true;
      script.onload = function() {
        if (window.Agentation) {
          window.Agentation.init({ endpoint: 'http://localhost:4747' });
        }
      };
      document.body.appendChild(script);
    }
  })();
</script>
```

---

## 2. Agentation MCP Server Workflow

The `agentation` MCP server is installed and exposes the following tools:

| MCP Tool | Purpose |
|---|---|
| `agentation_watch_annotations` | Blocks until user creates annotations in the browser, returns batch |
| `agentation_get_all_pending` | Fetches all currently pending/unresolved annotations across sessions |
| `agentation_get_pending` | Fetches pending annotations for a specific session |
| `agentation_acknowledge` | Marks annotation as seen/acknowledged (shows feedback status to user) |
| `agentation_resolve` | Marks annotation as resolved after code change with summary |
| `agentation_reply` | Sends a message back to the annotation thread in the browser |
| `agentation_dismiss` | Dismisses invalid or non-actionable feedback with a reason |
| `agentation_list_sessions` | Lists connected active browser tabs/sessions |

---

## 3. The Autonomous Fix Loop

When the user asks to "watch annotations", "fix annotations", or "start agentation loop":

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. Call agentation_watch_annotations or                │
 │    agentation_get_all_pending                          │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. For each annotation in batch:                       │
 │    a. Call agentation_acknowledge(annotationId)        │
 │    b. Read comment, element, elementPath, & URL        │
 │    c. Locate corresponding source file & line          │
 │    d. Apply code edit (respecting project rules)       │
 │    e. Call agentation_resolve(annotationId, summary)   │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Repeat watch loop until user requests stop or exits │
 └────────────────────────────────────────────────────────┘
```

### Step-by-Step Processing:

1. **Acknowledge First**:
   Immediately call `agentation_acknowledge(annotationId)` so the user's browser UI confirms the agent is acting on their click.

2. **Analyze Context**:
   - `comment`: What the user wants to change.
   - `element`: The HTML tag/markup selected.
   - `elementPath`: CSS selector or DOM hierarchy path.
   - `reactComponents`: Component hierarchy (if React).
   - `url`: The page route where the issue was spotted.

3. **Locate & Edit Source**:
   - Use search or grep to locate the component or template matching the element selector/text.
   - Apply clean, precise code changes.
   - Ensure the change respects project UI standards (e.g. Impeccable craft rules).

4. **Resolve**:
   - Call `agentation_resolve(annotationId, summary)` with a 1-sentence description of the fix (mentioning file name and changes).

5. **Clarification**:
   - If user instructions are ambiguous, call `agentation_reply(annotationId, message)` to ask directly in the toolbar thread before making guessing edits.
