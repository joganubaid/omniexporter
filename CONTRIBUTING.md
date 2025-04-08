# Contributing to OmniExporter

Thanks for wanting to help. This document covers the setup you need, how the
code is organised, and what we look for in a pull request.

## Development setup

You need Chrome or Edge and nothing else. There is no bundler, no package
install, no build step.

1. Clone the repository:

   ```bash
   git clone https://github.com/joganubaid/omniexporter.git
   cd omniexporter
   ```

2. Copy the config template and fill in your values:

   ```bash
   cp config.example.js config.js
   ```

3. Load the extension at `chrome://extensions/` with Developer mode on.

4. After changing source files, hit reload on the extension card and refresh
   any tabs the content scripts run on.

For debugging the background work, click "service worker" on the extension
card to open its console. For the dashboard and popup, use the normal page
DevTools on those windows.

## How the code is organised

```
src/
├── background.js          Service worker: alarms, context menus, sync jobs
├── content.js             Message router between the page and adapters
├── platform-config.js     Endpoint registry and version detection
├── adapters/              One file per platform
├── utils/                 Export manager, logger, block builder, helpers
└── ui/                    Popup and dashboard
```

Each adapter implements the same small contract:

- `name` - platform identifier string
- `extractUuid(url)` - conversation id from the page URL
- `getThreads(page, limit)` - paginated conversation list
- `getThreadDetail(uuid)` - full conversation content

Everything else the adapter needs is in `src/platform-config.js` or its own
file. If the platform changes an endpoint, that is usually a one-line change
in the config registry rather than a hunt through the adapter.

## Ground rules

- Extraction goes through the platforms' own APIs, not sidebar DOM scraping.
  The sidebars are virtualised, so scraping silently drops most of the
  history. Verify new adapters against captured traffic.
- If an API call fails, surface a clear error. Do not fall back to scraping
  a partial view.
- Validate user-controlled values before inserting them into HTML. The
  existing code escapes at every injection point; keep it that way.
- Keep the permission set minimal. If a change needs a new host permission,
  say why in the pull request.
- Match the existing code style: plain JavaScript, no framework, no build
  step, semicolons, single quotes.

## Testing a change

Run through this before opening a pull request:

1. Export a single conversation as Markdown and as JSON.
2. Sync a conversation to Notion and check the page looks right.
3. Use bulk export with at least two pages of history on one platform.
4. Reload the extension and confirm settings survive.
5. If you touched an adapter, test both the list and the detail paths on
   that platform.

Grok is capped at roughly 60 conversations by Grok's own API, so bulk tests
there will stop early. That is expected.

## Pull requests

- One logical change per pull request.
- Describe what you changed and how you tested it.
- If you fixed a bug, mention what triggered it.
- Update the docs if you changed behaviour. The API reference files under
  `docs/` describe what each platform returns; keep them honest.

## Reporting bugs

Open a GitHub issue with the platform, what you clicked, and what happened.
Include the log viewer output (dashboard, Logs tab) with logging enabled -
the logs are scrubbed of URLs and message content before storage, so they
are safe to paste.

## License

By contributing, you agree that your contributions are licensed under the
MIT license that covers the project.
