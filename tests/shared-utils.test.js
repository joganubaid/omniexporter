'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    InputSanitizer,
    splitTextForNotion,
    PlatformUrlBuilder,
    getContentScriptFiles,
    withRetry
} = require('../src/utils/shared-utils.js');

describe('shared-utils', () => {
    describe('InputSanitizer', () => {
        it('cleans HTML characters', () => {
            const raw = '<script>alert("xss" & \'test\')</script>';
            const cleaned = InputSanitizer.clean(raw);
            assert.equal(cleaned, '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;');
        });

        it('validates 32-character hex database IDs', () => {
            assert.equal(InputSanitizer.validateDatabaseId('12345678123456781234567812345678'), true);
            assert.equal(InputSanitizer.validateDatabaseId('12345678-1234-5678-1234-567812345678'), true);
            assert.equal(InputSanitizer.validateDatabaseId('too-short'), false);
            assert.equal(InputSanitizer.validateDatabaseId('not-hex-chars-1234567812345678123'), false);
        });

        it('validates Notion API integration keys', () => {
            // secret_ + 43 chars = 50 chars total
            const secretKey = 'secret_' + 'a'.repeat(43);
            const ntnKey = 'ntn_' + 'a'.repeat(25);
            assert.equal(InputSanitizer.validateNotionKey(secretKey), true);
            assert.equal(InputSanitizer.validateNotionKey(ntnKey), true);
            assert.equal(InputSanitizer.validateNotionKey('invalid_key'), false);
            assert.equal(InputSanitizer.validateNotionKey(''), false);
        });
    });

    describe('splitTextForNotion', () => {
        it('splits long text without exceeding maxLength', () => {
            const longText = 'Hello world. '.repeat(200);
            const chunks = splitTextForNotion(longText, 500);
            assert.ok(chunks.length > 1);
            for (const chunk of chunks) {
                assert.ok(chunk.length <= 500);
            }
        });
    });

    describe('PlatformUrlBuilder', () => {
        it('constructs correct URLs for all 6 platforms', () => {
            assert.equal(PlatformUrlBuilder.buildUrl('ChatGPT', 'chat-123'), 'https://chatgpt.com/c/chat-123');
            assert.equal(PlatformUrlBuilder.buildUrl('Claude', 'chat-123'), 'https://claude.ai/chat/chat-123');
            assert.equal(PlatformUrlBuilder.buildUrl('Perplexity', 'search-123'), 'https://www.perplexity.ai/search/search-123');
            assert.equal(PlatformUrlBuilder.buildUrl('Gemini', 'c_1234567890abcdef'), 'https://gemini.google.com/app/c_1234567890abcdef');
            assert.equal(PlatformUrlBuilder.buildUrl('Grok', 'chat-123'), 'https://grok.com/chat/chat-123');
            assert.equal(PlatformUrlBuilder.buildUrl('DeepSeek', 'chat-123'), 'https://chat.deepseek.com/a/chat/s/chat-123');
            assert.equal(PlatformUrlBuilder.buildUrl('Unknown', '123'), null);
        });
    });

    describe('getContentScriptFiles', () => {
        it('returns ordered content script paths for platforms', () => {
            const chatgptFiles = getContentScriptFiles('https://chatgpt.com/c/123');
            assert.ok(chatgptFiles.includes('src/adapters/chatgpt-adapter.js'));
            assert.ok(chatgptFiles.includes('src/content.js'));

            const claudeFiles = getContentScriptFiles('https://claude.ai/chat/123');
            assert.ok(claudeFiles.includes('src/adapters/claude-adapter.js'));

            const perplexityFiles = getContentScriptFiles('https://www.perplexity.ai/search/123');
            assert.ok(perplexityFiles.includes('src/adapters/perplexity-adapter.js'));
        });
    });

    describe('withRetry', () => {
        it('retries on transient failure and returns on success', async () => {
            let attempts = 0;
            const res = await withRetry(async () => {
                attempts++;
                if (attempts < 2) throw new Error('Network glitch');
                return 'success';
            }, 3, 10);
            assert.equal(res, 'success');
            assert.equal(attempts, 2);
        });

        it('does not retry non-retriable auth errors', async () => {
            let attempts = 0;
            await assert.rejects(async () => {
                await withRetry(async () => {
                    attempts++;
                    throw new Error('unauthorized');
                }, 3, 10);
            }, /unauthorized/);
            assert.equal(attempts, 1);
        });
    });
});
