import * as d3 from "d3";

function run() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const body = d3.select("body");
  const svg = body.append("svg").style("width", width).style("height", height);

  const rule = "{{x, y}} -> {{x, y}, {y, z}}"

  // Example initial graph
  let nodes = [{id: 1}, {id: 2}, {id: 3}];
  let links = [{source: 1, target: 2}, {source: 2, target: 3}];

  // Define the simulation
  let simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

  // Run the simulation step
  function simulationStep() {
      // Apply a simple rule: for each node, add a new node and link
      let newNodes = [];
      let newLinks = [];
      
      nodes.forEach(node => {
          let newNode = {id: nodes.length + newNodes.length + 1};
          newNodes.push(newNode);
          newLinks.push({source: node.id, target: newNode.id});
      });

      // Merge new nodes and links
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
  for (let i = 0; i < 5; i++) {
    simulationStep();
  }
}

export {
    run
}