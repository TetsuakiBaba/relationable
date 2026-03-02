import { loadGraphData, saveGraphData } from './db.js';
import { GraphManager } from './graph.js';
import { UIManager } from './ui.js';

async function init() {
    const graph = new GraphManager('#graph-svg');
    const ui = new UIManager(graph);

    // Load initial data
    const data = await loadGraphData();
    graph.setData(data);

    // Setup auto-save
    graph.onDataChange = () => {
        const currentData = {
            nodes: graph.nodes.map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y })),
            links: graph.links.map(l => ({
                source: l.source.id || l.source,
                target: l.target.id || l.target,
                name: l.name
            }))
        };
        saveGraphData(currentData);
    };

    console.log('Relationable initialized');
}

document.addEventListener('DOMContentLoaded', init);
