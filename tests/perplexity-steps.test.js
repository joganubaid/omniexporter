'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ExportManager = require('../src/utils/export-manager.js');

describe('Perplexity Step Format Parsing', () => {
    const mockStepText = JSON.stringify([
        {
            step_type: 'INITIAL_QUERY',
            content: { goal_id: null, query: 'How does quantum entanglement work?' }
        },
        {
            step_type: 'SEARCH_WEB',
            content: { goal_id: null, queries: ['quantum entanglement physical principles'] }
        },
        {
            step_type: 'SEARCH_RESULTS',
            content: {
                goal_id: null,
                web_results: [
                    { name: 'Physics Today', url: 'https://example.com/physics-today' },
                    { name: 'Nature Entanglement', url: 'https://example.com/nature' }
                ]
            }
        },
        {
            step_type: 'FINAL',
            content: {
                goal_id: null,
                answer: 'Quantum entanglement is a phenomenon where quantum particles become inextricably linked.'
            }
        }
    ]);

    it('extracts clean final answer from JSON step array in extractAnswer', () => {
        const entry = {
            query: 'How does quantum entanglement work?',
            text: mockStepText
        };
        const answer = ExportManager.extractAnswer(entry);
        assert.equal(answer, 'Quantum entanglement is a phenomenon where quantum particles become inextricably linked.');
    });

    it('handles nested JSON string answers in final step', () => {
        const nestedStepText = JSON.stringify([
            {
                step_type: 'FINAL',
                content: {
                    answer: JSON.stringify({
                        answer: 'Nested answer string inside JSON step.'
                    })
                }
            }
        ]);
        const entry = { text: nestedStepText };
        const answer = ExportManager.extractAnswer(entry);
        assert.equal(answer, 'Nested answer string inside JSON step.');
    });

    it('renders Assistant section in toMarkdown even when blocks array is missing/empty', () => {
        const chatData = {
            title: 'Quantum Chat',
            uuid: 'q-123',
            detail: {
                entries: [
                    {
                        query: 'Question?',
                        text: mockStepText
                    }
                ]
            }
        };
        const md = ExportManager.toMarkdown(chatData, 'Perplexity');
        assert.match(md, /### User\n\nQuestion\?/);
        assert.match(md, /### Assistant\n\nQuantum entanglement is a phenomenon/);
        assert.doesNotMatch(md, /INITIAL_QUERY/);
    });
});
