import * as d3 from "d3";

function treeSimilarity(node, adjancencyList, rootParam, paramAdjList) {
    // Calculate the similarity between the node and the parameter graph
    let isSimilar = true;
    const queue = [[node, rootParam]];

    while (queue.length > 0) {
        const [n, paramN] = queue.pop();

        if (paramAdjList[paramN].length === 0) {
            continue;
        }

        if (adjancencyList[n].length !== paramAdjList[paramN].length) {
            isSimilar = false;
            break;
        }

        paramAdjList[paramN].forEach((edge, i) => {
            queue.push([adjancencyList[n][i], edge]);
        });
    }

    return isSimilar;
}


function parseGraph(graph) {
    // Parse the string representation of the graph into an adjacency list

    // Use json to parse graph for now
    const graphComponents = graph.replaceAll("{", "[").replaceAll("}", "]");
    const pairs = JSON.parse(graphComponents);

    const adjList = {};

    // Construct the adjacency list
    pairs.forEach(pair => {
        const [n1, n2] = pair;
        if (n1 in adjList) {
            adjList[n1].push(n2.toString());
        }
        else {
            adjList[n1] = [n2.toString()];
        }
        if (!(n2 in adjList)) {
            adjList[n2] = [];
        }
    });

    return adjList;
}


function findRootNode(adjList) {
    const sourceNodes = Object.keys(adjList);
    const destinationNodes = [];

    Object.keys(adjList).forEach(node => {
        const edges = adjList[node];
        edges.forEach(edge => {
            if (!destinationNodes.includes(edge)) {
                destinationNodes.push(edge);
            }
        });
    });

    const nodeDiff = sourceNodes.filter(node => !destinationNodes.includes(node));

    if (nodeDiff.length !== 1) {
        throw new Error("Graph must have one root node");
    }

    return nodeDiff[0];
}


function getSymbolMap(rootNode, adjList, paramRootNode, paramGraph) {
    const symbolMap = {};

    const queue = [[rootNode, paramRootNode]];
    const visited = {};
    const paramVisited = {};

    while (queue.length > 0) {
        const [node, paramNode] = queue.pop();

        if (node in visited || paramNode in paramVisited || !(node in adjList) || !(paramNode in paramGraph)) {
            continue;
        }

        symbolMap[paramNode] = node;

        // Only continue if graphs have same structure i.e. current node has same number of edges
        if (adjList[node].length === paramGraph[paramNode].length) {
            const edgePairs = adjList[node].map((edge, i) => {
                return [edge, paramGraph[paramNode][i]];
            }).filter(([edge, paramEdge]) => !(edge in visited) && !(paramEdge in paramVisited));

            queue.push(...edgePairs);
        }
    }

    return symbolMap;
}


function parseRule(rule) {
    // Parse the rule into a step function that takes in a graph,
    // applies the rule, and returns a new graph.
    // Rules must be a tree with one root node and not a forest.

    // Use json to parse rule for now
    const ruleComponents = rule.replaceAll("{", "[").replaceAll("}", "]").split("->");
    const parameters = JSON.parse(ruleComponents[0]);
    const body = JSON.parse(ruleComponents[1]);

    const paramGraph = {};

    // Construct the parameter graph
    parameters.forEach(pair => {
        const [n1, n2] = pair;

        if (n1 in paramGraph) {
            paramGraph[n1].push(n2);
        }
        else {
            paramGraph[n1] = [n2];
        }

        // For now only consider rules with one root node
        if (!(n2 in paramGraph)) {
            paramGraph[n2] = [];
        }
    });

    const paramRootNode = findRootNode(paramGraph);
    
    return function(adjList) {
        const newGraph = {};
        // Apply the rule to the graph
        // For now, only consider the first node in the parameter graph

        // Find all nodes in the graph that are similar to the parameter graph.
        // This differs from the wolfram approach in that we do not consider
        // relations that are similar but only tree structures that are similar.
        // For example, in the wolfram approach, the node 1 in the graph {1->2, 1->3}
        // would match the rule {x, y} -> {x,y}, {y,z} since both {1->2} and {1->3}
        // match {x, y} whereas in this approach it would not since 1 has 2 children and x only has 1.
        const similarNodes = Object.keys(adjList).filter(node => treeSimilarity(node, adjList, paramRootNode, paramGraph));
        let numNodes = Object.keys(adjList).length;

        // For each similar node, apply the rule
        // Apply rule "left to right". Do not consider multiple ways to apply rule.
        similarNodes.forEach(node => {
            // To implement the wolfram approach we would have to generate a different
            // symbol map for each traversal of the graph. The condition in
            // treeSimilarity would consider all nodes where
            // adjancencyList[n].length >= paramAdjList[paramN].length.
            const symbolMap = getSymbolMap(node, adjList, paramRootNode, paramGraph);
            const bodyMap = {};

            body.forEach(pair => {
                const [n1, n2] = pair;

                if (n1 in symbolMap && n2 in symbolMap) {
                    /**
                     * If both nodes are in the symbol map then they are both in the graph
                     * and we can just add an edge between them
                     */
                    const m1 = symbolMap[n1];
                    const m2 = symbolMap[n2];

                    if (m1 in newGraph) {
                        newGraph[m1].push(m2);
                    }
                    else {
                        newGraph[m1] = [m2];
                    }
                }
                else if (n1 in symbolMap) {
                    /**
                     * If n2 is not in the symbol map then create a new node
                     */
                    const m1 = symbolMap[n1];
                    const newNode = (numNodes + 1).toString();

                    if (n2 in bodyMap) {
                        newGraph[m1].push(bodyMap[n2]);
                    }
                    else {
                        bodyMap[n2] = newNode;
                        newGraph[m1] = [newNode];
                    }

                    numNodes += 1;
                }
                else {
                    /**
                     * If n1 is not in the symbol map then create a new node
                     */
                    const m2 = symbolMap[n2];
                    const newNode = (numNodes + 1).toString();

                    if (n1 in bodyMap) {
                        newGraph[bodyMap[n1]].push(m2);
                    }
                    else {
                        bodyMap[n1] = newNode;
                        newGraph[newNode] = [m2];
                    }

                    numNodes += 1;
                }
            });
        });

        // Add new nodes to the graph
        Object.keys(newGraph).forEach(node => {
            newGraph[node].forEach(edge => {
                if (!(edge in newGraph)) {
                    newGraph[edge] = [];
                }
            });
        });

        return newGraph;
    }
}


function getNodesAndLinks(adjList) {
    let nodes = Object.keys(adjList).map(node => ({id: node}));
    let links = [];

    Object.keys(adjList).forEach(node => {
        adjList[node].forEach(edge => {
            links.push({source: node, target: edge});
        });
    });

    return [nodes, links];
}


function run(initialGraph, rule, depth = 5) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const body = d3.select("body");

    body.selectAll("svg").remove(); // Clear the svg

    const svg = body.append("svg").style("width", width).style("height", height);

    // Example initial graph
    // Node ids are not zero-indexed
    let g = parseGraph(initialGraph);

    let [nodes, links] = getNodesAndLinks(g);

    // Define the simulation
    let simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Run the simulation step
    function simulationStep() {
        const stepFunction = parseRule(rule);
        g = stepFunction(g);

        let [n, l] = getNodesAndLinks(g);

        const nodeIds = nodes.map(node => node.id);
        const linkIds = links.map(link => link.source.id + link.target.id);
        const newNodes = n.filter(node => !nodeIds.includes(node.id));
        const newLinks = l.filter(link => !linkIds.includes(link.source.id + link.target.id));

        nodes = nodes.concat(newNodes);
        links = links.concat(newLinks);

        // Restart the simulation with new nodes and links
        simulation.nodes(nodes);
        simulation.force("link").links(links);
        simulation.alpha(1).restart();
    }

    // Draw the graph
    function update() {
        // Join new data with the elements
        const link = svg.selectAll(".link")
            .data(links)
            .join("line")
            .classed("link", true)
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        const node = svg.selectAll(".node")
            .data(nodes, d => d.id)
            .join("circle")
            .classed("node", true)
            .attr("r", 5)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .call(drag(simulation));

        // Update and restart the simulation.
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
    }

    // Drag functionality
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    // Start the simulation and update the graph
    simulation.on("tick", update);

    // Run the simulation step every 2 seconds
    for (let i = 0; i < depth; i++) {
        simulationStep();
    }
}

export {
    run,
}