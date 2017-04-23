    var width = 960,
        height = 500;

    var force = d3.layout.force()
        .charge(-120)
        .linkDistance(30)
        .size([width, height]);

    var forceLabels = d3.layout.force()
        .size([width, height]);

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<strong>" + d.name + "</strong>   <span style='color:#CCC'>" + d.role + "</span>";
      });

    svg.call(tip);

    d3.csv("org.csv", function(error, org) {
      var color = d3.scale.category20();
      var indexMap = getIndexMap(org);
      var nameMap = getNameMap(org);
      var links = getLinks(indexMap, nameMap, org);
      var projects = getProjects(org);
      var fociMap = getFociMap(projects);
      var labels = [];
      var displayedLinks = [];
      var graph = {
        "links": links,
        "nodes": org
      }

      var node = svg.selectAll(".node");
      var link = svg.selectAll(".link");
      var label = svg.selectAll(".label");

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
          .style("stroke-width", function(d) { return Math.sqrt(d.value); });
        link.exit().remove();
        force.links(displayedLinks).start();

        node = node.data(force.nodes());
        node.enter().append("circle")
            .attr("class", "node")
            .attr("r", 5)
            .style("fill", function(d) { return color(d.team); })
            .call(force.drag)
            .on("mousedown", function() { d3.event.stopPropagation(); })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        node.exit().remove();
        node.append("title")
            .text(function(d) { return d.name; });
        label = svg.selectAll(".label")
          .data(labels);
        label.enter().append("text")
          .attr("class", "label")
          .attr("font-family", "sans-serif")
          .attr("font-size", "20px")
          .attr("fill", "#999");
        label.exit().remove();

        forceLabels.nodes(labels).start();
        label.text(function(d) { return d.name; });
      }

      var hierarchy = function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        label.attr("x", function(d) { return d.x; })
             .attr("y", function(d) { return d.y; });
       };

      var team = function(e) {
        var k = 6 * e.alpha;
        function getAnchor(team, dir) {
          if (dir == 'x') {
            result = ['Web', 'Core'].indexOf(team) > -1 ? true : false;
          }
          else {
            result = ['Web', 'Data'].indexOf(team) > -1 ? true : false;
          }
          return result;
        }

        graph.nodes.forEach(function(o, i) {
          o.y += getAnchor(o.team, 'y') ? k : -k;
          o.x += getAnchor(o.team, 'x') ? k : -k;
        });

        labels.forEach(function(o, i) {
          o.y += getAnchor(o.name, 'y') ? k : -k;
          o.x += getAnchor(o.name, 'x') ? k : -k;
        });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        label.attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; });
      };

      var project = function(e) {
        var k = 0.1 * e.alpha;
        graph.nodes.forEach(function(o, i) {
          o.y += (fociMap[o.project].y - o.y) * k;
          o.x += (fociMap[o.project].x - o.x) * k;
        });

        labels.forEach(function(o, i) {
          o.y += (fociMap[o.name].y - o.y) * k;
          o.x += (fociMap[o.name].x + 100 - o.x) * k;
        });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
        label
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; });
      }

      var forceFns = [team, hierarchy, project];
      var initForceFns = [initTeam, initHierarchy, initProject];
      var forceFnIndex = 1;
      var forceFn = forceFns[forceFnIndex];

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
      var map = {};
      var baseX = 300;
      var baseY = 50;
      var dy = 60;
      var dx = 0;

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
      var links = [];
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
