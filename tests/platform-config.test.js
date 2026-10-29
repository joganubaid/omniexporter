'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    PLATFORM_CONFIGS,
    platformConfig
} = require('../src/platform-config.js');

describe('platform-config', () => {
    it('defines configurations for all 6 supported AI platforms', () => {
        const platforms = ['Perplexity', 'ChatGPT', 'Claude', 'Gemini', 'Grok', 'DeepSeek'];
        for (const p of platforms) {
            assert.ok(PLATFORM_CONFIGS[p], `Platform ${p} should be defined`);
            assert.ok(PLATFORM_CONFIGS[p].baseUrl, `Platform ${p} should have baseUrl`);
            assert.ok(PLATFORM_CONFIGS[p].endpoints, `Platform ${p} should have endpoints`);
        }
    });

    describe('UUID extraction', () => {
        it('extracts ChatGPT UUID from URLs', () => {
            assert.equal(
                platformConfig.extractUuid('ChatGPT', 'https://chatgpt.com/c/67123456-1234-5678-1234-567812345678'),
                '67123456-1234-5678-1234-567812345678'
            );
        });

        it('extracts Claude UUID from URLs', () => {
            assert.equal(
                platformConfig.extractUuid('Claude', 'https://claude.ai/chat/abc-def-123-456'),
                'abc-def-123-456'
            );
        });

        it('extracts Perplexity UUID from URLs', () => {
            assert.equal(
                platformConfig.extractUuid('Perplexity', 'https://www.perplexity.ai/search/test-search-slug-12345'),
                'test-search-slug-12345'
            );
        });

        it('extracts Gemini UUID from URLs', () => {
            assert.equal(
                platformConfig.extractUuid('Gemini', 'https://gemini.google.com/app/c_7703f71cf4997935'),
                'c_7703f71cf4997935'
            );
            assert.equal(
                platformConfig.extractUuid('Gemini', 'https://gemini.google.com/app/7703f71cf4997935'),
                '7703f71cf4997935'
            );
        });

        it('extracts Grok UUID from URLs', () => {
            assert.equal(
                platformConfig.extractUuid('Grok', 'https://grok.com/chat/01912345-6789-7000-8000-000000000000'),
                '01912345-6789-7000-8000-000000000000'
            );
        });

        it('extracts DeepSeek UUID from URLs', () => {
            assert.equal(
                platformConfig.extractUuid('DeepSeek', 'https://chat.deepseek.com/a/chat/s/ds-session-12345'),
                'ds-session-12345'
            );
        });
    });

    describe('Endpoint building', () => {
        it('builds endpoint for Perplexity listThreads', () => {
            const ep = platformConfig.buildEndpoint('Perplexity', 'listThreads');
            assert.match(ep, /\/rest\/thread\/list_ask_threads\?version=/);
        });

        it('builds parameterized endpoint for ChatGPT conversationDetail', () => {
            const ep = platformConfig.buildEndpoint('ChatGPT', 'conversationDetail', { uuid: 'my-chat-id' });
            assert.equal(ep, '/backend-api/conversation/my-chat-id');
        });
    });
});
