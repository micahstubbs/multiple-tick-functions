    const width = 960;
    const height = 500;

    const force = d3.layout.force()
        .charge(-120)
        .linkDistance(30)
        .size([width, height]);

    const forceLabels = d3.layout.force()
        .size([width, height]);

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    const tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(d => `<strong>${d.name}</strong>   <span style='color:#CCC'>${d.role}</span>`);

    svg.call(tip);

    d3.csv("org.csv", (error, org) => {
      const color = d3.scale.category20();
      const indexMap = getIndexMap(org);
      const nameMap = getNameMap(org);
      const links = getLinks(indexMap, nameMap, org);
      const projects = getProjects(org);
      const fociMap = getFociMap(projects);
      let labels = [];
      let displayedLinks = [];
      const graph = {
        "links": links,
        "nodes": org
      };

      let node = svg.selectAll(".node");
      let link = svg.selectAll(".link");
      let label = svg.selectAll(".label");

      force
        .nodes(graph.nodes)
        .links(graph.links)
        .start();

      function initTeam() {
        displayedLinks = [];
        labels = [
          {name: 'Web'},
          {name: 'Core'},
          {name: 'Data'}
        ];

        force.charge(-50).gravity(0.05);
        forceLabels.charge(-2000).gravity(0.1).start();
      }

      function initHierarchy() {
        displayedLinks = links;
        labels = [
          {name:"RJMetrics Engineering"}
        ];

        force.charge(-220).gravity(0.05);
        forceLabels.charge(-10).gravity(0.05).start();
      }

      function initProject() {
        displayedLinks = [];
        labels = [];
        for(i=0; i<projects.length; i++) {
          labels.push( {name:projects[i]} );
        }

        force.charge(-10).gravity(0.05);
        forceLabels.charge(-10).gravity(0.05).start();
      }

      function start() {
        link = link.data(displayedLinks);
        link.enter().append("line")
          .attr("class", "link")
          .style("stroke-width", d => Math.sqrt(d.value));
        link.exit().remove();
        force.links(displayedLinks).start();

        node = node.data(force.nodes());
        node.enter().append("circle")
            .attr("class", "node")
            .attr("r", 5)
            .style("fill", d => color(d.team))
            .call(force.drag)
            .on("mousedown", () => { d3.event.stopPropagation(); })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        node.exit().remove();
        node.append("title")
            .text(d => d.name);
        label = svg.selectAll(".label")
          .data(labels);
        label.enter().append("text")
          .attr("class", "label")
          .attr("font-family", "sans-serif")
          .attr("font-size", "20px")
          .attr("fill", "#999");
        label.exit().remove();

        forceLabels.nodes(labels).start();
        label.text(d => d.name);
      }

      const hierarchy = () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label.attr("x", d => d.x)
             .attr("y", d => d.y);
       };

      const team = e => {
        const k = 6 * e.alpha;
        function getAnchor(team, dir) {
          if (dir == 'x') {
            result = ['Web', 'Core'].indexOf(team) > -1 ? true : false;
          }
          else {
            result = ['Web', 'Data'].indexOf(team) > -1 ? true : false;
          }
          return result;
        }

        graph.nodes.forEach((o, i) => {
          o.y += getAnchor(o.team, 'y') ? k : -k;
          o.x += getAnchor(o.team, 'x') ? k : -k;
        });

        labels.forEach((o, i) => {
          o.y += getAnchor(o.name, 'y') ? k : -k;
          o.x += getAnchor(o.name, 'x') ? k : -k;
        });

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label.attr("x", d => d.x)
            .attr("y", d => d.y);
      };

      const project = e => {
        const k = 0.1 * e.alpha;
        graph.nodes.forEach((o, i) => {
          o.y += (fociMap[o.project].y - o.y) * k;
          o.x += (fociMap[o.project].x - o.x) * k;
        });

        labels.forEach((o, i) => {
          o.y += (fociMap[o.name].y - o.y) * k;
          o.x += (fociMap[o.name].x + 100 - o.x) * k;
        });

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
      };

      const forceFns = [team, hierarchy, project];
      const initForceFns = [initTeam, initHierarchy, initProject];
      let forceFnIndex = 1;
      let forceFn = forceFns[forceFnIndex];

      initForceFns[forceFnIndex]();
      force.on("tick", forceFn);
      start();

      function nextForceFn() {
        forceFnIndex += 1;
        if (forceFnIndex == forceFns.length) {
          forceFnIndex = 0;
        }

        forceFn = forceFns[forceFnIndex];
        force.on("tick", forceFn);
      }

      d3.select("body")
          .on("mousedown", mousedown)
          .on("touchstart", mousedown);

      function mousedown() {
        nextForceFn();
        initForceFns[forceFnIndex]();
        start();
      }
    });

    function getIndexMap(items) {
      map = {};
      for(i=0; i<items.length; i++) {
        map[i] = items[i];
      }
      return map;
    }

    function getNameMap(items) {
      map = {};
      for(i=0; i<items.length; i++) {
        map[items[i].name.trim()] = i;
      }
      return map;
    }

    function getFociMap(items) {
      const map = {};
      const baseX = 300;
      const baseY = 50;
      const dy = 60;
      const dx = 0;

      for(i=0; i<items.length; i++) {
        y = baseY + (i*dy);
        map[items[i]] = { x: baseX+(i*dx), y: baseY+(i*dy) };
      }

      return map;
    }

    function getProjects(items) {
      projects = [];
      for(i=0;i<items.length;i++) {
        if (projects.indexOf(items[i].project) < 0) {
          projects.push(items[i].project);
        }
      }
      return projects;
    }

    function getLinks(indexMap, nameMap, items) {
      const links = [];
      for(i=0; i<items.length; i++) {
        source = nameMap[items[i].name];
        target = nameMap[items[i].manager];
        color = "#CCC";
        link = {
          "source": source,
          "target": target,
          "color": color,
          "value": 1,
          "weight": 1
        }
        if (target != null) {
          links.push(link);
        }
      }
      return links;
    }
