/**
 * Graph data structure
 *
 * @module echarts/data/Graph
 * @author Yi Shen(https://www.github.com/pissang)
 */
define(function(require) {

    'use strict';

    var util = require('zrender/core/util');
    var Model = require('../model/Model');

    /**
     * @alias module:echarts/data/Graph
     * @constructor
     * @param {boolean} directed
     */
    var Graph = function(directed) {
        /**
         * 是否是有向图
         * @type {boolean}
         * @private
         */
        this._directed = directed || false;

        /**
         * @type {Array.<module:echarts/data/Graph~Node>}
         */
        this.nodes = [];

        /**
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.edges = [];

        /**
         * @type {Object.<string, module:echarts/data/Graph~Node>}
         * @private
         */
        this._nodesMap = {};
        /**
         * @type {Object.<string, module:echarts/data/Graph~Edge>}
         * @private
         */
        this._edgesMap = {};
    };

    /**
     * @type {string}
     */
    Graph.prototype.type = 'graph';

    /**
     * 是否是有向图
     * @return {boolean}
     */
    Graph.prototype.isDirected = function () {
        return this._directed;
    };

    /**
     * 添加一个新的节点
     * @param {*} [option] 存储的数据
     */
    Graph.prototype.addNode = function (option) {
        var name = option.name;

        if (this._nodesMap[name]) {
            return this._nodesMap[name];
        }

        var node = new Graph.Node(option);

        this.nodes.push(node);

        this._nodesMap[name] = node;
        return node;
    };

    /**
     * 获取节点
     * @param  {string} name
     * @return {module:echarts/data/Graph~Node}
     */
    Graph.prototype.getNodeByName = function (name) {
        return this._nodesMap[name];
    };

    /**
     * 添加边
     * @param {string|module:echarts/data/Graph~Node} n1
     * @param {string|module:echarts/data/Graph~Node} n2
     * @param {*} option
     * @return {module:echarts/data/Graph~Edge}
     */
    Graph.prototype.addEdge = function (n1, n2, option) {
        if (typeof(n1) == 'string') {
            n1 = this._nodesMap[n1];
        }
        if (typeof(n2) == 'string') {
            n2 = this._nodesMap[n2];
        }
        if (!n1 || !n2) {
            return;
        }

        var key = n1.name + '-' + n2.name;
        if (this._edgesMap[key]) {
            return this._edgesMap[key];
        }

        var edge = new Graph.Edge(option);
        edge.node1 = n1;
        edge.node2 = n2;

        if (this._directed) {
            n1.outEdges.push(edge);
            n2.inEdges.push(edge);
        }
        n1.edges.push(edge);
        if (n1 !== n2) {
            n2.edges.push(edge);
        }

        this.edges.push(edge);
        this._edgesMap[key] = edge;

        return edge;
    };

    /**
     * 移除边
     * @param  {module:echarts/data/Graph~Edge} edge
     */
    Graph.prototype.removeEdge = function (edge) {
        var n1 = edge.node1;
        var n2 = edge.node2;
        var key = n1.name + '-' + n2.name;
        if (this._directed) {
            n1.outEdges.splice(util.indexOf(n1.outEdges, edge), 1);
            n2.inEdges.splice(util.indexOf(n2.inEdges, edge), 1);
        }
        n1.edges.splice(util.indexOf(n1.edges, edge), 1);
        if (n1 !== n2) {
            n2.edges.splice(util.indexOf(n2.edges, edge), 1);
        }

        delete this._edgesMap[key];
        this.edges.splice(util.indexOf(this.edges, edge), 1);
    };

    /**
     * 获取边
     * @param  {module:echarts/data/Graph~Node|string} n1
     * @param  {module:echarts/data/Graph~Node|string} n2
     * @return {module:echarts/data/Graph~Edge}
     */
    Graph.prototype.getEdge = function (n1, n2) {
        if (typeof(n1) !== 'string') {
            n1 = n1.name;
        }
        if (typeof(n2) !== 'string') {
            n2 = n2.name;
        }

        if (this._directed) {
            return this._edgesMap[n1 + '-' + n2];
        } else {
            return this._edgesMap[n1 + '-' + n2]
                || this._edgesMap[n2 + '-' + n1];
        }
    };

    /**
     * 移除节点（及其邻接边）
     * @param  {module:echarts/data/Graph~Node|string} node
     */
    Graph.prototype.removeNode = function (node) {
        if (typeof(node) === 'string') {
            node = this._nodesMap[node];
            if (!node) {
                return;
            }
        }

        delete this._nodesMap[node.name];
        this.nodes.splice(util.indexOf(this.nodes, node), 1);

        for (var i = 0; i < this.edges.length;) {
            var edge = this.edges[i];
            if (edge.node1 === node || edge.node2 === node) {
                this.removeEdge(edge);
            } else {
                i++;
            }
        }
    };

    /**
     * 遍历并且过滤指定的节点
     * @param  {Function} cb
     * @param  {*}   [context]
     */
     Graph.prototype.filterNode = function (cb, context) {
        var len = this.nodes.length;
        for (var i = 0; i < len;) {
            if (cb.call(context, this.nodes[i], i)) {
                i++;
            } else {
                this.removeNode(this.nodes[i]);
                len--;
            }
        }
     };

    /**
     * 遍历并且过滤指定的边
     * @param  {Function} cb
     * @param  {*}   [context]
     */
     Graph.prototype.filterEdge = function (cb, context) {
        var len = this.edges.length;
        for (var i = 0; i < len;) {
            if (cb.call(context, this.edges[i], i)) {
                i++;
            } else {
                this.removeEdge(this.edges[i]);
                len--;
            }
        }
     };

    /**
     * 线性遍历所有节点
     * @param  {Function} cb
     * @param  {*}   [context]
     */
    Graph.prototype.eachNode = function (cb, context) {
        var len = this.nodes.length;
        for (var i = 0; i < len; i++) {
            if (this.nodes[i]) {    // 可能在遍历过程中存在节点删除
                cb.call(context, this.nodes[i], i);
            }
        }
    };

    /**
     * 线性遍历所有边
     * @param  {Function} cb
     * @param  {*}   [context]
     */
    Graph.prototype.eachEdge = function (cb, context) {
        var len = this.edges.length;
        for (var i = 0; i < len; i++) {
            if (this.edges[i]) {    // 可能在遍历过程中存在边删除
                cb.call(context, this.edges[i], i);
            }
        }
    };

    /**
     * 清空图
     */
    Graph.prototype.clear = function () {
        this.nodes.length = 0;
        this.edges.length = 0;

        this._nodesMap = {};
        this._edgesMap = {};
    };

    /**
     * 广度优先遍历
     * @param {Function} cb
     * @param {module:echarts/data/Graph~Node} startNode 遍历起始节点
     * @param {string} [direction=none] none, in, out 指定遍历边
     * @param {*} [context] 回调函数调用context
     */
    Graph.prototype.breadthFirstTraverse = function (
        cb, startNode, direction, context
    ) {
        if (typeof(startNode) === 'string') {
            startNode = this._nodesMap[startNode];
        }
        if (!startNode) {
            return;
        }

        var edgeType = 'edges';
        if (direction === 'out') {
            edgeType = 'outEdges';
        } else if (direction === 'in') {
            edgeType = 'inEdges';
        }

        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].__visited = false;
        }

        if (cb.call(context, startNode, null)) {
            return;
        }

        var queue = [startNode];
        while (queue.length) {
            var currentNode = queue.shift();
            var edges = currentNode[edgeType];

            for (var i = 0; i < edges.length; i++) {
                var e = edges[i];
                var otherNode = e.node1 === currentNode
                    ? e.node2 : e.node1;
                if (!otherNode.__visited) {
                    if (cb.call(otherNode, otherNode, currentNode)) {
                        // Stop traversing
                        return;
                    }
                    queue.push(otherNode);
                    otherNode.__visited = true;
                }
            }
        }
    };

    /**
     * 复制图
     */
    Graph.prototype.clone = function () {
        var graph = new Graph(this._directed);
        for (var i = 0; i < this.nodes.length; i++) {
            graph.addNode(this.nodes[i].name, this.nodes[i].data);
        }
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            graph.addEdge(e.node1.name, e.node2.name, e.data);
        }
        return graph;
    };


    /**
     * 图节点
     * @alias module:echarts/data/Graph~Node
     */
    var Node = Model.extend({

        init: function (option) {
            /**
            * 节点名称
            * @type {string}
            */
            this.name = option.name || '';
            /**
            * 节点存储的数据
            * @type {*}
            */
            this.$option = option || null;
            /**
            * 入边，只在有向图上有效
            * @type {Array.<module:echarts/data/Graph~Edge>}
            */
            this.inEdges = [];
            /**
            * 出边，只在有向图上有效
            * @type {Array.<module:echarts/data/Graph~Edge>}
            */
            this.outEdges = [];
            /**
            * 邻接边
            * @type {Array.<module:echarts/data/Graph~Edge>}
            */
            this.edges = [];
        },

        /**
        * 度
        * @return {number}
        */
        degree: function () {
            return this.edges.length;
        },

        /**
        * 入度，只在有向图上有效
        * @return {number}
        */
        inDegree: function () {
            return this.inEdges.length;
        },

        /**
        * 出度，只在有向图上有效
        * @return {number}
        */
        outDegree: function () {
            return this.outEdges.length;
        }
    });

    /**
     * 图边
     * @alias module:echarts/data/Graph~Edge
     * @param {module:echarts/data/Graph~Node} node1
     * @param {module:echarts/data/Graph~Node} node2
     * @param {extra} data
     */
    var Edge = Model.extend({

        /**
         * 节点1，如果是有向图则为源节点
         * @type {module:echarts/data/Graph~Node}
         */
        node1: null,

        /**
         * 节点2，如果是有向图则为目标节点
         * @type {module:echarts/data/Graph~Node}
         */
        node2: null,

        init: function (option) {
            this.$option = option;
        }
    });

    Graph.Node = Node;
    Graph.Edge = Edge;

    /**
     * 从邻接矩阵生成
     * ```
     *        TARGET
     *    -1--2--3--4--5-
     *  1| x  x  x  x  x
     *  2| x  x  x  x  x
     *  3| x  x  x  x  x  SOURCE
     *  4| x  x  x  x  x
     *  5| x  x  x  x  x
     * ```
     * 节点的行列总和会被写到`node.$option.value`
     * 对于有向图会计算每一行的和写到`node.$option.outValue`,
     * 计算每一列的和写到`node.$option.inValue`。
     * 边的权重会被然后写到`edge.$option.weight`。
     *
     * @method module:echarts/data/Graph.fromMatrix
     * @param {Array.<Object>} nodesData 节点信息，必须有`name`属性, 会保存到`node.data`中
     * @param {Array} matrix 邻接矩阵
     * @param {boolean} directed 是否是有向图
     * @return {module:echarts/data/Graph}
     */
    Graph.fromMatrix = function(nodesData, matrix, directed) {
        if (
            !matrix || !matrix.length
            || (matrix[0].length !== matrix.length)
            || (nodesData.length !== matrix.length)
        ) {
            // Not a valname data
            return;
        }

        var size = matrix.length;
        var graph = new Graph(directed);

        for (var i = 0; i < size; i++) {
            var node = graph.addNode(nodesData[i].name, nodesData[i]);
            // TODO
            // node.data已经有value的情况
            node.$option.value = 0;
            if (directed) {
                node.$option.outValue = node.$option.inValue = 0;
            }
        }
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var item = matrix[i][j];
                if (directed) {
                    graph.nodes[i].$option.outValue += item;
                    graph.nodes[j].$option.inValue += item;
                }
                graph.nodes[i].$option.value += item;
                graph.nodes[j].$option.value += item;
            }
        }

        for (var i = 0; i < size; i++) {
            for (var j = i; j < size; j++) {
                var item = matrix[i][j];
                if (item === 0) {
                    continue;
                }
                var n1 = graph.nodes[i];
                var n2 = graph.nodes[j];
                var edge = graph.addEdge(n1, n2, {});
                edge.$option.weight = item;
                if (i !== j) {
                    if (directed && matrix[j][i]) {
                        var inEdge = graph.addEdge(n2, n1, {});
                        inEdge.$option.weight = matrix[j][i];
                    }
                }
            }
        }

        return graph;
    };

    return Graph;
});