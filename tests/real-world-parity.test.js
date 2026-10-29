'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapNotionSelectOrTextProperty } = require('../src/utils/shared-utils.js');
const { platformConfig } = require('../src/platform-config.js');

describe('Real-World Extension Parity & Resilience', () => {
    describe('Notion Dynamic Property Schema Mapping', () => {
        it('maps tags to select property when schema is single select', () => {
            const prop = mapNotionSelectOrTextProperty({ type: 'select' }, 'Claude');
            assert.deepEqual(prop, { select: { name: 'Claude' } });
        });

        it('maps tags to multi_select property when schema is multi_select', () => {
            const prop = mapNotionSelectOrTextProperty({ type: 'multi_select' }, 'ChatGPT');
            assert.deepEqual(prop, { multi_select: [{ name: 'ChatGPT' }] });
        });

        it('maps tags to rich_text property when schema is rich_text', () => {
            const prop = mapNotionSelectOrTextProperty({ type: 'rich_text' }, 'Perplexity');
            assert.deepEqual(prop, { rich_text: [{ type: 'text', text: { content: 'Perplexity' } }] });
        });

        it('returns null for unsupported or missing schema types', () => {
            assert.equal(mapNotionSelectOrTextProperty({ type: 'number' }, '123'), null);
            assert.equal(mapNotionSelectOrTextProperty(null, 'text'), null);
        });
    });

    describe('DeepSeek Endpoint Parity', () => {
        it('uses cache_version=0 instead of broken cache_version=2', () => {
            const endpoint = platformConfig.buildEndpoint('DeepSeek', 'conversationDetail', { uuid: 'test-uuid' });
            assert.equal(endpoint, '/api/v0/chat/history_messages?chat_session_id=test-uuid&cache_version=0');
            assert.doesNotMatch(endpoint, /cache_version=2/);
        });
    });

    describe('Grok Tag Cleaning & LaTeX Normalization', () => {
        it('strips <grok:render> XML tags without breaking surrounding message', () => {
            const raw = 'Here is the answer.\n<grok:render card_id="123" card_type="citation_card" />\nConclusion text.';
            const cleaned = raw.replace(/<grok:render[\s\S]*?<\/grok:render>/g, '\n').replace(/<grok:render\b[^>]*\/>/g, '\n');
            assert.doesNotMatch(cleaned, /<grok:render/);
            assert.match(cleaned, /Here is the answer/);
            assert.match(cleaned, /Conclusion text/);
        });

        it('converts LaTeX delimiters \\[...\\] and \\(...\\) to standard $$ and $', () => {
            const raw = 'The formula is \\[ E = mc^2 \\] and inline \\( a^2 + b^2 = c^2 \\).';
            const normalized = raw
                .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
                .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
            assert.equal(normalized, 'The formula is $$ E = mc^2 $$ and inline $ a^2 + b^2 = c^2 $.');
        });
    });

    describe('Gemini Imagen URL Detection', () => {
        it('extracts Google image generation content URLs from response candidate strings', () => {
            const candidateStr = '{"content": "Here is your picture", "image": "https://lh3.googleusercontent.com/image_generation_content/sbi_leak_infographic_12345"}';
            const imgMatches = candidateStr.match(/https?:\/\/[^"\\]*googleusercontent\.com\/image_generation_content\/[^"\\]+/g);
            assert.ok(imgMatches);
            assert.equal(imgMatches[0], 'https://lh3.googleusercontent.com/image_generation_content/sbi_leak_infographic_12345');
        });
    });
});
