# OmniExporter

A Chrome extension for exporting your own conversation history from AI chat
platforms. It works with Perplexity, ChatGPT, Claude, Gemini, Grok, and
DeepSeek, and can save chats as Markdown or JSON, or copy them into a Notion
database.

The extension talks to the same APIs the web apps themselves use, so exports
include the full conversation history rather than only what happens to be
rendered in the sidebar. Nothing is uploaded anywhere by us: your browser
session cookies are used for authentication, and data goes either straight to
a file on disk or directly to Notion with your own credentials.

## Why

Most chat platforms make it awkward to get your own data back out. Some have
a data-export feature buried in settings that emails you a zip days later;
others have nothing at all. If you keep notes, receipts, or research in these
tools, there is no easy way to move a conversation into Notion or into a
plain folder of markdown files. This extension exists to fill that gap.

## Supported platforms

| Platform  | Extraction method                                   | Notes                                   |
|-----------|-----------------------------------------------------|-----------------------------------------|
| Perplexity | REST API with cursor pagination                    | Includes knowledge cards and media      |
| ChatGPT   | `backend-api` conversations + tree-mapping parser   | Handles GPT-5 reasoning blocks          |
| Claude    | Organization-scoped V2 API                          | Exports thinking and tool-use blocks    |
| Gemini    | Internal `batchexecute` RPC layer                   | Uses the page's own session parameters  |
| Grok      | `rest/app-chat` endpoints                           | History capped at ~60 items by Grok     |
| DeepSeek  | `chat_session` API with fragment parser             | Handles file attachments and R1 thinking |

All extraction happens inside the tab you are logged in with. If an API call
fails, the extension tells you to refresh the tab rather than quietly
scraping a partial list from the page.

## Features

- Export the current conversation or select many from a dashboard
- Markdown files with YAML frontmatter, or structured JSON
- Sync conversations to a Notion database, page by page or in bulk
- Automatic background sync on a schedule you pick (default: hourly)
- OAuth2 login for Notion, with the client secret kept on a small Cloudflare
  Worker so it never ships inside the extension
- Duplicate detection, so a conversation is not exported twice
- A log viewer for debugging failed exports
- Keyboard shortcuts: `Alt+Shift+E` opens the popup, `Alt+Shift+D` the
  dashboard

## Installation

You will need Chrome or Edge. The extension is not on the Chrome Web Store
yet, so for now:

1. Clone or download this repository.
2. Run `cp config.example.js config.js` and edit it (see Configuration).
3. Open `chrome://extensions/`, enable Developer mode, click **Load
   unpacked**, and select the repository folder.
4. Pin the extension to your toolbar and log in to the chat platforms you
   use, in the same browser profile.

No build step is required. The extension is plain JavaScript loaded straight
from the source tree.

## Configuration

`config.js` holds two values:

- `NOTION_CLIENT_ID` — the public client ID of your Notion integration, from
  [notion.so/my-integrations](https://www.notion.so/my-integrations).
- `OAUTH_SERVER_URL` — the URL of the Cloudflare Worker that completes the
  OAuth token exchange. Deploy your own using the guide in
  [`cloudflare-worker/DEPLOY.md`](cloudflare-worker/DEPLOY.md). The client
  secret lives only in that worker, never in this repository.

If you would rather not set up OAuth at all, you can paste a Notion
integration token directly in the extension options instead. Both paths are
supported; the options page explains each one.

The extension itself needs no per-platform configuration. It uses whatever
login session the browser already has.

## Usage

Export the conversation you have open: click the toolbar icon, pick Markdown
or JSON, or press **Save to Notion**.

Export many conversations: open the dashboard (`Alt+Shift+D`), page through
your history, tick the ones you want, and use the bulk action bar at the
bottom. Each platform paginates differently and the dashboard buffers ahead
where an API only exposes a small page size.

Automatic syncing: turn it on in the options page and pick an interval. New
conversations are picked up in the background and pushed to Notion, and
anything already exported is skipped.

## Project structure

```
omniexporter/
├── manifest.json              Extension manifest (MV3)
├── config.example.js          Copy to config.js and fill in
├── src/
│   ├── background.js          Service worker: alarms, menus, sync jobs
│   ├── content.js             Message router between page and adapters
│   ├── platform-config.js     Endpoint registry and version detection
│   ├── adapters/              One module per chat platform
│   ├── utils/                 Export manager, logger, block builder, helpers
│   └── ui/                    Popup and dashboard
├── auth/                      Notion OAuth2 module and redirect page
├── cloudflare-worker/         Token-exchange worker and deployment guide
├── docs/                      API references, validation notes, architecture
└── icons/                     Extension and platform icons
```

## Known limitations

- MV3 service workers stop after roughly 30 seconds of idle time. All state
  lives in `chrome.storage` and background work is driven by alarms, so this
  is invisible in practice, but it does mean there is no long-lived
  connection to the platforms.
- Notion accepts at most 100 blocks per request. Long conversations are
  written across several requests, which is handled for you.
- Grok only exposes about 60 conversations of history through its API. That
  limit belongs to Grok and there is no workaround.
- If Notion is behind a Cloudflare challenge, sync fails with a clear error
  asking you to refresh the Notion tab. Extraction from the chat platforms
  is unaffected.

## Contributing

Bug reports and pull requests are welcome. Have a look at
[CONTRIBUTING.md](CONTRIBUTING.md) for how the adapters are wired up and what
a new platform integration needs. Security issues are handled separately,
see [SECURITY.md](SECURITY.md).

## Authors

Built and maintained by [joganubaid](https://github.com/joganubaid) and
[Mohammed saddik](https://github.com/Mohammedsaddik4689). Both worked across
every layer of the codebase.

## License

[MIT](LICENSE)
