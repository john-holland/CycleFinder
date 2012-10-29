var generateNewGraph = null;
var useRandomChecked = null;
var nodeCount_keyUp = null;
var set_timeout = null;
var getCycles = null;
var addCycleEntities = null;
var generateNewCycleAssuredGraph = null;
var createdNodes = [];
var currentNodeCount = 10;
var timeOut = 5;

$(document).ready(function() {
    var docHeight = $(document).height();
    var docWidth = $(document).width();
    var canvasElement = $("#myCanvas")[0];
    var entityCanvasElement = $("#entityCanvas")[0];
    
    canvasElement.height = docHeight;
    canvasElement.width = docWidth;
    entityCanvasElement.height = docHeight;
    entityCanvasElement.width = docWidth;
    
    var entityCanvas = entityCanvasElement.getContext("2d");
    var context = canvasElement.getContext("2d");
    context.fillRect(0, 0, docWidth, docHeight);
    var useRandomLayout = false;
    
    var entitySystem = new JSEntitySystem(32, entityCanvas);
    var image = new Image();
    image.onload = function() {
        
        entitySystem.RegisterComponent("FollowCycle", null, [], [ "Cycle" ])
            .Assigned(function(entity, gameTime) {
                if (typeof entity.Datas.Cycle === 'undefined') {
                    throw new Error("Entity was assigned FollowCycle but lacked a Cycle to follow!");
                }
                var cycle = entity.Datas.Cycle;
                
                var currentTarget = (typeof entity.Datas.CurrentTarget === 'undefined' ? cycle.First() : entity.Datas.CurrentTarget);
                entity.Datas.CurrentTarget = currentTarget;
                
                entity.Datas.Position = currentTarget.Position.AsImmutable();
            })
            .Update(function(entity, gameTime) {
                var cycle = entity.Datas.Cycle;
                var currentTarget = (typeof entity.Datas.CurrentTarget === 'undefined' ? cycle.First() : entity.Datas.CurrentTarget);
                
                var toTarget = entity.Datas.Position.To(currentTarget.Position.AsImmutable());
                
                entity.Datas.Rotation = toTarget.ToRadians();
                
                if (toTarget.Length() < 10) {
                    var index = cycle.indexOf(currentTarget);
                    if ((index + 1) < cycle.length) {
                        entity.Datas.CurrentTarget = cycle[(index + 1)];
                    } else {
                        entity.Datas.CurrentTarget = cycle.First();
                    }
                }
            });
            
        //TODO: Finish, and put onto arrows. Make more by default at a slight interval.
        entitySystem.RegisterComponent("HorizontalSinWaveMovement", null, [], ['Position'])
            .Assigned(function (entity, gameTime) {
                entity.Datas.SinValue = RandomFromTo(0, 100) / 100;
                entity.Datas.Speed = RandomFromTo(1, 10);
                entity.Datas.SinWidth = 2;
                entity.Datas.OriginalPos = entity.Datas.Position;
                entity.Datas.LastUpdatedPos = entity.Datas.Position;
            })
            .Update(function (entity, gameTime) {                
                entity.Datas.SinValue += entity.Datas.Speed * (gameTime / 1000);
                
                var perp = entity.Datas.Heading.Perpindicular();
                
                if (typeof entity.Datas.OldPerp !== 'undefined') {
                    
                } else if (entity.Datas.OldPerp.Equals(perp)) {
                    
                }
                
                perp.Y = ((Math.sin(entity.Datas.SinValue) - 0.5) * entity.Datas.SinWidth);
                
                entity.Datas.Position = entity.Datas.OriginalPos.Add(perp);
                
                //entity.Datas.LastUpdatedPos = entity.Datas.Position;
                
                //entity.Datas
            });
            
        entitySystem.RegisterComponent('MovementUpdater', null, [],
            ['Position', 'Rotation', 'Speed', 'Heading'])
            .Update(function(entity, gameTime) {
                //update
                
                var rot = entity.Datas.Rotation;
    
                entity.Datas.Heading = (new ImmutableV2(Math.cos(rot), Math.sin(rot))).Normalize();
    
                entity.Datas.Position = entity.Datas.Position.Add(entity.Datas.Heading.Multiply(entity.Datas.Speed).Multiply(gameTime / 1000));
                
                if (typeof entity.Datas.ElementToMove !== 'undefined') {
                    var div = entity.Datas.ElementToMove;
                    div.css('left', entity.Datas.Position.X);
                    div.css('top', entity.Datas.Position.Y);
                }
            });
            
        var toRadians = Math.PI/180;
        entitySystem.RegisterComponent('ImageCanvasRenderer', null, [],
            ['Position', 'Rotation', 'ImageToRender', 'ContextToRenderOn'])
            .Render(function(entity, gameTime) {
                //render
                if (entity.Datas.ContextToRenderOn === null || entity.Datas.ImageToRender === null
                    || typeof entity.Datas.ImageToRender === 'undefined') {
                    return;
                }
                
                var contextToRenderOn = entity.Datas.ContextToRenderOn;
                
                contextToRenderOn.save();
     
                contextToRenderOn.translate(entity.Datas.Position.X, entity.Datas.Position.Y);
             
                contextToRenderOn.rotate(entity.Datas.Rotation);
             
            	contextToRenderOn.drawImage(entity.Datas.ImageToRender, -(entity.Datas.ImageToRender.width/2), -(entity.Datas.ImageToRender.height/2));
                
                contextToRenderOn.restore();
            });
            
        entitySystem.RegisterComponent('DrawCircle', null, [], 
            ["Radius", "Position", "FillColor", "BorderColor", "BorderThickness", "RenderContext"])
            .Render(function(entity, gameTime) {
                //drawACircle!
                this.RenderContext.save();
                this.RenderContext.beginPath();
                this.RenderContext.arc(this.Position.X, this.Position.Y, this.Radius, 0, 2 * Math.PI, false);
                this.RenderContext.fillStyle = this.FillColor;
                this.RenderContext.fill();
                this.RenderContext.lineWidth = this.BorderThickness;
                this.RenderContext.strokeStyle = this.BorderColor;
                this.RenderContext.stroke();
                this.RenderContext.restore();
            });
            
        entitySystem.StartUpdating();
        
        set_timeout = function() {        
            var selector = $("#timeout");
            var currentText = selector.val();
            
            if (isNumber(currentText)) {
                timeOut = parseFloat(currentText);
                selector.css("border-color", "white");
            } else {
                selector.css("border-color", "red");
                return;
            }
            
            if (timeOut < 1) {
                timeOut = 5;
            }
            
            if (timeOut > 100) {
                timeOut = 100;
            }
            
            selector.val(timeOut);
        }
        
        var bindTextField = function(selector, setValue, validateNumber, min, max) {
            var selector = $(selector);
            var currentText = selector.val();
            
            if (validateNumber) {
                var possibleNumber;
                if (isNumber(currentText)) {
                    possibleNumber = Math.floor(parseFloat(currentText));
                    currentText = setValue(currentText);
                    selector.css("border-color", "white");
                } else {
                    selector.css("border-color", "red");
                    return;
                }
                
                if (typeof min !== 'undefined') {
                    if (currentNodeCount < min) {
                        currentNodeCount = min;
                    }
                    
                    if (currentNodeCount > max) {
                        currentNodeCount = max;
                    }
                }
            } else {        
            currentText = setValue(currentText);
            }
            
            selector.val(currentNodeCount);
        }
        
        useRandomChecked = function() {
            $("#useRandom")[0].checked = !useRandomLayout;
            useRandomLayout = !useRandomLayout;
            generateNewCycleAssuredGraph();
        };
         
        nodeCount_keyUp = function() {
            var selector = $("#nodeCount");
            var currentText = selector.val();
            
            if (isNumber(currentText)) {
                currentNodeCount = Math.floor(parseFloat(currentText));
                selector.css("border-color", "white");
            } else {
                selector.css("border-color", "red");
                return;
            }
            
            if (currentNodeCount < 1) {
                currentNodeCount = 5;
            }
            
            if (currentNodeCount > 100) {
                currentNodeCount = 100;
            }
            
            selector.val(currentNodeCount);
            $("#nodeCountSlider").slider("value", currentNodeCount);
            generateNewCycleAssuredGraph();
        };
        
        var Graph = function(nodeCount) {
            //entityCanvas.globalAlpha = 0.0;
            entitySystem.StopUpdating();
            var graph = this;
            context.fillStyle = "gray";
            context.fillRect(0,0,docWidth,docHeight);
            
            var currentTime = $.now();
            var currentTimeOut = timeOut * 1000;
            var hasTimedOut = function() {
                if ((($.now()) - currentTime) > currentTimeOut) {
                    return true;
                } 
                
                return false;
            };
            var Node = function(name, nodes) {
                if (typeof nodes === 'undefined' || !nodes.Any()) {
                    nodes = [];
                }
                
                this.Nodes = nodes;
                this.Name = name;
            };
            
            if (createdNodes.Any()) {
                createdNodes.forEach(function (node) {
                    delete node;
                });
                
                createdNodes = [];
            }       
            
            graph.Nodes = [];
            (function() {
                var randomNode = null;
                for (var i = 0; i < nodeCount; i++) {
                    var newNode = new Node(i.toString(), []);
                    
                    graph.Nodes.push(newNode);
                    
                    randomNode = graph.Nodes[Math.floor(RandomFromTo(0, graph.Nodes.length - 1))];
                    if (randomNode !== newNode) {
                        newNode.Nodes.push(randomNode);
                    }
                }
    
                var amountToLink = Math.floor(RandomFromTo(0, graph.Nodes.length));
                var anotherAmountToLink = Math.floor(RandomFromTo(0, graph.Nodes.length));
                
                var lowerBound = Math.min(amountToLink, anotherAmountToLink);
                var upperBound = Math.max(amountToLink, anotherAmountToLink);
                for (var i = lowerBound; i < upperBound; i++) {
                    var nodeInQuestion = graph.Nodes[Math.floor(RandomFromTo(0, amountToLink))];
                    
                    //if (RandomFromTo(1, 5) > 3) {
                    randomNode = graph.Nodes[Math.floor(RandomFromTo(0, amountToLink))];
                    if (randomNode !== nodeInQuestion) {
                        nodeInQuestion.Nodes.push(randomNode);
                    }
                }
            })();
            
            if (hasTimedOut()) {
                return;
            }
            
            createdNodes = graph.Nodes;
            
            var nodeSeperationDistance = 100;
            var nodesPerRow = Math.floor(Math.sqrt(nodeCount));
            var nodeRadius = 30;
            var xOffset = 100;
            var yOffset = 100;
            
            //draw the circles for the nodes
            for (var i = 0; i < graph.Nodes.length; i++) {
                (function() {
                    var currentNode = graph.Nodes[i];
                    currentNode.Position = new V2(xOffset + (nodeSeperationDistance * 
                                                    (i - (Math.floor(i / nodesPerRow) * nodesPerRow))) + 
                                                    /*give it a little english!*/ (useRandomLayout ? RandomFromTo(50, 400) : 0),
                                                  yOffset + (Math.floor(i / nodesPerRow) * nodeSeperationDistance) + 
                                                  /*give it a little english!*/ (useRandomLayout ? RandomFromTo(50, 400) : 0));
                    
                    var nodePos = currentNode.Position;
                                
                    context.save();
                    context.beginPath();
                    context.arc(nodePos.X, nodePos.Y, nodeRadius, 0, 2 * Math.PI, false);
                    context.fillStyle = "#8ED6FF";
                    context.fill();
                    context.lineWidth = 2;
                    context.strokeStyle = "black";
                    context.stroke();
                    context.restore();
                    
                    context.save();
                    context.lineWidth = 1;
                    context.fillStyle = "#000000";
                    context.lineStyle = "purple";
                    context.font = "18px sans-serif";
                    context.fillText(currentNode.Name, nodePos.X, nodePos.Y);
                    context.restore();
                })();                  
            }
            
            //this cycle finding algorithm is O(terrible) time... :)
            this.Cycles = [];
            var uniqueCycles = [];
            (function() {
                //find the cycle in the nodes!
                //foreach node in the node graph, run a search trying to find a path to itself.
                graph.Nodes.forEach(function (node) {
                    //push a cycle.
                    var currentCycle = [];
                    
                    var search = function(currentNode, path) {
                        if (hasTimedOut()) {
                            return;
                        }
                        
                        var transientPath = path.slice();
                        if (currentNode === node) {
                            transientPath.push(currentNode);
                            graph.Cycles.push(transientPath);
                            return;
                        } else if (transientPath.contains(currentNode)) {
                            return;
                        } else {
                            transientPath.push(currentNode);
                        }
                        
                        currentNode.Nodes.forEach(function (child) {
                            search(child, transientPath);
                        });
                    };
                    
                    if (hasTimedOut()) {
                        return;
                    }
                    
                    node.Nodes.forEach(function (child) {
                        search(child, currentCycle);
                    });
                });
                
                //now the cycles should be filled with all the unique paths to get from every node to every other node.
                //we want to join those cycles together... this part is bad.
                
                graph.Cycles.forEach(function (c) {
                    if (hasTimedOut()) {
                        return;
                    }
                    if (!uniqueCycles.Any(function (un) { return un.contentEquals(c); })) {
                        uniqueCycles.push(c);
                    }
                });
                
                if (hasTimedOut()) {
                    return;
                }
                
                graph.Cycles = uniqueCycles;
            })();
            
            getCycles = function() {
                $("#cyclesDialog").dialog("open");
                $("#cyclesFound").html(graph.Cycles.Aggregate("", function(acc, curr) {
                        return acc + "<br/>" + curr.Skip(1).Aggregate(curr.First().Name, function (a, c) {
                            return a + " -&gt; " + c.Name;
                        });
                    }));      
            }
                                
            if (hasTimedOut()) {
                return;
            }
            
            //draw the connections for the nodes.
            graph.Nodes.forEach(function(node) {
                var nodePosition = node.Position.AsImmutable();
                    
                    if (hasTimedOut()) {
                        return;
                    }
                node.Nodes.forEach(function(connection) {
                    //only draw cycle lines.
                    var connectionPos = connection.Position.AsImmutable();
                    context.save();
                    context.beginPath();
                    context.strokeStyle = "yellow";
                    context.moveTo(nodePosition.X, nodePosition.Y);
                    context.lineTo(connectionPos.X, connectionPos.Y);
                    context.stroke();
                    context.restore();
                    
                    context.save();
                    context.beginPath();
                    
                    var toNode = connectionPos.To(nodePosition).Normalize();
                    var markerLinePosition = connectionPos.Add(toNode.Multiply(20));
                    
                    context.strokeStyle = "red";
                    context.lineWidth = 2;
                    context.moveTo(connectionPos.X, connectionPos.Y);
                    context.lineTo(markerLinePosition.X, markerLinePosition.Y);
                    context.stroke();
                    context.restore();
                    
                    if (hasTimedOut()) {
                        return;
                    }
                });
            });
            
            graph.Nodes.forEach(function(node) {
                var nodePosition = node.Position.AsImmutable();
                    
                if (hasTimedOut()) {
                    return;
                }
                node.Nodes.forEach(function(connection) {
                    //only draw cycle lines.
                    if (graph.Cycles.Any(function(c) { return c.contains(node) && c.contains(connection); })) {
                        var connectionPos = connection.Position.AsImmutable();
                        context.save();
                        context.beginPath();
                        context.lineWidth = 4;
                        context.strokeStyle = "purple";
                        context.moveTo(nodePosition.X, nodePosition.Y);
                        var midPoint = nodePosition.To(connectionPos).Divide(2);
                        midPoint = midPoint.Add(
                                        midPoint.Perpindicular()
                                                .Normalize()
                                                .Multiply(20))
                                            .Add(nodePosition);

                        context.bezierCurveTo(nodePosition.X, nodePosition.Y, midPoint.X, midPoint.Y, connectionPos.X, connectionPos.Y);
                        
                        context.stroke();
                        context.restore();
                        
                        if (hasTimedOut()) {
                            return;
                        }
                        
                        context.save();
                        context.beginPath();
                        
                        var toNode = connectionPos.To(midPoint).Normalize();
                        var markerLinePosition = connectionPos.Add(toNode.Multiply(20));
                        
                        context.strokeStyle = "red";
                        context.lineWidth = 5;
                        context.moveTo(connectionPos.X, connectionPos.Y);
                        context.lineTo(markerLinePosition.X, markerLinePosition.Y);
                        context.stroke();
                        context.restore();
                    }
                });
            });
            
            entitySystem.RemoveAllEntities();
            //entityCanvas.globalAlpha = 0.0;
            
            addCycleEntities = function() {
                graph.Cycles.forEach(function(cyc) {
                        var ent = entitySystem.CreateEntity();
                        var firstNode = cyc.First();
                            
                        ent.AddComponent('FollowCycle', {
                            Cycle: cyc });
                        ent.AddComponent('MovementUpdater', {
                            Speed: 500,
                            Position: firstNode.Position.AsImmutable(),
                            Heading: new ImmutableV2(),
                            Rotation: 0});
                        ent.AddComponent('ImageCanvasRenderer', {
                            ContextToRenderOn: entityCanvas,
                            ImageToRender: image});
//                        ent.AddComponent('DrawCircle', {
//                                Radius : 10,
//                                FillColor : "black", 
//                                BorderColor : "yellow", 
//                                BorderThickness : 2,
//                                RenderContext : entityCanvas });
                });
            };
            
            entitySystem.StartUpdating();
        };
        
        Graph(currentNodeCount);
        
        generateNewCycleAssuredGraph = function() {
            var graph = new Graph(currentNodeCount);
            if (graph.Nodes.length < 3) {
                return;
            }
            while (!(typeof graph.Cycles !== 'undefined' && graph.Cycles.Any())) {
                graph = new Graph(currentNodeCount);
            }            
        };
    };
    image.src = "arrow.png";
});