'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Minimal reproduction of transformChatGPTData tree traversal logic
function traverseChatGPTTree(data) {
    const mapping = data.mapping || {};
    let orderedMessages = [];

    // PREFERRED: If data.current_node exists, trace active path backwards to root
    if (data.current_node && mapping[data.current_node]) {
        let curr = data.current_node;
        const pathMessages = [];
        const visited = new Set();
        while (curr && mapping[curr] && !visited.has(curr)) {
            visited.add(curr);
            const node = mapping[curr];
            if (node?.message) {
                pathMessages.push(node.message);
            }
            curr = node.parent;
        }
        if (pathMessages.length > 0) {
            orderedMessages = pathMessages.reverse();
        }
    }

    // Forward traversal fallback
    if (orderedMessages.length === 0) {
        let currentNodeId = null;
        for (const [id, node] of Object.entries(mapping)) {
            if (!node.parent) {
                currentNodeId = id;
                break;
            }
        }
        if (!currentNodeId && Object.keys(mapping).length > 0) {
            currentNodeId = Object.keys(mapping)[0];
        }

        const visited = new Set();
        while (currentNodeId && !visited.has(currentNodeId)) {
            visited.add(currentNodeId);
            const node = mapping[currentNodeId];
            if (node?.message) {
                orderedMessages.push(node.message);
            }
            if (node?.children && node.children.length > 0) {
                currentNodeId = node.children[node.children.length - 1];
            } else {
                break;
            }
        }
    }

    return orderedMessages;
}

describe('ChatGPT Tree Traversal with current_node', () => {
    it('accurately traces the selected branch backwards from current_node', () => {
        // Tree with 2 branches at turn 1:
        // root -> msg1 (user) -> msg2_v1 (assistant 1) -> msg3 (user on branch 1)
        //                     -> msg2_v2 (assistant 2, regenerated)
        // User selected branch 1 (msg3 is current_node)
        const mapping = {
            'root': { id: 'root', parent: null, children: ['msg1'] },
            'msg1': { id: 'msg1', parent: 'root', message: { text: 'Prompt 1' }, children: ['msg2_v1', 'msg2_v2'] },
            'msg2_v1': { id: 'msg2_v1', parent: 'msg1', message: { text: 'Answer Version 1' }, children: ['msg3'] },
            'msg2_v2': { id: 'msg2_v2', parent: 'msg1', message: { text: 'Answer Version 2 (latest regen)' }, children: [] },
            'msg3': { id: 'msg3', parent: 'msg2_v1', message: { text: 'Prompt 2 on branch 1' }, children: [] }
        };

        const result = traverseChatGPTTree({
            mapping,
            current_node: 'msg3'
        });

        assert.equal(result.length, 3);
        assert.equal(result[0].text, 'Prompt 1');
        assert.equal(result[1].text, 'Answer Version 1');
        assert.equal(result[2].text, 'Prompt 2 on branch 1');
    });

    it('falls back to forward traversal if current_node is missing', () => {
        const mapping = {
            'root': { id: 'root', parent: null, children: ['msg1'] },
            'msg1': { id: 'msg1', parent: 'root', message: { text: 'Prompt 1' }, children: ['msg2_v1', 'msg2_v2'] },
            'msg2_v1': { id: 'msg2_v1', parent: 'msg1', message: { text: 'Answer 1' }, children: [] },
            'msg2_v2': { id: 'msg2_v2', parent: 'msg1', message: { text: 'Answer 2' }, children: [] }
        };

        const result = traverseChatGPTTree({ mapping });
        assert.equal(result.length, 2);
        assert.equal(result[0].text, 'Prompt 1');
        assert.equal(result[1].text, 'Answer 2'); // Last child chosen in forward fallback
    });
});
