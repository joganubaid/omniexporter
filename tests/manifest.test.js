'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

describe('manifest.json', () => {
    const manifestPath = path.join(ROOT_DIR, 'manifest.json');
    const packagePath = path.join(ROOT_DIR, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    it('has valid MV3 configuration', () => {
        assert.equal(manifest.manifest_version, 3);
        assert.equal(manifest.name, 'OmniExporter');
        assert.equal(manifest.version, pkg.version);
    });

    it('declares necessary extension permissions', () => {
        const required = ['activeTab', 'storage', 'alarms', 'contextMenus', 'identity'];
        for (const p of required) {
            assert.ok(manifest.permissions.includes(p), `Missing permission: ${p}`);
        }
    });

    it('references existing icon files with non-zero size', () => {
        for (const [size, iconRelPath] of Object.entries(manifest.icons)) {
            const iconPath = path.join(ROOT_DIR, iconRelPath);
            assert.ok(fs.existsSync(iconPath), `Icon file missing: ${iconRelPath}`);
            const stat = fs.statSync(iconPath);
            assert.ok(stat.size > 0, `Icon file is empty: ${iconRelPath}`);
        }
    });

    it('references existing background service worker', () => {
        const swPath = path.join(ROOT_DIR, manifest.background.service_worker);
        assert.ok(fs.existsSync(swPath), `Service worker missing: ${manifest.background.service_worker}`);
    });

    it('references existing popup and options HTML', () => {
        const popupPath = path.join(ROOT_DIR, manifest.action.default_popup);
        assert.ok(fs.existsSync(popupPath), `Popup HTML missing: ${manifest.action.default_popup}`);
        const optPath = path.join(ROOT_DIR, manifest.options_page);
        assert.ok(fs.existsSync(optPath), `Options HTML missing: ${manifest.options_page}`);
    });

    it('references existing content scripts', () => {
        for (const cs of manifest.content_scripts) {
            for (const jsFile of cs.js || []) {
                const jsPath = path.join(ROOT_DIR, jsFile);
                assert.ok(fs.existsSync(jsPath), `Content script missing: ${jsFile}`);
            }
        }
    });
});
