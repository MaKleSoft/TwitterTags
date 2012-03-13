/*
Author: Martin Kleinschrodt (MaKleSoft)
*/
(function($) {
    /**
     * jQuery wrapper around the fdlengine.Layout object. Provides a convenient interface to the DOM
     */
    $.widget("fdl.layout", {
        options: {
            assignsIds: true,
            dt: 10,
            friction: 0.0005,
            repulsion: 2,
            attraction: 0.000001,
            inertia: 0.05,
            borderCharge: 1,
            threshold: 2,
            noise: 0,
            // for everything above see the docu for fdlengine.Layout
            scale: 1, // Scaling factor between coordinates inside the fdlengine.Layout object and the actual pixel values
            defaultThreshold: 20, // default threshold for minimum movement (see docu for fdlengine.Layout)
            allowDragging: true // Whether or not nodes react to dragging
        },
        _create: function() {
            var o = this.options;
            this.layout = new fdlengine.Layout();
            
            this.framerate = $("<div></div>").css({position: "absolute", bottom: "5px", right: "5px"}).appendTo(this.element);
            
            this.canvas = $("<canvas></canvas>").css({position: "absolute", "z-index": "-1"}).appendTo(this.element);
            //this.element.addClass("fdl-layout");
            this.sideRule_0 = $("<style type='text/css'></style>").appendTo("head");
            this.sideRule_1 = $("<style type='text/css'></style>").appendTo("head");
            
            for (var each in o) {
                this._setOption(each, o[each]);
            }
            
            this.nodes = {};
            this.links = {};
            
            this.side = 0;
            
            this._boundsChanged();
            var self = this;
            
            this._linkColor = function() {
                return "#000000";
            }
            this._linkWidth = function() {
                return 1;
            }
            
//            this.layout.drawNodesStart = function() {
//                self._drawNodesStart.call(self);
//            };
//            this.layout.drawNodesFinished = function() {
//                self._drawNodesFinished.call(self);
//            };
            // set handlers for drawing nodes and links
            this.layout.drawNode = function(node) {
                self._drawNode.call(self, node);
            };
            this.layout.drawLinksStart = function() {
                self._drawLinksStart.call(self);
            };
            this.layout.drawLink = function(link, n1, n2) {
                self._drawLink.call(self, link, n1, n2);
            };
            this.layout.drawLinksFinished = function() {
                self._drawLinksFinished.call(self);
            };
            this.layout.showFrameRate = function(rate) {
                self.framerate.text("framerate: " + Math.round(rate) + " fps");
            };
            
            $(window).bind("resize", function() {
                self._boundsChanged.call(self)
                self.layout.run(null, self.options.defaultThreshold);
            });
            this.element.bind("mouseup", function() {
                self._deSelectNode.call(self);
                self.layout.run(null, self.options.defaultThreshold);
            });
            this.element.bind("mousemove", function(e) {
                if (self.selectedNode) {
                    self._trackNode.call(self, self.selectedNode, e);
                }
            });
        },
        _drawNodesStart: function() {
            this.nodesCss = "";
        },
        _drawNode: function(node) {
            var $node = this.nodes[node.id];
            var scale = this.options.scale;
            var layoutOffset = this.element.offset();
            
            // .get(0).offsetHeight/Width ist slightly faster than .height()/.width()
            var elem = $node.get(0);
            $node.css({
                left: (node.pos.x*scale - elem.offsetWidth/2 + layoutOffset.left) + "px",
                top: (node.pos.y*scale - elem.offsetHeight/2 + layoutOffset.top) + "px"
            });
            
//            var nextSide = this.side ? 0 : 1;
//            this.nodesCss += "\n .side-" + nextSide + " #node-" + node.id + 
//                " {left: " + (node.pos.x*scale - $node.get(0).offsetWidth/2 + layoutOffset.left) + "px;" + 
//                " top: " + (node.pos.y*scale - $node.get(0).offsetHeight/2 + layoutOffset.top) + "px" + "}"; 
        },
        _drawNodesFinished: function() {
            this.side = this.side ? 0 : 1;
            this["sideRule_" + this.side].text(this.nodesCss);
            this.element.toggleClass("side-0", !this.side);
            this.element.toggleClass("side-1", this.side);
        },
        _drawLinksStart: function() {
            var canvCont = this.canvas.get(0).getContext("2d");
            canvCont.clearRect(0, 0, this.canvas.width(), this.canvas.height());
            canvCont.beginPath();
        },
        _drawLinksFinished: function() {
            this.canvas.get(0).getContext("2d").stroke();
        },
        _drawLink: function(link, node1, node2) {
//            var $link = this.links[link.from] ? this.links[link.from][link.to] : undefined;
//            
//            if ($link) {
//                // for calculation reasons the link should always be drawn from left to right
//                fromNode = (node1.pos.x <= node2.pos.x) ? node1 : node2;
//                toNode = (node1.pos.x <= node2.pos.x) ? node2 : node1;
//                
//                // TODO: Maybe find a better way to calculate this
//                var connVector = fdlengine.math.connVector(fromNode.pos, toNode.pos);
//                var length = fdlengine.math.norm(connVector);
//                var angle = Math.atan(connVector.y/connVector.x);
//                var xOffset = -1 * length/2 * (1 - Math.cos(angle));
//                var yOffset = -1 * Math.sin(angle) * length/2;
//                var layoutOffset = this.element.offset();
//                var scale = this.options.scale;
//                $link.css({
//                    left: Math.round(fromNode.pos.x * scale + xOffset + layoutOffset.left) + "px",
//                    top: Math.round(fromNode.pos.y * scale - yOffset + layoutOffset.top) + "px",
//                    width: length + "px",
//                    "-webkit-transform": "rotate(" + angle + "rad)",
//                    "-moz-transform": "rotate(" + angle + "rad)",
//                    "-o-transform": "rotate(" + angle + "rad)",
//                    "-ms-transform": "rotate(" + angle + "rad)"
//                });
//            }
            var color = this._linkColor(link);
            if (color != "none") {
                var canvCont = this.canvas.get(0).getContext("2d");
                var scale = this.options.scale;
                //canvCont.lineWidth = this._linkWidth(link);
                canvCont.moveTo(node1.pos.x*scale, node1.pos.y*scale);
                canvCont.lineTo(node2.pos.x*scale, node2.pos.y*scale);
                //canvCont.strokeStyle = this._linkColor(link);
                //canvCont.stroke();
            }
        },
        _boundsChanged: function() {
            var bounds = {width: this.element.width()/this.options.scale, height: this.element.height()/this.options.scale};
            this.layout.bounds = bounds;
            this.canvas.attr({width: this.element.width(), height: this.element.height()});
        },
        _setOption: function(option, value) {  
            $.Widget.prototype._setOption.apply(this, arguments);
            if (/assignsIds|dt|friction|repulsion|attraction|inertia|bordercharge|threshold|noise/.test(option)) {
                this.layout[option] = value;
            }
        },
        _selectNode: function(nodeEl) {
            this.selectedNode = nodeEl;
            this.layout.selectedNode = nodeEl.node("getNode");
            nodeEl.addClass("fdl-node-selected");
        },
        _deSelectNode: function() {
            this.layout.selectedNode = null;
            if (this.selectedNode) {
                this.selectedNode.removeClass("fdl-node-selected");
            }
            this.selectedNode = null;
        },
        _trackNode: function(nodeEl, e) {
            var node = nodeEl.node("getNode");
            node.pos.x = (e.pageX - this.element.offset().left) / this.options.scale;
            node.pos.y = (e.pageY - this.element.offset().top) / this.options.scale;
        },
        /**
         * Add a node widget to the layout
         */
        addNode: function(nodeEl) {
            var node = nodeEl.node("getNode");
            this.layout.addNode(node);
            nodeEl.node("option", "id", node.id);
            this.nodes[node.id] = nodeEl;
            nodeEl.attr("id", "node-" + node.id);
            
            // insert the node at a random position
            this.layout.randomizeNodePosition(node);
            this.element.append(nodeEl);
            
            var self = this;
            $(nodeEl).bind("mousedown", function(e) {
                if (self.options.allowDragging) {
                    self._selectNode.call(self, nodeEl);
                    self._trackNode.call(self, nodeEl, e);
                }
                self.layout.run();
            });
        },
        /**
         * Set a node as the center node of the layout.
         */
        setCenterNode: function(nodeEl) {
            this.layout.setCenterNode(nodeEl.node("getNode"));
        },
        /**
         * DEPRECATED
         * Add link widget to the layout. Use this instead of addLink if the link needs to be drawn.
         */
        addLinkElement: function(linkEl) {
            var link = linkEl.link("getLink");
            this.addLink(link);
            
            if (!this.links[link.from]) {
                this.links[link.from] = {}
            }
            this.links[link.from][link.to] = linkEl;
            
            this.element.append(linkEl);
        },
        /**
         * Add a link to the layout
         */
        addLink: function() {
            var link;
            if (arguments[0] instanceof fdlengine.Link) {
                link = arguments[0];
            } else if (typeof(arguments[0]) == "number") {
                link = new fdlengine.Link(arguments[0], arguments[1], arguments[2]);
            } else if (typeof(arguments[0]) == "object") {
                link = new fdlengine.Link(arguments[0].from, arguments[0].to, arguments[0].weight);
                $.extend(link, arguments[0]);
            } else return;
            this.layout.addLink(link);
        },
        /**
         * Set link colors, either by passing a default color value or a handler function that returns the value specific to a link
         */
        linkColor: function(color) {
            if (typeof(color) == "string") {
                this._linkColor = function() {return color};
            } else if (typeof(color) == "function") {
                this._linkColor = color;
            } else return;
        },
        /**
         * Set link widths, either by passing a default color value or a handler function that returns the value specific to a link
         */
        linkWidth: function(width) {
            if (typeof(width) == "number") {
                this._linkWidth = function() {return width};
            } else if (typeof(width) == "function") {
                this._linkWidth = width;
            } else return;
        },
        /**
         * Randomize all node positions
         */
        randomizePositions: function() {
            this.layout.randomizePositions();
        },
        nodes: function() {
            var nodesArray = [];
            for (var each in this.nodes) {
                nodesArray.push(this.nodes[each]);
            }
            return nodesArray;
        },
        /**
         * Start simulation of the layout.
         * @param {int} time
         * How long to run the simulation. Omit this (and the threshold parameter) if the simulation should run indefinetely.
         * @param {int} threshold
         * If the maximum node movement falls under this threshold the simulation is stopped
         */
        run: function(time, threshold) {
            this.layout.run(time, threshold || this.options.defaultThreshold);
        },
        destroy: function() {
            $.Widget.prototype.destroy.call(this);
        }
    });

    /**
     * jQuery wrapper around the fdlengine.Node object. Provides a convenient interface to the DOM. Designed to be part of a fdl.Layout widget
     */
    $.widget("fdl.node", {
        options: {
            id: null,
            pos: {x: 0, y: 0},
            mass: 1,
            charge: 1,
            velocity: {x: 0, y: 0}
        },
        _create: function() {
            var o = this.options;
            this.node = new fdlengine.Node(o.id, o.mass, o.charge, o.pos, o.velocity);
            
            this.element.css("position", "absolute");
            this.element.addClass("fdl-node");
        },
        _setOption: function(option, value) {  
            if (/id|pos|mass|charge|velocity/.test(option)) {
                this.node[option] = value;
            }
        },
        /**
         * Get the underlying fdlengine.Node object
         */
        getNode: function() {
            return this.node;
        },
        /**
         * Get the id of the node
         */
        getId: function() {
            return this.node.id;
        },
        destroy: function() {
            $.Widget.prototype.destroy.call(this);
        }
    });
    
    /**
     * DEPRECATED
     * jQuery wrapper around the fdlengine.Link object. Connects two fdl.Node widgets. Provides a convenient interface to the DOM. Designed to be part of a fdl.Layout widget.
     */
    $.widget("fdl.link", {
        options: {
            from: 0,
            to: 1,
            weight: 1
        },
        _create: function() {
            var o = this.options;
            this.link = new fdlengine.Link(o.from, o.to, o.weight);
            var self = this;
            
            this.element.css({"position": "absolute", "z-index": "-1"});
        },
        _setOption: function(option, value) {  
            if (/from|top|weight/.test(option)) {
                this.link[option] = value;
            }
        },
        /**
         * Get the underlying fdlengine.Link object
         */
        getLink: function() {
            return this.link;
        },
        destroy: function() {
            $.Widget.prototype.destroy.call(this);
        }
    });
})(jQuery);