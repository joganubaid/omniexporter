#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
let errors = 0;

function logError(msg) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    errors++;
}

function logOk(msg) {
    console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
}

console.log('--- OmniExporter Linter & Health Check ---');

// 1. Check all JavaScript files syntax
function checkJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
                checkJsFiles(fullPath);
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            try {
                execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
            } catch (err) {
                logError(`Syntax error in ${path.relative(ROOT_DIR, fullPath)}: ${err.message}`);
            }
        }
    }
}

console.log('1. Checking JavaScript syntax...');
checkJsFiles(ROOT_DIR);
if (errors === 0) logOk('All JavaScript files have valid syntax');

// 2. Validate manifest.json
console.log('2. Validating manifest.json...');
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
const packagePath = path.join(ROOT_DIR, 'package.json');

if (!fs.existsSync(manifestPath)) {
    logError('manifest.json is missing');
} else {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        if (manifest.manifest_version !== 3) {
            logError(`manifest_version must be 3, found: ${manifest.manifest_version}`);
        }

        if (manifest.version !== pkg.version) {
            logError(`Version mismatch: manifest.json is ${manifest.version}, package.json is ${pkg.version}`);
        }

        // Check background
        if (manifest.background && manifest.background.service_worker) {
            const swPath = path.join(ROOT_DIR, manifest.background.service_worker);
            if (!fs.existsSync(swPath)) logError(`Service worker file missing: ${manifest.background.service_worker}`);
        }

        // Check options_page
        if (manifest.options_page) {
            const optPath = path.join(ROOT_DIR, manifest.options_page);
            if (!fs.existsSync(optPath)) logError(`Options page missing: ${manifest.options_page}`);
        }

        // Check action popup & icons
        if (manifest.action?.default_popup) {
            const popupPath = path.join(ROOT_DIR, manifest.action.default_popup);
            if (!fs.existsSync(popupPath)) logError(`Popup HTML missing: ${manifest.action.default_popup}`);
        }

        if (manifest.icons) {
            for (const [size, iconRelPath] of Object.entries(manifest.icons)) {
                const iconPath = path.join(ROOT_DIR, iconRelPath);
                if (!fs.existsSync(iconPath)) logError(`Icon ${size} missing at ${iconRelPath}`);
            }
        }

        // Check content_scripts
        if (Array.isArray(manifest.content_scripts)) {
            for (const cs of manifest.content_scripts) {
                for (const jsFile of cs.js || []) {
                    const jsPath = path.join(ROOT_DIR, jsFile);
                    if (!fs.existsSync(jsPath)) logError(`Content script missing: ${jsFile}`);
                }
            }
        }

        if (errors === 0) logOk('manifest.json structure and file references verified');
    } catch (e) {
        logError(`Failed to parse manifest.json: ${e.message}`);
    }
}

// 3. Validate HTML references
console.log('3. Validating HTML resource references...');
const htmlFiles = [
    'src/ui/popup.html',
    'src/ui/options.html',
    'auth/callback.html'
];

for (const relHtml of htmlFiles) {
    const fullHtmlPath = path.join(ROOT_DIR, relHtml);
    if (!fs.existsSync(fullHtmlPath)) continue;
    const content = fs.readFileSync(fullHtmlPath, 'utf8');
    const htmlDir = path.dirname(fullHtmlPath);

    // Extract script src
    const scriptMatches = content.matchAll(/<script[^>]+src=["']([^"']+)["']/g);
    for (const match of scriptMatches) {
        const src = match[1];
        if (src.startsWith('http://') || src.startsWith('https://')) continue;
        const resolved = path.resolve(htmlDir, src);
        if (!fs.existsSync(resolved)) {
            logError(`${relHtml}: missing referenced script "${src}" (resolved: ${path.relative(ROOT_DIR, resolved)})`);
        }
    }

    // Extract link href (stylesheets)
    const linkMatches = content.matchAll(/<link[^>]+href=["']([^"']+)["']/g);
    for (const match of linkMatches) {
        const href = match[1];
        if (href.startsWith('http://') || href.startsWith('https://')) continue;
        const resolved = path.resolve(htmlDir, href);
        if (!fs.existsSync(resolved)) {
            logError(`${relHtml}: missing referenced stylesheet "${href}" (resolved: ${path.relative(ROOT_DIR, resolved)})`);
        }
    }
}

if (errors === 0) {
    logOk('All HTML script and stylesheet references are valid');
    console.log('\n\x1b[32m✔ Linter passed with 0 errors.\x1b[0m\n');
    process.exit(0);
} else {
    console.error(`\n\x1b[31m✖ Linter failed with ${errors} error(s).\x1b[0m\n`);
    process.exit(1);
}
