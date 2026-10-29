#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Read version from manifest.json
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '5.5.0';

if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

const zipFileName = `omniexporter-v${version}.zip`;
const zipFilePath = path.join(DIST_DIR, zipFileName);

if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath);
}

console.log(`Packaging OmniExporter v${version}...`);

// Files and folders to include in distribution zip
const includeItems = [
    'manifest.json',
    'config.example.js',
    'config.js',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'src',
    'auth',
    'icons'
];

// Build zip command
const cmd = `zip -r "${zipFilePath}" ${includeItems.join(' ')} -x "*.DS_Store" "*__pycache__*" "*.swp" "*~"`;

try {
    execSync(cmd, { cwd: ROOT_DIR, stdio: 'pipe' });
    const stat = fs.statSync(zipFilePath);
    const fileBuffer = fs.readFileSync(zipFilePath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    console.log(`\n\x1b[32m✔ Extension packaged successfully!\x1b[0m`);
    console.log(`Archive:  ${zipFilePath}`);
    console.log(`Size:     ${(stat.size / 1024).toFixed(2)} KB (${stat.size} bytes)`);
    console.log(`SHA-256:  ${sha256}\n`);
} catch (e) {
    console.error(`\x1b[31mFailed to create package:\x1b[0m ${e.message}`);
    process.exit(1);
}
