'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Function reproducing the improved Grok message transformation
function transformGrokMessages(rawMessages) {
    const metaMap = {};
    rawMessages.forEach(msg => {
        const assetList = [
            ...(Array.isArray(msg.fileAttachmentsMetadata) ? msg.fileAttachmentsMetadata : []),
            ...(Array.isArray(msg.fileAttachmentAssetMetadata) ? msg.fileAttachmentAssetMetadata : [])
        ];
        for (const a of assetList) {
            const id = a.fileMetadataId || a.assetId || a.id;
            if (id) {
                metaMap[id] = {
                    name: a.fileName || a.name || 'attachment',
                    mime: a.fileMimeType || a.mimeType || '',
                    size: a.sizeBytes || null
                };
            }
        }
    });

    const entries = [];
    let currentQuery = '';

    rawMessages.forEach(msg => {
        const sender = (msg.sender || msg.role || '').toLowerCase();
        let content = msg.message || msg.content || '';

        // File attachments - maps UUID string IDs to actual file names
        if (Array.isArray(msg.fileAttachments) && msg.fileAttachments.length > 0) {
            const parts = msg.fileAttachments.map(f => {
                if (typeof f === 'string' && metaMap[f]) {
                    const m = metaMap[f];
                    const sizeLabel = m.size ? ` (${Math.round(m.size / 1024)} KB)` : '';
                    return `📎 [File: ${m.name}${sizeLabel}]`;
                }
                return `📎 [File: ${f.fileName || f.name || f.url || 'attachment'}]`;
            });
            content = content ? `${content}\n\n${parts.join('\n')}` : parts.join('\n');
        }

        // Thinking/reasoning steps
        let thinkingText = '';
        if (Array.isArray(msg.steps)) {
            for (const s of msg.steps) {
                if (Array.isArray(s.text)) {
                    thinkingText += s.text.join('\n') + '\n';
                } else if (typeof s.text === 'string') {
                    thinkingText += s.text + '\n';
                }
            }
        }

        if (!content.trim() && !thinkingText.trim()) return;

        if (sender === 'human' || sender === 'user') {
            currentQuery = content.trim();
        } else if ((sender === 'assistant' || sender === 'grok') && currentQuery) {
            const block = {
                intended_usage: 'ask_text',
                markdown_block: { answer: content.trim() }
            };
            if (thinkingText.trim()) {
                block.thinking = thinkingText.trim();
            }
            entries.push({
                query: currentQuery,
                blocks: [block]
            });
            currentQuery = '';
        }
    });

    return entries;
}

describe('Grok Message Transformation', () => {
    it('resolves string UUIDs in fileAttachments using fileAttachmentsMetadata', () => {
        const mockMessages = [
            {
                sender: 'human',
                message: 'Check this document',
                fileAttachments: ['uuid-attachment-123'],
                fileAttachmentsMetadata: [
                    {
                        fileMetadataId: 'uuid-attachment-123',
                        fileName: 'financial_report.pdf',
                        sizeBytes: 204800
                    }
                ]
            },
            {
                sender: 'assistant',
                message: 'I have analyzed the report.',
                steps: [
                    { text: ['Reading financial data', 'Analyzing figures'] }
                ],
                model: 'grok-3'
            }
        ];

        const entries = transformGrokMessages(mockMessages);
        assert.equal(entries.length, 1);
        assert.match(entries[0].query, /📎 \[File: financial_report\.pdf \(200 KB\)\]/);
        assert.equal(entries[0].blocks[0].markdown_block.answer, 'I have analyzed the report.');
        assert.equal(entries[0].blocks[0].thinking, 'Reading financial data\nAnalyzing figures');
    });
});
