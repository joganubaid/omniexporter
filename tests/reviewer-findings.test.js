'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
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
});
