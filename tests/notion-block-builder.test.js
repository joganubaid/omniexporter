'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const NotionBlockBuilder = require('../src/utils/notion-block-builder.js');

describe('NotionBlockBuilder', () => {
    it('chunks text exceeding 2000 characters without breaking mid-word when possible', () => {
        const text = 'word '.repeat(500); // 2500 chars
        const chunks = NotionBlockBuilder._chunkText(text, 2000);
        assert.ok(chunks.length >= 2);
        assert.ok(chunks[0].length <= 2000);
        assert.ok(chunks[1].length <= 2000);
    });

    it('parses inline markdown tokens into Notion rich_text objects', () => {
        const input = 'This is **bold**, *italic*, `code`, a [link](https://example.com), and $E=mc^2$ equation.';
        const parts = NotionBlockBuilder._parseInlineMarkdown(input);

        const boldPart = parts.find(p => p.annotations?.bold);
        assert.ok(boldPart, 'Should have bold annotation');
        assert.equal(boldPart.text.content, 'bold');

        const italicPart = parts.find(p => p.annotations?.italic);
        assert.ok(italicPart, 'Should have italic annotation');
        assert.equal(italicPart.text.content, 'italic');

        const codePart = parts.find(p => p.annotations?.code);
        assert.ok(codePart, 'Should have code annotation');
        assert.equal(codePart.text.content, 'code');

        const linkPart = parts.find(p => p.text?.link?.url);
        assert.ok(linkPart, 'Should have link object');
        assert.equal(linkPart.text.content, 'link');
        assert.equal(linkPart.text.link.url, 'https://example.com');

        const eqPart = parts.find(p => p.type === 'equation');
        assert.ok(eqPart, 'Should have equation object');
        assert.equal(eqPart.equation.expression, 'E=mc^2');
    });

    it('converts markdown headings and bullet lists into Notion blocks', () => {
        const markdown = '# Heading 1\n## Heading 2\n### Heading 3\n- Bullet item 1\n- Bullet item 2';
        const blocks = NotionBlockBuilder._markdownToBlocks(markdown);

        assert.equal(blocks[0].type, 'heading_1');
        assert.equal(blocks[0].heading_1.rich_text[0].text.content, 'Heading 1');

        assert.equal(blocks[1].type, 'heading_2');
        assert.equal(blocks[1].heading_2.rich_text[0].text.content, 'Heading 2');

        assert.equal(blocks[2].type, 'heading_3');
        assert.equal(blocks[2].heading_3.rich_text[0].text.content, 'Heading 3');

        assert.equal(blocks[3].type, 'bulleted_list_item');
        assert.equal(blocks[3].bulleted_list_item.rich_text[0].text.content, 'Bullet item 1');
    });

    it('builds full Notion blocks from conversation data', () => {
        const conversationData = {
            detail: {
                entries: [
                    {
                        query: 'Hello world',
                        blocks: [
                            {
                                markdown_block: { answer: 'Hi there! How can I help you today?' }
                            }
                        ]
                    }
                ]
            }
        };

        const blocks = NotionBlockBuilder.buildNotionBlocks(conversationData, 'ChatGPT');
        assert.ok(blocks.length > 0);
        const userHeading = blocks.find(b => b.type === 'heading_3' && b.heading_3.rich_text[0].text.content === 'User');
        assert.ok(userHeading, 'Should have User heading');
        const assistantHeading = blocks.find(b => b.type === 'heading_3' && b.heading_3.rich_text[0].text.content === 'Assistant');
        assert.ok(assistantHeading, 'Should have Assistant heading');
    });

    it('flattens toggle block children for Notion PATCH compatibility', () => {
        const blocks = [
            {
                type: 'toggle',
                toggle: {
                    rich_text: [{ type: 'text', text: { content: 'Toggle title' } }],
                    children: [
                        { type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'Child' } }] } }
                    ]
                }
            }
        ];

        const flattened = NotionBlockBuilder.flattenToggleBlocks(blocks);
        assert.equal(flattened[0].toggle.children.length, 0);
    });
});
