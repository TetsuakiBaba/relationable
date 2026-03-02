import { loadGraphData, saveGraphData } from './db.js';
import { GraphManager } from './graph.js';
import { UIManager } from './ui.js';
import { I18nManager } from './i18n.js';

async function init() {
    const i18n = new I18nManager();
    await i18n.init();

    const graph = new GraphManager('#graph-svg');
    const ui = new UIManager(graph, i18n);

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
