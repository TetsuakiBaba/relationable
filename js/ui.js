import { resizeImage, saveNodeImage, getNodeImage, getAllNodeImages, clearAllData } from './db.js';

export class UIManager {
    constructor(graphManager) {
        this.graph = graphManager;
        this.drawer = document.getElementById('property-drawer');
        this.form = document.getElementById('property-form');
        this.nameInput = document.getElementById('elem-name');
        this.imageInput = document.getElementById('image-input');
        this.imagePreview = document.getElementById('image-preview');
        this.addBtn = document.getElementById('add-node-btn');
        this.deleteBtn = document.getElementById('delete-btn');
        this.saveBtn = document.getElementById('save-btn');

        this.exportBtn = document.getElementById('export-btn');
        this.importBtn = document.getElementById('import-btn');
        this.importInput = document.getElementById('import-input');
        this.clearAllBtn = document.getElementById('clear-all-btn');
        this.fitBtn = document.getElementById('fit-btn');
        this.menuBtn = document.getElementById('menu-btn');
        this.uploadTrigger = document.getElementById('upload-trigger-btn');

        this.initEvents();
    }

    initEvents() {
        if (this.addBtn) {
            this.addBtn.onclick = () => {
                this.graph.addNode();
            };
        }

        if (this.clearAllBtn) this.clearAllBtn.onclick = () => this.handleClearAll();
        if (this.fitBtn) this.fitBtn.onclick = () => this.graph.fitToScreen();
        if (this.exportBtn) this.exportBtn.onclick = () => this.handleExport();
        if (this.importBtn) this.importBtn.onclick = () => this.importInput.click();
        if (this.importInput) this.importInput.onchange = (e) => this.handleImport(e);
        if (this.uploadTrigger) this.uploadTrigger.onclick = () => this.imageInput.click();

        if (this.menuBtn) {
            this.menuBtn.onclick = () => {
                if (this.drawer) this.drawer.open = !this.drawer.open;
            };
        }

        if (this.saveBtn) {
            this.saveBtn.onclick = (e) => {
                e.preventDefault();
                this.saveProperties();
            };
        }

        if (this.imageInput) {
            this.imageInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const resized = await resizeImage(file);
                    const nodeId = document.getElementById('elem-id').value;
                    await saveNodeImage(nodeId, resized);
                    this.updateImagePreview(resized);
                    this.graph.update();
                }
            };
        }

        if (this.deleteBtn) {
            this.deleteBtn.onclick = () => {
                const id = document.getElementById('elem-id').value;
                const type = document.getElementById('elem-type').value;
                this.graph.deleteElement(id, type);
                this.closePanel();
            };
        }

        this.graph.onElementClick = (event, d, type) => {
            event.stopPropagation();
            this.openPanel(d, type);
        };

        this.graph.onDeselect = () => this.closePanel();
    }

    async openPanel(data, type) {
        if (this.drawer) this.drawer.open = true;

        const idElem = document.getElementById('elem-id');
        const typeElem = document.getElementById('elem-type');
        if (idElem) idElem.value = type === 'node' ? data.id : JSON.stringify({ source: data.source.id, target: data.target.id });
        if (typeElem) typeElem.value = type;
        if (this.nameInput) this.nameInput.value = data.name || '';

        const titleElem = document.getElementById('panel-title');
        if (titleElem) titleElem.innerText = type === 'node' ? '人物プロパティ' : '関係プロパティ';

        const nodeOnly = document.getElementById('node-only-fields');
        if (type === 'node') {
            if (nodeOnly) nodeOnly.style.display = 'block';
            const blob = await getNodeImage(data.id);
            this.updateImagePreview(blob);
        } else {
            if (nodeOnly) nodeOnly.style.display = 'none';
        }
    }

    closePanel() {
        if (this.drawer) {
            if ('open' in this.drawer) {
                this.drawer.open = false;
            } else {
                this.drawer.removeAttribute('open');
            }
        }
        if (this.imageInput) this.imageInput.value = '';
    }

    updateImagePreview(blob) {
        if (blob && this.imagePreview) {
            const url = URL.createObjectURL(blob);
            this.imagePreview.style.backgroundImage = `url(${url})`;
        } else if (this.imagePreview) {
            this.imagePreview.style.backgroundImage = 'none';
        }
    }

    async saveProperties() {
        const idElem = document.getElementById('elem-id');
        const typeElem = document.getElementById('elem-type');
        if (!idElem || !typeElem) return;

        const idStr = idElem.value;
        const type = typeElem.value;
        const name = this.nameInput ? this.nameInput.value : '';

        if (type === 'node') {
            const node = this.graph.nodes.find(n => n.id === idStr);
            if (node) node.name = name;
        } else {
            const idObj = JSON.parse(idStr);
            const link = this.graph.links.find(l =>
                (l.source.id === idObj.source && l.target.id === idObj.target)
            );
            if (link) link.name = name;
        }

        this.graph.update();
        this.graph.onDataChange();
        this.closePanel();
    }

    async handleClearAll() {
        if (!confirm('全てのネットワーク情報を削除しますか？')) return;
        await clearAllData();
        this.graph.setData({ nodes: [], links: [] });
        this.graph.onDataChange();
        this.closePanel();
    }

    async handleExport() {
        const nodes = this.graph.nodes.map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y }));
        const links = this.graph.links.map(l => ({
            source: l.source.id || l.source,
            target: l.target.id || l.target,
            name: l.name
        }));

        const images = await getAllNodeImages();
        const imageData = {};

        for (const [id, blob] of Object.entries(images)) {
            imageData[id] = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }

        const exportData = {
            version: '1.0',
            timestamp: Date.now(),
            graph: { nodes, links },
            images: imageData
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relationable_export.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.graph) throw new Error();
                if (!confirm('データを上書きしますか？')) return;

                await clearAllData();

                if (data.images) {
                    for (const [id, dataUrl] of Object.entries(data.images)) {
                        const res = await fetch(dataUrl);
                        const blob = await res.blob();
                        await saveNodeImage(id, blob);
                    }
                }

                this.graph.setData(data.graph);
                this.graph.onDataChange();
            } catch (err) {
                alert('エラーが発生しました。');
            }
            if (this.importInput) this.importInput.value = '';
        };
        reader.readAsText(file);
    }
}
