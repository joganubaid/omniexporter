'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ExportManager = require('../src/utils/export-manager.js');

describe('ExportManager', () => {
    const mockChatData = {
        uuid: 'test-uuid-12345',
        title: 'Test "Quotes" & Special Characters',
        model: 'gpt-4o',
        detail: {
            model: 'gpt-4o',
            entries: [
                {
                    query: 'What is relativity?',
                    created_datetime: '2026-05-01T12:00:00Z',
                    updated_datetime: '2026-05-01T12:01:00Z',
                    blocks: [
                        {
                            thinking: 'Let me explain special relativity...',
                            markdown_block: {
                                answer: 'Relativity is a physical theory formulated by Albert Einstein.'
                            },
                            toolCalls: [
                                {
                                    name: 'calculate',
                                    input: { formula: 'E=mc^2' }
                                }
                            ],
                            toolResults: [
                                {
                                    text: 'Result: constant',
                                    isError: false
                                }
                            ]
                        }
                    ],
                    citations: [
                        { title: 'Einstein Paper', url: 'https://example.com/einstein' }
                    ]
                }
            ]
        }
    };

    it('generates markdown with valid YAML frontmatter and content', () => {
        const md = ExportManager.toMarkdown(mockChatData, 'ChatGPT');
        assert.match(md, /^---\ntitle: "Test \\"Quotes\\" & Special Characters"\n/);
        assert.match(md, /platform: "ChatGPT"/);
        assert.match(md, /uuid: "test-uuid-12345"/);
        assert.match(md, /model: "gpt-4o"/);
        assert.match(md, /### User\n\nWhat is relativity\?/);
        assert.match(md, /### Assistant/);
        assert.match(md, /> \*Let me explain special relativity\.\.\.\*/);
        assert.match(md, /Relativity is a physical theory/);
        assert.match(md, /<details>\n<summary><strong>Tool: calculate<\/strong><\/summary>/);
        assert.match(md, /\[Einstein Paper\]\(https:\/\/example\.com\/einstein\)/);
        assert.match(md, /\*Exported with OmniExporter/);
    });

    it('respects includeMetadata: false in markdown export', () => {
        const md = ExportManager.toMarkdown(mockChatData, 'ChatGPT', { includeMetadata: false });
        assert.doesNotMatch(md, /^---/);
        assert.doesNotMatch(md, /uuid: "test-uuid-12345"/);
        assert.match(md, /^# Test "Quotes" & Special Characters\n\n/);
        assert.doesNotMatch(md, /\*Exported with OmniExporter/);
    });

    it('respects syncCitations: false in markdown export', () => {
        const md = ExportManager.toMarkdown(mockChatData, 'ChatGPT', { syncCitations: false });
        assert.doesNotMatch(md, /\*\*Citations:\*\*/);
        assert.doesNotMatch(md, /https:\/\/example\.com\/einstein/);
    });

    it('generates structured JSON export', () => {
        const jsonStr = ExportManager.toJSON(mockChatData, 'ChatGPT');
        const parsed = JSON.parse(jsonStr);
        assert.equal(parsed.conversation.uuid, 'test-uuid-12345');
        assert.equal(parsed.conversation.title, 'Test "Quotes" & Special Characters');
        assert.equal(parsed.entries.length, 1);
        assert.equal(parsed.entries[0].query, 'What is relativity?');
        assert.match(parsed.entries[0].answer, /Relativity is a physical theory/);
        assert.equal(parsed.entries[0].citations.length, 1);
        assert.equal(parsed.meta.tool, 'OmniExporter');
    });

    it('respects options in JSON export', () => {
        const jsonStr = ExportManager.toJSON(mockChatData, 'ChatGPT', {
            includeMetadata: false,
            syncCitations: false
        });
        const parsed = JSON.parse(jsonStr);
        assert.equal(parsed.meta, undefined);
        assert.equal(parsed.entries[0].metadata, undefined);
        assert.equal(parsed.entries[0].citations, undefined);
    });

    it('sanitizes unsafe URLs', () => {
        assert.equal(ExportManager._sanitizeUrl('https://valid.com'), 'https://valid.com');
        assert.equal(ExportManager._sanitizeUrl('http://valid.com/path?a=1'), 'http://valid.com/path?a=1');
        assert.equal(ExportManager._sanitizeUrl('javascript:alert(1)'), '');
        assert.equal(ExportManager._sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
        assert.equal(ExportManager._sanitizeUrl('vbscript:msgbox(1)'), '');
        assert.equal(ExportManager._sanitizeUrl(null), '');
    });

    it('generates clean filenames', () => {
        const fn = ExportManager.generateFilename('What is 2+2? & Why: An Analysis', '.md');
        assert.match(fn, /^What_is_2\+2_&_Why_An_Analysis_\d{4}-\d{2}-\d{2}\.md$/);
        assert.doesNotMatch(fn, /[?:]/);
    });
});
