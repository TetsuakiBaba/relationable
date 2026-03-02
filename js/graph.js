import { getNodeImage } from './db.js';

export class GraphManager {
    constructor(svgId) {
        this.svg = d3.select(svgId);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.nodes = [];
        this.links = [];
        this.selectedElement = null;

        this.initSimulation();
        this.initGroups();
        this.initEvents();
    }

    initSimulation() {
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .on("tick", () => this.ticked());
    }

    initGroups() {
        this.container = this.svg.append("g").attr("class", "zoom-container");
        this.gLinks = this.container.append("g").attr("class", "links");
        this.gNodes = this.container.append("g").attr("class", "nodes");

        this.tempLine = this.container.append("line")
            .attr("class", "temp-line")
            .style("visibility", "hidden");
    }

    initEvents() {
        // Zoom functionality
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on("zoom", (event) => {
                this.container.attr("transform", event.transform);
            });

        this.svg.call(this.zoom);

        this.svg.on("click", (event) => {
            if (event.target.tagName === "svg") {
                this.onDeselect();
            }
        });

        window.addEventListener("resize", () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
            this.simulation.alpha(0.3).restart();
        });
    }

    setData(data) {
        this.nodes = data.nodes || [];
        this.links = data.links || [];
        this.update();
    }

    update() {
        // Links
        const link = this.gLinks.selectAll(".link-group")
            .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

        link.exit().remove();

        const linkEnter = link.enter().append("g").attr("class", "link-group");

        linkEnter.append("line")
            .attr("class", "link")
            .on("click", (event, d) => this.onElementClick(event, d, 'link'));

        linkEnter.append("text")
            .attr("class", "link-label")
            .attr("dy", -5)
            .attr("text-anchor", "middle");

        const linkUpdate = linkEnter.merge(link);
        linkUpdate.select("text").text(d => d.name || "");

        // Nodes
        const node = this.gNodes.selectAll(".node")
            .data(this.nodes, d => d.id);

        node.exit().remove();

        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .on("click", (event, d) => this.onElementClick(event, d, 'node'))
            .call(this.drag(this.simulation));

        nodeEnter.append("circle")
            .attr("r", 30);

        nodeEnter.append("clipPath")
            .attr("id", d => `clip-${d.id}`)
            .append("circle")
            .attr("r", 30);

        nodeEnter.append("image")
            .attr("clip-path", d => `url(#clip-${d.id})`)
            .attr("x", -30)
            .attr("y", -30)
            .attr("width", 60)
            .attr("height", 60)
            .attr("preserveAspectRatio", "xMidYMid slice");

        nodeEnter.append("text")
            .attr("dy", 45)
            .text(d => d.name);

        // Handle for link creation
        nodeEnter.append("circle")
            .attr("class", "handle")
            .attr("r", 8)
            .attr("cx", 30)
            .call(this.linkDrag());

        const nodeUpdate = nodeEnter.merge(node);
        nodeUpdate.select("text").text(d => d.name);

        // Update images
        nodeUpdate.each(async function (d) {
            const blob = await getNodeImage(d.id);
            if (blob) {
                const url = URL.createObjectURL(blob);
                d3.select(this).select("image").attr("href", url);
            } else {
                d3.select(this).select("image").attr("href", null);
            }
        });

        this.simulation.nodes(this.nodes);
        this.simulation.force("link").links(this.links);
        this.simulation.alpha(1).restart();
    }

    ticked() {
        this.gLinks.selectAll("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        this.gLinks.selectAll(".link-label")
            .attr("transform", d => {
                const x = (d.source.x + d.target.x) / 2;
                const y = (d.source.y + d.target.y) / 2;
                const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
                return `translate(${x},${y}) rotate(${angle})`;
            });

        this.gNodes.selectAll(".node")
            .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    fitToScreen() {
        if (!this.nodes || this.nodes.length === 0) return;

        const bounds = this.container.node().getBBox();
        const parent = this.svg.node();
        const fullWidth = parent.clientWidth;
        const fullHeight = parent.clientHeight;
        const width = bounds.width;
        const height = bounds.height;
        const midX = bounds.x + width / 2;
        const midY = bounds.y + height / 2;

        if (width === 0 || height === 0) return;

        const scale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
        const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

    drag(simulation) {
        return d3.drag()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
                this.onDataChange();
            });
    }

    linkDrag() {
        let sourceNode = null;
        return d3.drag()
            .on("start", (event, d) => {
                event.sourceEvent.stopPropagation();
                sourceNode = d;

                // get current transform to adjust coordinates
                const transform = d3.zoomTransform(this.svg.node());
                const [x, y] = transform.invert([event.sourceEvent.clientX, event.sourceEvent.clientY]);

                this.tempLine
                    .attr("x1", d.x)
                    .attr("y1", d.y)
                    .attr("x2", d.x)
                    .attr("y2", d.y)
                    .style("visibility", "visible");
            })
            .on("drag", (event) => {
                // event.x/y are already relative to the container for normal drags
                this.tempLine
                    .attr("x2", event.x)
                    .attr("y2", event.y);
            })
            .on("end", (event) => {
                this.tempLine.style("visibility", "hidden");
                const targetElement = document.elementFromPoint(event.sourceEvent.clientX, event.sourceEvent.clientY);
                const targetNodeG = targetElement ? targetElement.closest(".node") : null;

                if (targetNodeG) {
                    const targetData = d3.select(targetNodeG).datum();
                    if (targetData && targetData.id !== sourceNode.id) {
                        this.addLink(sourceNode.id, targetData.id);
                    }
                }
                sourceNode = null;
            });
    }

    addNode(x, y) {
        const id = 'node-' + Date.now();
        this.nodes.push({ id, name: '新しい人物', x: x || this.width / 2, y: y || this.height / 2 });
        this.update();
        this.onDataChange();
    }

    addLink(sourceId, targetId) {
        // Prevent duplicates
        if (this.links.find(l => (l.source.id === sourceId && l.target.id === targetId) || (l.source.id === targetId && l.target.id === sourceId))) return;

        this.links.push({ source: sourceId, target: targetId, name: '' });
        this.update();
        this.onDataChange();
    }

    deleteElement(id, type) {
        if (type === 'node') {
            this.nodes = this.nodes.filter(n => n.id !== id);
            this.links = this.links.filter(l => {
                const sId = l.source.id || l.source;
                const tId = l.target.id || l.target;
                return sId !== id && tId !== id;
            });
        } else {
            const idObj = JSON.parse(id);
            this.links = this.links.filter(l => {
                const sId = l.source.id || l.source;
                const tId = l.target.id || l.target;
                return !(sId === idObj.source && tId === idObj.target);
            });
        }
        this.update();
        this.onDataChange();
    }

    // Callbacks to be set by UI
    onElementClick(event, d, type) { /* to be overridden */ }
    onDeselect() { /* to be overridden */ }
    onDataChange() { /* to be overridden */ }
}
