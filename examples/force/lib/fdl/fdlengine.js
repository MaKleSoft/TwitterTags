/*
Author: Martin Kleinschrodt (MaKleSoft)

fdlengine - javascript engine for force-directed layouts
*/

window.requestAnimFrame = (function(callback){
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback){
        window.setTimeout(callback, 30);
    };
})();

// top namespace for the engine
fdlengine = {};

// node element
fdlengine.Node = function(id, mass, charge, pos, velocity) {
    // unique id
    this.id = id || null;
    
    // position of the node relative to the layout
    this.pos = pos || {x: 0, y: 0};
    
    // mass of the node. determines the inertia
    this.mass = mass || 1;
    
    // charge of the node. determines how strongly it repells other nodes.
    this.charge = (charge == undefined || charge == null) ? 1 : charge;
    
    // current velocity of the node in 1/ms
    this.velocity = velocity || {x: 0, y: 0};
    
    // current force that is affecting the node
    this.force = {x: 0, y: 0};
};

// link element that connects two nodes
fdlengine.Link = function(from, to, weight) {
    this.weight = weight || 1;
    this.from = from;
    this.to = to;
};

// Keeps track of all nodes and links. Calculates forces and updates the positions
fdlengine.Layout = function(width, height) {
    this.bounds = {width: width || 100, height: height || 100};
    this.nodes = {};
    this.links = {};
    this.maxId = -1;
    
    // Handlers for drawing nodes and links
    this.drawNodesStart = null;
    this.drawNode = null;
    this.drawNodesFinished = null;
    this.drawLinksStart = null;
    this.drawLink = null;
    this.drawLinksFinished = null;
    
    this.showFrameRate = null;
    
    // Wheter or not the layout assigns its own ids. Only set to false if the added Nodes all have their own unique ids
    this.assignsIds = true;
    
    // Node at the center of the layout
    this.centerNode = null;
    
    // Selected node. No forces are applied to this node.
    this.selectedNode = null;
    
    // maximum repulsive force
    this.maxRepForce = 10000;
    
    // friction coefficient
    this.friction = 0.0005;
    
    // strength of repulsive force
    this.repulsion = 2;
    
    // strength of attractive force
    this.attraction = 0.000001;
    
    // determines how strong inertia of a node scales with the mass. Must not be 0!
    this.inertia = 0.05;
    
    // charge density of the border
    this.borderCharge = 1;
    
    // whether or not to force node to stay in bounds
    this.keepInBounds = false;
    
    // Static noise to add to the node movement
    this.noise = 0;
};

/**
 * Adds a node object to the layout. Assigns an id if neccessary.
 * @param {fdlengine.Node} node
 * The node to add
 */
fdlengine.Layout.prototype.addNode = function(node) {
    var node = node || new Node();
    if (this.assignsIds || !node.id) {
        this.maxId++;
        node.id = this.maxId;
    }
    this.nodes[node.id] = node;
    
    return node;
};

/**
 * Returns an array of all nodes in the layout
 */
fdlengine.Layout.prototype.getNodesArray = function() {
    var nodes = [];
    for (var id in this.nodes) {
        nodes.push(this.nodes[id]);
    }
    return nodes;
};

/**
 * Adds a new link to the layout
 * @param {object} from
 * id of the first node
 * @param {object} to
 * id of the second node
 * @param {object} weight
 * weight or 'spring rate' of the link
 */
fdlengine.Layout.prototype.addNewLink = function(from, to, weight) {
    var link = new fdlengine.Link(from, to, weight);
    this.addLink(link);
    return link;
};

/**
 * Adds a link to the layout
 * @param {fdlengine.Link} link
 * Link to be added
 */
fdlengine.Layout.prototype.addLink = function(link) {
    if (!this.links[link.from]) {
        this.links[link.from] = {};
    }
    this.links[link.from][link.to] = link;
};

/**
 * Set a node as the center node of the layout.
 */
fdlengine.Layout.prototype.setCenterNode = function(node) {
    this.centerNode = node;
    node.pos.x = this.bounds.width/2;
    node.pos.y = this.bounds.height/2;
};

/**
 * Calculates the repulsive force between two nodes based on Coulomb's law.
 * @param {fdlengine.Node} n1
 * First node
 * @param {fdlengine.Node} n2
 * Second node
 */
fdlengine.Layout.prototype.repForce = function(n1, n2) {
    var dist = fdlengine.math.dist(n1.pos, n2.pos);
    var force = n1.charge * n2.charge / (dist*dist) * this.repulsion;
    return Math.min(force, this.maxRepForce);
};

/**
 * Calculates the attractive force between two nodes based on Hook's law.
 * @param {fdlengine.Node} n1
 * First node
 * @param {fdlengine.Node} n2
 * Second node
 */
fdlengine.Layout.prototype.attForce = function(n1, n2, weight) {
    var dist = fdlengine.math.dist(n1.pos, n2.pos);
    return weight * dist * this.attraction;
}

/**
 * Calculate all forces and update the node positions
 */
fdlengine.Layout.prototype.update = function(dt) {
    //start = new Date();
    
    var nodes = this.getNodesArray();
    //cp1 = new Date();
    
    if (this.drawNodesStart) {
        this.drawNodesStart();
    }
    
    // For each pair of nodes...
    var from, to, force;
    var maxVel = 0;
    //var start2, end2, rendTime = 0;
    for (var i=0; i<nodes.length; i++) {
        var one = nodes[i];
        
        // ... calculate the repulsive and attractive force
        for (var j=i+1; j<nodes.length; j++) {
            var other = nodes[j];
            force = 0;
            
            // attractive force
            var weight = 0;
            weight += (this.links[i] && this.links[i][j]) ? this.links[i][j].weight : 0;
            weight += (this.links[j] && this.links[j][i]) ? this.links[j][i].weight : 0;
            if (weight) {
                force -= this.attForce(one, other, weight);
            }
            
            // repulsive force
            force += this.repForce(one, other);
            
            if (force == NaN) {force = 0}
            var vect = fdlengine.math.normVector(fdlengine.math.connVector(one.pos, other.pos));
            
            one.force.x += -force * vect.x;
            one.force.y += -force * vect.y;
            other.force.x += force * vect.x;
            other.force.y += force * vect.y;
        }        
        
        // We've allready had all combinations with node i so we can go ahead and update its velocity and position
        
        // Add friction force based on Stoke's law
        one.force.x -= this.friction * one.velocity.x;
        one.force.y -= this.friction * one.velocity.y;
        
        // Add noise
        one.force.x += (Math.random() - 0.5) * this.noise / dt;
        one.force.y += (Math.random() - 0.5) * this.noise / dt;
        
        // Update node velocity
        if (one == this.selectedNode || one == this.centerNode) {
            one.velocity.x = 0;
            one.velocity.y = 0;
        } else {
            one.velocity.x += one.force.x / (one.mass * this.inertia) * dt;
            one.velocity.y += one.force.y / (one.mass * this.inertia) * dt;
        }
        
        maxVel = Math.max(fdlengine.math.norm(one.velocity), maxVel);
        
        // Update node position
        one.pos.x += one.velocity.x * dt;
        one.pos.y += one.velocity.y * dt;
        
        if (this.keepInBounds) {
            // Make sure node does not get out of bounds
            if (one.pos.x < 0) {
                one.pos.x = 0;
            }
            if (one.pos.x > this.bounds.width) {
                one.pos.x = this.bounds.width;
            }
            if (one.pos.y < 0) {
                one.pos.y = 0;
            }
            if (one.pos.y > this.bounds.height) {
                one.pos.y = this.bounds.height;
            }
        }
        
        //start2 = new Date();
        // Call handler for when the node has moved
        if (this.drawNode) {
            this.drawNode(one);
        }
//        end2 = new Date();
//        rendTime += end2.getTime() - start2.getTime();
        
        one.force = {x: 0, y: 0};
    }
    if (this.drawNodesFinished) {
        this.drawNodesFinished();
    }
    
    //console.log("total rendering time: " + rendTime);
    
    //var cp2 = new Date();
    
    // draw links
    if (this.drawLinksStart) {
        this.drawLinksStart();
    }
    if (this.drawLink) {
        for (var fromId in this.links) {
            for (var toId in this.links[fromId]) {
                this.drawLink(this.links[fromId][toId], this.nodes[fromId], this.nodes[toId]);
            }
        }
    }
    if (this.drawLinksFinished) {
        this.drawLinksFinished();
    }
    
    //var cp3 = new Date();
    
    // stop simulation if nothing is going on anymore (i.e. if the maximum movement falls under a certain threshold)
    if (this.threshold && maxVel*1000 < this.threshold) {
        this.stop();
    }
    
    //var end = new Date();
    
    //console.log("cp1: " + (cp1.getTime() - start.getTime()) + ", cp2: " + (cp2.getTime() - cp1.getTime()) + ", cp3: " + (cp3.getTime() - cp2.getTime()) + ", full time: " + (end.getTime() - start.getTime()));
};

/**
 * Puts the node at a random position within the layout
 * @param {fdlengine.Node} node
 * The node to randomize the position of
 */
fdlengine.Layout.prototype.randomizeNodePosition = function(node) {
    node.pos.x = Math.random() * this.bounds.width;
    node.pos.y = Math.random() * this.bounds.height;
    return node;
};

/**
 * Randomizes all node positions
 */
fdlengine.Layout.prototype.randomizePositions = function() {
    var nodes = this.getNodesArray();
    for (var i=0; i<nodes.length; i++) {
        this.randomizeNodePosition(nodes[i]);
    }
};

fdlengine.Layout.prototype.animate = function(lastTime){
    var date = new Date();
    var time = date.getTime();
    var timeDiff = time - lastTime;
    
    if (this.showFrameRate) {
        this.showFrameRate(1000/timeDiff);
    }

    var self = this;
    // request new frame
    if (time < this.stopTime) {
        this.running = true;
        requestAnimFrame(function(){
            self.animate.call(self, time);
        });
    } else {
        this.running = false;
    }
    
    // update
    this.update(timeDiff || 10);
}

/**
 * Runs the simulation for a specific time.
 * @param {int} time
 * How long to run the simulation in ms
 * @param {int} threshold
 * threshold for the minimum movement of elements in 1/s. If the maximum shift out of all nodes falls below this value, the simulation will be stopped.
 */
fdlengine.Layout.prototype.run = function(duration, threshold) {
    this.threshold = threshold;
    var duration = duration || 1024*1024;
    
    var time = new Date().getTime();
    this.stopTime = time + duration ;
    
    if (!this.running) {
        this.animate(time);
    }
};

/**
 * Clears the update interval and stops the simulation.
 */
fdlengine.Layout.prototype.stop = function() {
    this.stopTime = new Date();
};

// A couple of useful math functions
fdlengine.math = {
    /**
     * Calculate the distance between to points
     * @param {object} a
     * first point
     * @param {object} b
     * second point
     */
    dist: function(a, b) {
        return fdlengine.math.norm(fdlengine.math.connVector(a, b));
    },
    /**
     * Calculates the norm of a two dimensional vector
     * @param {object} v
     * The vector
     */
    norm: function(v) {
        return Math.sqrt(v.x*v.x + v.y*v.y);
    },
    /**
     * Returns the connecting vector between two points
     * @param {object} from
     * starting point
     * @param {object} from
     * end point
     */
    connVector: function(from, to) {
        return {
            x: (to.x - from.x),
            y: (to.y - from.y)
        };
    },
    /**
     * Returns a normalized version of the vector 
     * @param {object} v
     * The vector
     */
    normVector: function(v) {
        var norm = fdlengine.math.norm(v);
        return {
            x: v.x/norm,
            y: v.y/norm
        }
    }
};