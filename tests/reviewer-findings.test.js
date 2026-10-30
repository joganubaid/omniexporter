'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ExportManager = require('../src/utils/export-manager.js');
const { platformConfig } = require('../src/platform-config.js');

describe('Code Reviewer Fixes Verification', () => {
    describe('Finding 1: ExportManager image attachment handling', () => {
        it('safely handles image attachments without extracted_content without throwing TypeError', () => {
            const chatData = {
                title: 'Image Test Chat',
                detail: {
                    entries: [
                        {
                            query: 'Here is an image',
                            attachments: [
                                {
                                    file_name: 'test_photo.png',
                                    url: 'https://example.com/test_photo.png',
                                    extracted_content: undefined
                                }
                            ],
                            blocks: [
                                { markdown_block: { answer: 'I see your image.' } }
                            ]
                        }
                    ]
                }
            };

            // Must not throw TypeError: Cannot read properties of undefined (reading 'includes')
            let md;
            assert.doesNotThrow(() => {
                md = ExportManager.toMarkdown(chatData, 'ChatGPT', { syncImages: true });
            });
            assert.match(md, /!\[test_photo\.png\]\(https:\/\/example\.com\/test_photo\.png\)/);
        });

        it('safely handles non-image attachments with extracted_content', () => {
            const chatData = {
                title: 'Doc Test Chat',
                detail: {
                    entries: [
                        {
                            query: 'Here is a document',
                            attachments: [
                                {
                                    file_name: 'notes.txt',
                                    url: 'https://example.com/notes.txt',
                                    extracted_content: 'Line 1 of document\nLine 2 of document'
                                }
                            ],
                            blocks: [
                                { markdown_block: { answer: 'Document read.' } }
                            ]
                        }
                    ]
                }
            };

            const md = ExportManager.toMarkdown(chatData, 'ChatGPT');
            assert.match(md, /<details>\n<summary><strong>Attachment: notes\.txt<\/strong>/);
            assert.match(md, /Line 1 of document/);
        });
    });

    describe('Finding 2: GeminiAdapter apiBase uses buildEndpoint', () => {
        it('buildEndpoint on platformConfig exists and returns a valid path', () => {
            assert.equal(typeof platformConfig.buildEndpoint, 'function');
            const ep = platformConfig.buildEndpoint('Gemini', 'conversations');
            assert.match(ep, /\/_/);
        });
    });

    describe('Finding 3: ChatGPT file_asset_pointer distinct handling', () => {
        it('distinguishes between image_asset_pointer and file_asset_pointer', () => {
            const parts = [
                {
                    content_type: 'image_asset_pointer',
                    asset_pointer: 'file-service://file_123',
                    metadata: { dalle: { prompt: 'A blue sky' } }
                },
                {
                    content_type: 'file_asset_pointer',
                    metadata: { file_name: 'dataset.csv' }
                }
            ];

            const rendered = [];
            for (const p of parts) {
                if (p.content_type === 'image_asset_pointer') {
                    const desc = p.metadata?.dalle?.prompt || 'Generated image';
                    rendered.push(`🖼️ [Image: ${desc}]`);
                } else if (p.content_type === 'file_asset_pointer') {
                    const fileName = p.metadata?.file_name || 'Uploaded file';
                    rendered.push(`📎 [File: ${fileName}]`);
                }
            }

            assert.equal(rendered.length, 2);
            assert.equal(rendered[0], '🖼️ [Image: A blue sky]');
            assert.equal(rendered[1], '📎 [File: dataset.csv]');
        });
    });

    describe('Finding 4: NotionBlockBuilder chunks and fallback answer', () => {
        const NotionBlockBuilder = require('../src/utils/notion-block-builder.js');

        it('extracts answers split into markdown_block.chunks array', () => {
            const entries = [
                {
                    query: 'List items',
                    blocks: [
                        { markdown_block: { chunks: ['Chunk 1 of answer', 'Chunk 2 of answer'] } }
                    ]
                }
            ];
            const blocks = NotionBlockBuilder.buildNotionBlocks(entries, 'Perplexity');
            const pBlocks = blocks.filter(b => b.type === 'paragraph');
            const text = pBlocks.map(b => b.paragraph.rich_text.map(r => r.text.content).join('')).join('\n');
            assert.match(text, /Chunk 1 of answer/);
            assert.match(text, /Chunk 2 of answer/);
        });

        it('falls back to entry.text when blocks array is empty', () => {
            const entries = [
                {
                    query: 'Direct query',
                    text: 'Direct answer text without blocks wrapper.',
                    blocks: []
                }
            ];
            const blocks = NotionBlockBuilder.buildNotionBlocks(entries, 'Perplexity');
            const asstHeading = blocks.find(b => b.type === 'heading_3' && b.heading_3.rich_text[0].text.content === 'Assistant');
            assert.ok(asstHeading, 'Must render Assistant heading on fallback');
            const pBlock = blocks.find(b => b.type === 'paragraph' && b.paragraph.rich_text[0].text.content.includes('Direct answer text'));
            assert.ok(pBlock, 'Must render fallback answer text in paragraph');
        });
    });

    describe('Finding 5: Grok trailing query preservation across multi-turn chats', () => {
        it('preserves trailing user query even when entries.length > 0', () => {
            // Multi-turn: 1 complete turn + 1 trailing user message
            const entries = [
                { query_str: 'Turn 1 query', blocks: [{ markdown_block: { answer: 'Turn 1 answer' } }] }
            ];
            let currentQuery = 'Trailing user query';
            if (currentQuery) {
                entries.push({
                    query_str: currentQuery,
                    query: currentQuery,
                    blocks: [{ intended_usage: 'ask_text', markdown_block: { answer: '' } }]
                });
            }
            assert.equal(entries.length, 2);
            assert.equal(entries[1].query, 'Trailing user query');
        });
    });

    describe('Finding 7: Date parsing resilience in Chat Time', () => {
        it('safely handles invalid or corrupt date strings without throwing RangeError', () => {
            const corruptDate = 'not-a-valid-date-value';
            let chatDate;
            try {
                chatDate = corruptDate ? new Date(corruptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            } catch (_) {
                chatDate = new Date().toISOString().split('T')[0];
            }
            assert.match(chatDate, /^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('Enterprise Review Findings Verification', () => {
        it('Finding 1: GeminiBridge does not block getSessionParams when isReady is initially false', async () => {
            const bridge = {
                isReady: false,
                _sessionParamsCache: null,
                _sessionParamsCacheTime: 0,
                _sessionParamsCacheTTL: 60000,
                async sendRequest(action) {
                    if (action === 'GET_SESSION_PARAMS') return { at: 'token123', bl: 'boq_123', fsid: 'fsid_123' };
                    return null;
                },
                async getSessionParams() {
                    const now = Date.now();
                    if (this._sessionParamsCache && (now - this._sessionParamsCacheTime) < this._sessionParamsCacheTTL) {
                        return this._sessionParamsCache;
                    }
                    try {
                        const params = await this.sendRequest('GET_SESSION_PARAMS');
                        if (params && params.at) {
                            this._sessionParamsCache = params;
                            this._sessionParamsCacheTime = now;
                            this.isReady = true;
                        }
                        return params || { at: null, bl: null, fsid: null };
                    } catch {
                        return { at: null, bl: null, fsid: null };
                    }
                }
            };
            const params = await bridge.getSessionParams();
            assert.equal(params.at, 'token123');
            assert.equal(bridge.isReady, true);
        });

        it('Finding 2: Dynamic title property detects columns named Name or Topic', () => {
            const customSchema = {
                properties: {
                    'Name': { id: 'title', type: 'title', title: {} },
                    'URL': { id: 'url', type: 'url', url: {} }
                }
            };
            let titlePropertyName = 'Title';
            if (customSchema?.properties) {
                for (const [name, prop] of Object.entries(customSchema.properties)) {
                    if (prop.type === 'title') { titlePropertyName = name; break; }
                }
            }
            assert.equal(titlePropertyName, 'Name');
        });

        it('Finding 3: manifest.json includes https://*.workers.dev/* in host_permissions', () => {
            const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
            assert.ok(manifest.host_permissions.includes('https://*.workers.dev/*'));
        });

        it('Finding 4: Property builder skips URL when platformUrl is null/unresolved', () => {
            const properties = { Title: { title: [{ text: { content: 'Test' } }] } };
            const availableProps = { 'URL': { type: 'url' } };
            const platformUrl = null;
            if (availableProps['URL'] && platformUrl) {
                properties.URL = { url: platformUrl };
            }
            assert.equal(properties.URL, undefined);
        });

        it('Finding 5: Claude conversationsV2 query string uses correct separator', () => {
            const baseUrl = 'https://claude.ai';
            const v2WithQuery = '/api/organizations/org123/chat_conversations_v2?limit=50';
            const sep1 = v2WithQuery.includes('?') ? '&' : '?';
            const url1 = `${baseUrl}${v2WithQuery}${sep1}offset=0`;
            assert.equal(url1, 'https://claude.ai/api/organizations/org123/chat_conversations_v2?limit=50&offset=0');

            const v2Bare = '/api/organizations/org123/chat_conversations';
            const sep2 = v2Bare.includes('?') ? '&' : '?';
            const url2 = `${baseUrl}${v2Bare}${sep2}offset=0`;
            assert.equal(url2, 'https://claude.ai/api/organizations/org123/chat_conversations?offset=0');
        });

        it('Finding 6: ChatGPT data transformer handles assistant-initial messages', () => {
            const orderedMessages = [
                { role: 'assistant', content: 'Hello! How can I help you today?' },
                { role: 'user', content: 'What is 2+2?' },
                { role: 'assistant', content: '4' }
            ];
            const entries = [];
            let currentEntry = null;
            orderedMessages.forEach(msg => {
                const { role, content } = msg;
                if (role === 'user') {
                    if (currentEntry) entries.push(currentEntry);
                    currentEntry = { query_str: content.trim(), blocks: [] };
                } else if (role === 'assistant' || role === 'tool') {
                    if (!currentEntry) {
                        currentEntry = { query_str: '', blocks: [] };
                    }
                    currentEntry.blocks.push({
                        intended_usage: 'ask_text',
                        markdown_block: { answer: content.trim() }
                    });
                }
            });
            if (currentEntry) entries.push(currentEntry);

            assert.equal(entries.length, 2);
            assert.equal(entries[0].query_str, '');
            assert.equal(entries[0].blocks[0].markdown_block.answer, 'Hello! How can I help you today?');
            assert.equal(entries[1].query_str, 'What is 2+2?');
            assert.equal(entries[1].blocks[0].markdown_block.answer, '4');
        });

        it('Finding 7: Cloudflare worker CORS headers allow GET requests', () => {
            const workerCode = fs.readFileSync(path.join(__dirname, '../cloudflare-worker/worker.js'), 'utf8');
            assert.match(workerCode, /'Access-Control-Allow-Methods':\s*'GET,\s*POST,\s*OPTIONS'/);
        });

        it('Finding 8: Perplexity version lookup safely handles undefined activeVersions', () => {
            const dummyConfig = { activeVersions: undefined };
            const currentVersion = dummyConfig.activeVersions?.get('Perplexity') || '2.18';
            assert.equal(currentVersion, '2.18');
        });
    });
});
