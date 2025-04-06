# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.5.x   | Yes, current |
| 5.4.x   | Upgrade recommended |
| < 5.4   | No longer supported |

## Security Practices

### Authentication
- Notion OAuth2 client secret is stored server-side on the Cloudflare Worker, never exposed in the extension
- OAuth tokens stored in `chrome.storage.local` (file-backed under your Chrome profile; encrypted at rest where the OS keyring is available - macOS Keychain, Windows DPAPI, Linux libsecret/kwallet - and plain on platforms without a keyring). In-flight OAuth artifacts (state, PKCE verifier) live in `chrome.storage.session` and are wiped on browser restart.
- **PKCE:** Authorization flows use PKCE with S256 code challenge; verifier is base64url-encoded 32-byte random.
- **Token refresh:** Notion OAuth does not support refresh tokens. When a token expires:
  - **User-initiated calls** (Options page "Reconnect", Test Connection) re-open the OAuth flow via `chrome.identity.launchWebAuthFlow({interactive: true})`. The user sees Notion's authorize page if they're logged in elsewhere, otherwise the standard login.
  - **Background auto-sync calls** never open a window unprompted. Instead, they set a `notion_reauth_required` flag and a red lock badge on the action icon. The user reconnects on their own time by opening the extension and clicking the Connect button.
- Bearer tokens for ChatGPT are fetched per-session from the auth endpoint and cached with TTL

### Content Security Policy
- `script-src 'self'` - no remote script execution
- `style-src 'self' 'unsafe-inline'` - `'unsafe-inline'` is required because `src/ui/options.html` uses inline `style=""` attributes in the dev tools section. Moving these to CSS classes is a known cleanup.
- `connect-src` limited to known API domains, including the specific OAuth worker URL rather than a wildcard
- `object-src 'self'` - no plugin-based content

### Input Validation
- All UUIDs validated with `SecurityUtils.isValidUuid()` before reaching API calls
- User-controlled strings escaped via `escapeHtml()` / `InputSanitizer.clean()` before any `innerHTML` interpolation in `options.js` to prevent XSS
- `postMessage` listeners validate `event.origin` against expected platform domains

### Permissions (Principle of Least Privilege)
- `web_accessible_resources` scoped to specific platform origins (not `<all_urls>`)
- `host_permissions` limited to the 8 supported platform domains + Notion API
- `downloads` is an optional permission (not required by default)

### Data Handling
- No user conversation data is stored by the extension itself
- Exports are generated client-side and saved locally or to the user's own Notion workspace
- No telemetry, analytics, or data collection

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue.**
2. Use GitHub's private vulnerability reporting:
   https://github.com/joganubaid/omniexporter/security/advisories/new
3. Include: description, reproduction steps, affected version(s), and potential impact.
4. Expected initial response: within 7 days. Critical issues are prioritised. Some issue classes may need coordinated disclosure with the chat platform vendors before a public fix can land.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for security-related changes in each version.
