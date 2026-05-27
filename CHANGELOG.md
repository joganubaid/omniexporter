# Changelog

Notable changes to OmniExporter. Newest first. Dates are when the change
landed, not when it was released to the store.

## 5.5.0 - 2026-05-27

### Fixed

- Gemini long chats exported only the most recent 10 messages. The detail
  request now asks for 100, matching what Gemini's own frontend requests.
  (joganubaid)
- Gemini URL extraction broke when Google dropped the `c_` prefix from chat
  URLs. Both forms are accepted now and normalised before dedup checks.
  (Mohammed saddik)
- ChatGPT reasoning and `thoughts` content was dropped from exports. These
  render as a quoted "Reasoning" block now. (joganubaid)
- Grok web-search sources, generated images, and file attachments were lost
  to field-name mismatches. Fixed and tightened to prefer sources actually
  cited inline. (Mohammed saddik)
- DeepSeek file attachments (PDFs, docs) vanished from exports because the
  `FILE` fragment type was unhandled. (joganubaid)
- Perplexity stripped newer block types (agent steps, workflow deltas) since
  the request was missing newer use-case flags. Expanded to the full set the
  frontend sends. (Mohammed saddik)

### Changed

- OAuth tokens moved from session storage to local storage so they survive
  browser restarts. Notion tokens do not expire, so the synthetic one-hour
  expiry forcing hourly reconnects is gone. (joganubaid)
- OAuth flow artifacts (state, PKCE verifier) moved to session storage so
  abandoned flows leave nothing on disk. (Mohammed saddik)
- Background auto-sync no longer opens a login window on its own. Expired
  tokens set a badge; you reconnect when you choose to. (joganubaid)
- PKCE verifier generation switched from hex to base64url for denser
  entropy. (Mohammed saddik)

### Improved

- Per-platform exported-UUID stores replace one shared list. Faster reads,
  legacy keys migrate on the fly. (joganubaid)
- Notion database schema cached for 24 hours. A 50-thread sync used to make
  50 schema calls; now one. (Mohammed saddik)
- Jitter added to Notion backoff retries to avoid retry storms.
  (joganubaid)
- Per-batch progress feedback during bulk Notion sync. (Mohammed saddik)
- All six adapters routed through the traced fetch wrapper for consistent
  logging. (joganubaid)

## 5.4.0 - 2026-03-16

### Added

- Shared entry-metadata extraction used by every export format: sources,
  media, knowledge cards, attachments, and related follow-up questions are
  pulled out of adapter entries in one place. (Mohammed saddik)
- Markdown exports gained frontmatter-safe YAML, deduplicated source links,
  and attachment listings. (joganubaid)
- HTML exports render thinking blocks, tool calls, and tool results as
  structured entries carry through to the JSON export. (Mohammed saddik)

## 5.3.0 - 2026-03-16

### Added

- Notion block builder: converts markdown to rich Notion blocks with inline
  formatting, headings, tables, equations, images, callouts, bookmarks, and
  toggle blocks. Tool calls become toggles with JSON children, thinking
  blocks become callouts, and long text is chunked to Notion's limits.
  (joganubaid)
- Adapter metadata enrichment: model names, modes, citations, and session
  info now flow through from all six platforms. (Mohammed saddik)

## 5.2.0 - 2026-02-19

### Added

- Debounced search input in the dashboard. (joganubaid)
- HTTP 429 handling with `Retry-After` support on the OAuth token endpoints.
  (Mohammed saddik)

### Security

- `X-Content-Type-Options: nosniff` on all extension pages. (joganubaid)
- JSDoc and strict-mode cleanup across the adapters. (Mohammed saddik)

## 5.1.0 - 2026-02-19

### Security

- Removed accidentally committed user data files and added ignore patterns
  for HAR dumps and response files. (joganubaid)
- Fixed the broken token refresh path that referenced config fields which do
  not exist; refreshes now route through the Cloudflare worker so the client
  secret stays server-side. (Mohammed saddik)
- Tightened web-accessible resources from all-URLs to the specific platform
  origins that need them. (joganubaid)
- Origin validation on the Gemini page-bridge messaging, and UUID checks at
  content-script entry points. (Mohammed saddik)

### Changed

- Source tree reorganised from a flat root into `src/` with `adapters/`,
  `utils/`, and `ui/`. No functional changes. (joganubaid)

## 5.0.0 - 2026-01-16

### Added

- Notion OAuth2 with automatic refresh and a fallback to plain integration
  tokens. (joganubaid)
- Cloudflare Worker for the token exchange so the Notion client secret never
  ships in the extension. (Mohammed saddik)
- Platform logo SVGs shown in exports. (Mohammed saddik)

### Fixed

- ChatGPT extraction: three endpoint fallbacks, device-id header handling,
  and updated message parsing for the 2024 UI. (joganubaid)
- Gemini extraction: multiple RPC id attempts and payload variations with
  stricter response parsing. (Mohammed saddik)
- DeepSeek extraction: token discovery from several storage keys and four
  endpoint fallbacks. (joganubaid)

## 4.2.0 - 2025-11-08

- Dashboard for bulk operations, per-thread selection, and auto-sync
  scheduling. (joganubaid, Mohammed saddik)
- JSON export alongside Markdown. (Mohammed saddik)

## 4.0.0 - 2025-09-14

- Automatic background sync on an interval, with duplicate detection so
  conversations are not exported twice. (joganubaid)
- Context-menu export actions and sync checkpointing. (Mohammed saddik)

## 3.0.0 - 2025-06-30

- Claude, Grok, and DeepSeek support. (joganubaid, Mohammed saddik)

## 2.0.0 - 2025-04-02

- Notion integration: page creation, database selection, block batching at
  Notion's 100-block limit. (Mohammed saddik)
- ChatGPT and Gemini support. (joganubaid)

## 1.0.0 - 2025-01-20

- Initial release: Perplexity export to Markdown with YAML frontmatter.
  (joganubaid, Mohammed saddik)
