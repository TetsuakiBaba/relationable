import { resizeImage, saveNodeImage, getNodeImage, getAllNodeImages, clearAllData } from './db.js';

export class UIManager {
    constructor(graphManager, i18n) {
        this.graph = graphManager;
        this.i18n = i18n;
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
        this.settingsBtn = document.getElementById('settings-btn');
        this.menuBtn = document.getElementById('menu-btn');
        this.uploadTrigger = document.getElementById('upload-trigger-btn');

        this.repulsionSlider = document.getElementById('repulsion-slider');
        this.linkDistanceSlider = document.getElementById('link-distance-slider');

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
        if (this.settingsBtn) this.settingsBtn.onclick = () => this.openSettingsPanel();
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

        if (this.repulsionSlider) {
            this.repulsionSlider.oninput = (e) => {
                this.graph.setSimulationParameters(e.target.value, undefined);
            };
        }

        if (this.linkDistanceSlider) {
            this.linkDistanceSlider.oninput = (e) => {
                this.graph.setSimulationParameters(undefined, e.target.value);
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
        if (titleElem) {
            const key = type === 'node' ? 'person_property' : 'relation_property';
            titleElem.innerText = this.i18n.t(key);
            titleElem.setAttribute('data-i18n', key);
        }

        const nodeOnly = document.getElementById('node-only-fields');
        const graphSettings = document.getElementById('graph-settings-fields');
        const propertyActions = document.getElementById('property-actions');
        const nameField = document.getElementById('elem-name');

        if (graphSettings) graphSettings.style.display = 'none';
        if (propertyActions) propertyActions.style.display = 'flex';
        if (nameField) nameField.parentElement.style.display = 'block';

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

    openSettingsPanel() {
        if (this.drawer) this.drawer.open = true;

        const titleElem = document.getElementById('panel-title');
        if (titleElem) {
            titleElem.innerText = this.i18n.t('graph_settings');
            titleElem.setAttribute('data-i18n', 'graph_settings');
        }

        const nodeOnly = document.getElementById('node-only-fields');
        if (nodeOnly) nodeOnly.style.display = 'none';

        const nameField = document.getElementById('elem-name');
        if (nameField) nameField.parentElement.style.display = 'none';

        const graphSettings = document.getElementById('graph-settings-fields');
        if (graphSettings) graphSettings.style.display = 'block';

        const propertyActions = document.getElementById('property-actions');
        if (propertyActions) propertyActions.style.display = 'none';

        // Update slider values to match current simulation state
        if (this.repulsionSlider) this.repulsionSlider.value = this.graph.repulsion;
        if (this.linkDistanceSlider) this.linkDistanceSlider.value = this.graph.linkDistance;
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
        if (!confirm(this.i18n.t('confirm_clear_all'))) return;
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
            graph: { 
                nodes, 
                links,
                settings: {
                    repulsion: this.graph.repulsion,
                    linkDistance: this.graph.linkDistance
                }
            },
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
                alert(this.i18n.t('import_success'));
            } catch (err) {
                alert(this.i18n.t('import_failed'));
            }
            if (this.importInput) this.importInput.value = '';
        };
        reader.readAsText(file);
    }
}
