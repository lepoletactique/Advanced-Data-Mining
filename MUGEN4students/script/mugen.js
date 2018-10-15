/*****************************************************************************************/
// VARIABLES
/*****************************************************************************************/

var graphURL = "./data/mu_128.json";
//var graphURL = "./data/simple_communities.json";
var imagePath  = "./data/images/";	

// Graph object 
var currentGraph = null;

// Buttons variable
var displayEdge = true;
var displayImage = false;
var blackNodes = false;
var MFNodes = false;

// Default color of the nodes 
var defaultColor = "#F0141E";

// Camera animation parameters
var zoomRatio = 0.25;
var animDuration = 1000;
var minNodeSize_ = 2;
var maxNodeSize_ = 20;

// Neigbours 
var neighbours = [];
var current_Node;

/// Initial tab
var currentTab = "nodeTab";

// Sigma.js instance
var sig = null;



/*****************************************************************************************/
// ON LOAD
/*****************************************************************************************/
/** 
  * Function that initialize a sigma instance and load the graph 
  */
function on_load()
{
	// Add edge presence check method
	sigma.classes.graph.addMethod('is_edge', function(n1,n2) {
	    return this.allNeighborsIndex[n1][n2] != null;
	});

	// Initialise a sigma instance
	sig = new sigma({
		graph: {
			nodes: [], edges: []},
			renderer: {
			container: 'graph',
			type: 'canvas'
		},

		// https://github.com/Linkurious/linkurious.js/wiki/Settings
		settings : 
		{
			 // Labels:
			font: 'helvetica',
			defaultLabelColor: '#000000',
			defaultLabelSize: 12,
			labelThreshold: 10,
			defaultEdgeLabelSize: 12,
			edgeLabelThreshold: 15,
			drawLabels: false,
			drawEdgeLabels: false,

			// Edges:
			edgeColor: 'default',
			defaultEdgeColor: '#ccc',

			// Nodes:
			defaultNodeColor: defaultColor,
			borderSize: 2,
			outerBorderSize: 2,
			nodeBorderColor: 'default',
			defaultNodeBorderColor: '#fff',
			defaultNodeOuterBorderColor: '#000',

			// Hovered items:
			singleHover: true,
			hoverFontStyle: 'bold',
			nodeHoverColor: 'default',
			defaultNodeHoverColor: '#000',
			edgeHoverColor: 'default',
			defaultEdgeHoverColor: '#000',
			labelHoverColor: 'default',
			enableEdgeHovering: true,
			defaultLabelHoverColor: '#000',
			labelHoverBGColor: 'default',
			defaultHoverLabelBGColor: '#fff',
			labelHoverShadow: 'default',
			labelHoverShadowColor: '#000',
			edgeHoverExtremities: true, 		// (Dis)allow edge endpoints highlight
			
			// Rescale settings
			minNodeSize: minNodeSize_,
			maxNodeSize: maxNodeSize_,
			minEdgeSize: 1,
			maxEdgeSize: 2,

			// Captors setting
			zoomMin: 0.05,
			zoomMax: 5,
			doubleClickZoomDuration: 0,
			touchEnabled: false
		}
	});

	// Load the graph file
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

			// Read JSON
	    	currentGraph = JSON.parse(xmlhttp.responseText);

	    	// Read as sigma graph
			sig.graph.read(currentGraph);

			// Notification
			console.log("Found " + sig.graph.nodes().length + " nodes in the graph.")

			// Initialise graph
			initListener();

			// Prune graph - remove edges with weight < 
			pruneGraph();

			// Display graph
			display();

			// Compute edge weights boxplot
			edgeWeightsBoxplot();

		}
	};
	xmlhttp.open("GET", graphURL, true);
	xmlhttp.send();
}


/*****************************************************************************************/
// FUNCTIONS
/*****************************************************************************************/
/** 
  * Function to initialize the event listeners
  *
  */
function initListener()
{
	// When a node is clicked
	sig.bind('clickNode', function(e) {
		// Displaying the informations of the node
		selectNode(e.data.node.id, "image", false);
		current_Node = e.data.node;

	});
						
	// When the background is left clicked, not for dragging
	sig.bind('clickStage', function(e) {

		if (!e.data.captor.isDragging){

			// Deselecting the node
			deselectNode();
			
			// Resetting the camera
			sigma.misc.animation.camera(
				sig.camera, 
				{
					x: 0, 
					y: 0,
					ratio: 1
				}, 
				{duration: 300}
			);
		}
	});

	// When a node is hovered
	sig.bind('hovers', function(e) {
	
		// Handling non leaf node hover
		if (e.data.current.nodes.length > 0) {
		
			// Get hovered node
			hoveredNode = e.data.current.nodes[0];
			
			// Display node medoid as thumbnail
			if (hoveredNode.representative)
			{
				img = ( hoveredNode.image.url )? hoveredNode.image.url : hoveredNode.image;
				document.getElementById("currentNode").innerHTML = "<img id=\"miniCurrentImage\" src=\"" + img + "\"/>";	
			}								
		}
		else
		{
			// Reset thumbnail
			document.getElementById("currentNode").innerHTML = "";
		}
	});
	
};



/** 
  * Function that display a graph that has been load by sigma 
  *
  */
function display()
{
	// Reset the display
	sigma.misc.animation.camera(
		sig.camera, 
		{
			x: 0, 
			y: 0,
			ratio: 1
		}, 
		{duration: 1}
	);

	// Preprocess each node
	sig.graph.nodes().forEach(function(n) {

		// Assign images
		if (n.representative)
		{
			// Set the image as object to display them in the nodes
			if (displayImage)
				n.image = {
					url: imagePath + n.representative,
					clip: 1.0,
					scale: 1.0,
				}
			else 	// Set the images only as path to hide them
				n.image = imagePath + n.representative;
		}

		// Circled nodes
		n.type = "circle"
		
		// Save original attributes
		n.originalColor = (n.color)? n.color : sig.settings('defaultNodeColor');
		n.originalSize = (n.size)? n.size : sig.settings('minNodeSize');
		n.originalLabel = (n.label)? n.label : "";

	});
			
	// Preprocess each edge
	sig.graph.edges().forEach(function(e) {
	
		// Save original attributes
		e.originalColor = (e.color)? e.color : sig.settings('defaultEdgeColor');
		e.originalSize = (e.size)? e.size : sig.settings('minNodeSize');
		e.originalLabel = (e.label)? e.label : "";

		// Assign default color and size + weight as label
		e.color = sig.settings('defaultEdgeColor');
		e.size = sig.settings('maxEdgeSize');
		e.label = e.weight;
		e.weight = parseFloat(e.weight);
	});

	// Display the graph
	sig.refresh();

}




/** 
  * Function to change the colors and shapes of the nodes
  *
  */
function changeNodeStyles()
{
	if (!blackNodes)
	{
		// Change the style of the nodes
		sig.graph.nodes().forEach(function(n) { 

			n.color = "#000"; 
			n.type = "circle";
		});
	}
	else
	{
		// Reinitialise node style
		sig.graph.nodes().forEach(function(n) { 

			n.color = n.originalColor; 
			n.type = "circle";
		});

	}

	// Update boolean 
	blackNodes = !blackNodes;
	
	// Refresh the display
	sig.refresh();
}



/** 
  * Function to show or hide the edges of the graph
  *
  */
function showHideEdges()
{
	// Show the edges
	if (!displayEdge)
	{
		document.getElementById("showHideEdgesImage").src = "images/hide_edges.png";
		displayEdge = true;
		
		sig.graph.edges().forEach(function(e) {
			e.hidden = false;
		});
	}
	// Hide the edges
	else
	{
		document.getElementById("showHideEdgesImage").src = "images/show_edges.png";
		displayEdge = false;
		
		sig.graph.edges().forEach(function(e) {
			e.hidden = true;
		});
	}
	
	// Refresh the display
	sig.refresh();
}



/** 
  * Function to display images in the node or hide them
  *
  */
function showHideImages()
{
	// Show the images
	if (!displayImage)
	{
		// Change the button
		document.getElementById("showHideImagesImage").src = "images/hide_image.png";
		displayImage = true;
	
		// Set the image as object to display them in the nodes
		sig.graph.nodes().forEach(function(n) {
			if (n.representative)
			{
				n.image = {
					url: imagePath + n.representative,
					clip: 1.0,
					scale: 1.0
				}
			}
			n.color = "#ffffff";
		});
		sig.refresh();
	}

	// Hide the images
	else
	{
		// Change the button
		document.getElementById("showHideImagesImage").src = "images/show_image.png";
		displayImage = false;
		
		// Set the images only as path
		sig.graph.nodes().forEach(function(n) {
		
			if (n.representative)
				n.image = imagePath + n.representative;
				
			n.color = sig.settings('defaultNodeColor');;
		});

		// Refresh the display
		sig.refresh();
	}
}



/**
  * Function to highlight male/female classes
  *
  */
function maleFemaleHighlight()
{
	if(!MFNodes)
	{
			// Change the style of the nodes
			sig.graph.nodes().forEach(function(n) { 
				console.log(n)
				if (n.sex=="M")//blue for male
				{
					n.color = "#0000FF"; 
					n.type = "circle";
				}
				//red for female
				else{
					n.color = "#FF0000"; 
					n.type = "circle";
				}
			});
	}
	else
	{
		// Reinitialize node style
		sig.graph.nodes().forEach(function(n) { 

			n.color = n.originalColor; 
			n.type = "circle";
		});
	}

	// Update boolean 
	MFNodes = !MFNodes;
	
	// Refresh the display
	sig.refresh();
}




/** 
  * Function to run the Fruchterman-Reingold layout algorithm
  *
  */
function frLayout()
{
	// Configure the Fruchterman-Reingold algorithm:
	var frListener = sigma.layouts.fruchtermanReingold.configure(sig, {
	  iterations: 1000,
	  easing: 'quadraticInOut',
	  duration: 10000 
	});

	// Start the Fruchterman-Reingold algorithm:
	sigma.layouts.fruchtermanReingold.start(sig);

}



/** 
  * Function to run the Force Link layout algorithm
  *
  */
function flLayout()
{
	// Configure the ForceLink algorithm:
	var fa = sigma.layouts.configForceLink(sig, {
	  worker: true,
	  autoStop: true,
	  background: true,
	  scaleRatio: 10,
	  gravity: 3,
	  easing: 'quadraticInOut'
	});

  // Start the ForceLink algorithm:
  sigma.layouts.startForceLink();
}




/** 
  * Function that open the help page 
  * 
  */
function help()
{
	window.open('help.html','_blank');
}



/** 
  * Function to change the node size 
  * 
  */
function changeNodeSize()
{
	// Getting the new value
	var value = document.getElementById("nodeSizeSlider").value;
	
	// Update the sigma instance maxNodeSize
	sig.settings('maxNodeSize', maxNodeSize_*value);

	// Refresh the display
	sig.refresh();
	
	// Update the UI
	document.getElementById("nodeSize").innerHTML = value;
}



/** 
  * Function to select a node
  * 
  */
function selectNode(nodeId)
{
	var newSelectedNode;
	var newImage;

	/* Getting the node itself */
	sig.graph.nodes().forEach(function(n) {
		if (n.id == nodeId)
		{
			newSelectedNode = n;
		}
	});	

	// Get image
	newImage = (newSelectedNode.image.url)? newSelectedNode.image.url : newSelectedNode.image

	// Moving the camera to zoom on the node
	sigma.misc.animation.camera(
		sig.camera, 
		{
			x: newSelectedNode[sig.camera.readPrefix + 'x'], 
			y: newSelectedNode[sig.camera.readPrefix + 'y'],
			ratio: zoomRatio
		}, 
		{duration: animDuration}
	);

	// Display the information of the node
	document.getElementById("selectedNode").innerHTML = "Node: " + nodeId + " - " + newSelectedNode.label;
	document.getElementById("selectedImage").innerHTML = "<img id=\"miniSelectedImage\" src=\"" + newImage + "\" onclick=\"zoomImage(&quot;" + newImage + "&quot;)\"/><br />";
	document.getElementById("selectedImage").innerHTML += "<div id=\"zoomMessage\">Click on the image to show it entirely</div><br/>";
	document.getElementById("nodesInfo").hidden = false;
	
	// Display the neighbours of the node
	document.getElementById("neighboursList").innerHTML = "";
	neighbours = getNeighbours(sig, nodeId);
	for (i = 0 ; i < neighbours.length ; i++)
	{
		var newNeighbourImage = (newSelectedNode.image.url)? neighbours[i].image.url : neighbours[i].image;

		var newNeighbour = "<li><a href=\"#\">";
		newNeighbour += "<img class=\"neighbourImage\" src=\"" + newNeighbourImage + "\" onclick=\"selectNode(&quot;" + neighbours[i].id + "&quot;)\"/>";
		newNeighbour += "<img class=\"neighbourImageZoom\" src=\"" + newNeighbourImage + "\" title=\"" + neighbours[i].label + "\" onclick=\"selectNode(&quot;" + neighbours[i].id + "&quot;)\"/>";
		newNeighbour += "</a></li>";
		document.getElementById("neighboursList").innerHTML += newNeighbour;	
	}
	document.getElementById("neighboursList").hidden = false;
}



/** 
  * Function to deselect the current node
  * 
  */
function deselectNode()
{
	// Delete the node information list
	document.getElementById("selectedNode").innerHTML = "Click on a node to show its data";
	document.getElementById("selectedImage").innerHTML = "";
	document.getElementById("neighboursList").innerHTML = "";
	document.getElementById("nodesInfo").hidden = true;
	
	// Reset neighbours list
	neighbours = [];

	// Reset the colours of edges
	sig.graph.edges().forEach(function(e) {
		e.color = e.originalColor;
	});

	sig.refresh();
}



/** 
  * Function to get the neighbours of a node
  * 
  */
function getNeighbours(sig, nodeId)
{
	var	neighboursId = [];
	var	weights = [];
	var neighbours = [];
	
	//TODO
	
	return neighbours;
}



/** 
  * Function to view the current selected image full-sized
  * 
  */
function zoomImage(image)
{
	// Get the name of the image
	var parts = image.split("/");
	var name = parts[parts.length - 1];
	
	// Set the image as the content of the window
	var content = "<html><head><title>" + name + "</title></head>"
	content += "<body><img src=\"" + image + "\"></body></html>";
	
	// Display the window
	var popupImage = window.open("", "_blank", "toolbar=0, location=0, directories=0, menuBar=0, scrollbars=1, resizable=1");
	popupImage.document.open();
	popupImage.document.write(content);
	popupImage.document.close()
}



/** 
  * Function to change the current displayed tab
  * 
  */
function changeTab(newTab)
{
	if(newTab == "shortestPathTab") 
	{
		shortestPath()
	}
	// Change the style of the tabs
	document.getElementById(currentTab).className = "tab nonSelectedTab";
	document.getElementById(newTab).className = "tab selectedTab";
	
	// Erase the content of the current tab
	document.getElementById(currentTab + "Content").className = "tabContent nonSelectedContent";
	
	// Display the content of the new tab
	document.getElementById(newTab + "Content").className = "tabContent selectedContent";
	currentTab = newTab;
}



/** 
  * Function to change the current displayed tab
  * https://plot.ly/javascript/box-plots/
  * 
  */
function edgeWeightsBoxplot()
{
	var weights = [];

	// Get list of weights
	sig.graph.edges().forEach(function(e) {
			weights.push(e.weight);
		}
	);
	// Sort weights
	weights.sort();

	// Build plotly structure for boxplot
	var trace = {
	  y: weights,
	  boxpoints: 'all',
      jitter: 0.3,
   	  pointpos: -1.8,
	  type: 'box'
	};

	var data = [trace];

	// Plot !
	Plotly.newPlot('edgeDistributionTabContent', data);
}





/*****************************************************************************************
// CLUSTERING
/*****************************************************************************************
/** 
  * Function to prune the graph based on weights
  * 
  */
function pruneGraph()
{
	// Notification
	console.log("Initial graph number of nodes = " + sig.graph.nodes().length );
	console.log("Initial graph number of edges = " + sig.graph.edges().length );

	// TODO

	// Notification
	console.log("Pruned graph number of nodes = " + sig.graph.nodes().length );
	console.log("Pruned graph number of edges = "  + sig.graph.edges().length );
}


/** 
  * Function to get the 10 nodes with the highest degree
  * 
  */
function highestDegreeNodes()
{
    //TODO
}


/** 
  * HITS nodes assignation
  * 
  */
function hitsAlgorithm()
{
	// The parameter true indicates that the graph is undirected
	var stats = sig.graph.HITS(true);

	// Convert to sortable objects
	var sortable = [];
	for (var stat in stats)
    	sortable.push([stat, stats[stat]])

	// Sort by autorithy
	sortable.sort(function(obj1, obj2){
    	return obj1[1].authority < obj2[1].authority;
	});

	// Reset node colours
	sig.graph.nodes().forEach(function(node) {
	  	node.color = "black";
	});

	// Colour 10 first "authority" nodes
	for (var i = 0; i < 5; i++) {
		sig.graph.nodes(sortable[i][0]).color = "blue";
		console.log("HITS " + i + " : " + sig.graph.nodes(sortable[i][0]).label);
	} 

	// Refresh sigma renderers:
	sig.refresh({skipIndexation: true});
}


/** 
  * Louvain clustering
  * 
  */
function louvainClustering()
{
	//Partie 1
	// Run Louvain clustering
	var louvainInstance = sigma.plugins.louvain(sig.graph);

	// Declare array of colours
	var colours = ['aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy',
	              'olive', 'orange', 'purple', 'red', 'silver', 'teal', 'white', 'yellow'];

	// Colour nodes based on their community
	sig.graph.nodes().forEach(function(node) {
		//console.log(node.id + " - class = " + node._louvain);
	  	node.color = colours[node._louvain];
	});

	// Refresh sigma renderers:
	sig.refresh({skipIndexation: true});
	
	//Partie 2
	// Get partitions at the lowest level:
	var partitions = louvainInstance.getPartitions({level: 1});
	var nbPartitions = louvainInstance.countPartitions(partitions);

	// Initialise community indexing structure
	var communityMap = {};
	for (var i=0; i<nbPartitions; i++)
		communityMap[i] = [];

	// Fill the community map
	for (var key in partitions)
		communityMap[partitions[key]].push(key);

	// Compute Internal density
	computeDensities(communityMap, nbPartitions);
}


/** 
  * Compute internal and external densities 
  * 
  */
function computeDensities(communityMap, nbPartitions)
{
	// Initialise internal density
	var internal_density = 0;
	var nb_internal_edges = 0;
	var external_density = 0;
	var denominator_external = 0;

	// Loop on each community
	for (var i=0; i<nbPartitions; i++)
	{
		// Get current community number of nodes
		var nb_nodes = communityMap[i].length;

		// Compute current coomunity internal edges
		var cpt_edges = 0;
		for (var n1=0; n1<nb_nodes; n1++)
			for (var n2=n1; n2<nb_nodes; n2++)
				if (sig.graph.is_edge(communityMap[i][n1],communityMap[i][n2]))
					cpt_edges++;

		// Update global internal density
		internal_density += cpt_edges/ (nb_nodes * (nb_nodes -1));

		// Update variables for external density
		nb_internal_edges += cpt_edges;
		denominator_external += nb_nodes * (nb_nodes -1);
	}

	// Compute external density
	var nb_nodes = sig.graph.nodes().length;
	var nb_edges = sig.graph.edges().length;
	external_density = (nb_edges - nb_internal_edges) / (nb_edges*(nb_edges-1) - denominator_external);

	// Update global internal density
	internal_density /= nbPartitions;

	// Notification
	console.log("Nb internal edges = " + nb_internal_edges);
	console.log("Internal density = " + internal_density);
	console.log("External density = " + external_density);
	msg = "Internal density = " + internal_density + " - External density = " + external_density
	alert(msg)
}



/** 
  * Newman-Girvan clustering
  * 
  */
function newmanGirvanClustering()
{
	var MAX_ITERATIONS = 1;
	var nb_iterations = 0;

	// Loop 
	while (nb_iterations < MAX_ITERATIONS)
	{
		// Initialise edge betweeness matrix
		var nodes = this.sig.graph.nodes();
		var nb_nodes = sig.graph.nodes().length;
		var edgesBetweeness = {};

		// Paiwise shortest path
		for (var i=0; i<nb_nodes; i++)
		{
			for (var j=i+1; j<nb_nodes; j++)
			{
				// Compute shortest path
				var path = sig.graph.astar(nodes[i].id, nodes[j].id, { undirected: true });

				//TODO
			}
		}

		// Get more important edge
		//TODO
		
		// Colour it
		//TODO
					
		importantEdge.color = "red"; 
		importantEdge.size = 10
 		sig.refresh({skipIndexation: true});
		msg = "Most important edge is " + importantEdge.id + " that links nodes (" + max_key + ") with a total of " + max_value + " shortest paths."
		console.log(msg);
		alert(msg)
	
		//to be contibued...
		//TODO
				
		// Increment counter
		nb_iterations++;
		
	}
}



/** 
  * ShortestPath
  * 
  */
function shortestPath()
{
	console.log("Path");
	var path = sig.graph.astar("e1915", 'e1916', {
		undirected: true
	  });
	console.log(path)

	 
	//TODO
		
}




/*****************************************************************************************
// SPLASHSCREEN
/*****************************************************************************************
/** 
  * Function to fade out the splash screen 
  * 
  */
function splashscreenOnClick()
{
	// Assign splash screen click behaviour
	var splashscreen = document.getElementById("splashscreen");
	fadeOut(splashscreen);
}



/** 
  * Function to fade out an element
  * http://www.chrisbuttery.com/articles/fade-in-fade-out-with-javascript/
  * 
  */
function fadeOut(el)
{
  el.style.opacity = 1;

  (function fade() {
    if ((el.style.opacity -= .02) < 0) {
      el.style.display = "none";
    } else {
      requestAnimationFrame(fade);
    }
  })();
}

