// OmniExporter — OAuth Callback Handler
"use strict";

(async function () {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        const statusEl = document.getElementById('status');

        if (error) {
            if (statusEl) statusEl.textContent = `Error: ${errorDescription || error}`;
            setTimeout(() => window.close(), 3000);
            return;
        }

        if (code) {
            if (statusEl) statusEl.textContent = 'Authorization successful! Completing setup...';

            // chrome.identity.launchWebAuthFlow captures this URL
            // and returns the code back to the extension
            setTimeout(() => {
                if (statusEl) statusEl.textContent = 'You can close this window';
                window.close();
            }, 2000);
        } else {
            if (statusEl) statusEl.textContent = 'No authorization code received';
            setTimeout(() => window.close(), 3000);
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = 'An error occurred';
        setTimeout(() => window.close(), 3000);
    }
})();
