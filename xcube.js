/**
 * Created by godsong on 14-7-6.
 */

///////////基础库////////////////
var _Slice = Array.prototype.slice;
var typeOf = function () {
    var class2type = {}, toString = Object.prototype.toString, split = 'Boolean Number String Function Array Date RegExp Object Error'.split(' ');
    for (var i = 0; i < split.length; i++) {
        class2type[ "[object " + split[i] + "]" ] = split[i].toLowerCase();
    }
    return function (obj) {
        if (obj == null) {
            return obj + "";
        }
        return typeof obj === "object" || typeof obj === "function" ? class2type[ toString.call(obj) ] || "object" :
            typeof obj;
    }
}();
var _expendo = (~~(Math.random() * (1 << 24))).toString(16);
function _clone(src, deep) {
    if (typeOf(src) === 'object') {
        var dest = {};
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                var val = src[key];
                if (typeOf(val) === 'object' && deep) {
                    dest[key] = _clone(val, true);
                }
                else {
                    dest[key] = val;
                }
            }
        }
        return dest;
    }
    else {
        return src;
    }

}


var Class = function () {
    function ObjectX() {
    }//基类 在此类上扩展 防止污染Object的prototype
    ObjectX.prototype = {
        $super: function (name) {
            var curClass = this.constructor, value;
            if (!this._constructor)this._constructor = curClass;
            //在非构造函数下使用的分支 用于取到被子类屏蔽的父类成员
            if (arguments.callee.caller != this._constructor) {
                name = name || "";
                if (name.length > 0) {
                    while (true) {
                        this._constructor = this._constructor.$parent;
                        if (this._constructor === ObjectX || this._constructor == null) break;
                        value = this._constructor.prototype[name];
                        if (value !== undefined)break;
                    }
                    if (typeof value == 'function') value = value.apply(this, [].slice.call(arguments, 1));
                    delete this._constructor;
                    return value;
                }
                else {
                    delete this._constructor;
                    return curClass.$parent.prototype;
                }
            }
            //在构造函数下使用的分支
            else {
                //获得父类构造器
                var superConstructor = this._constructor.$parent;
                //_constructor指针移到父类 保存当前的调用状态 使得父类构造函数中的super能正确获得其父类构造函数
                this._constructor = superConstructor;
                //执行父类构造函数（其中若父类构造函数依旧有super则构成了一个隐式的递归）
                if (superConstructor)superConstructor.apply(this, arguments);
                //删除这个_constructor指针，不留痕迹。
                delete this._constructor;
            }
        }
    };
    function _addAnAspect(target, pos, aspect) {// AOP实现
        targetFn = this.prototype[target];
        if (!targetFn || typeof targetFn != 'function') {
            throw new Error('target of addAspect must be a function!["' + target + '"]');
        }

        var host = this;
        var targetFn = this.prototype[target];
        if (pos == 'before') {
            this.prototype[target] = function () {
                var advice = {
                    host: this,
                    methodName: target,
                    pos: pos
                };
                aspect.apply(advice, Array.prototype.slice.call(arguments));
                return targetFn.apply(advice, Array.prototype.slice.call(arguments))
            };
        }
        else if (pos == 'after') {
            this.prototype[target] = function () {
                var advice = {
                    host: this,
                    methodName: target,
                    pos: pos
                };
                var args = Array.prototype.slice.call(arguments);
                var ret = targetFn.apply(this, args);
                advice.ret = ret;
                var aRet = aspect.call(advice, args);
                if (aRet === undefined) {
                    return ret;
                }
                else {
                    return aRet;
                }

            };
        }
        else if (pos == 'around') {
            this.prototype[target] = function () {
                var args = Array.prototype.slice.call(arguments);
                aspect.apply({
                    host: this,
                    methodName: target,
                    pos: 'before'
                }, args);
                var ret = targetFn.apply(this, args);
                var aRet = aspect.call({
                    host: this,
                    methodName: target,
                    pos: 'after',
                    ret: ret
                }, args);
                if (aRet === undefined) {
                    return ret;
                }
                else {
                    return aRet;
                }

            };
        }
        else {
            return;
        }

        /*this.prototype[target].toString=function(){
         return targetFn.toString();
         }*/
    }

    function addAspect(aspect) {
        for (var key in aspect) {
            if (aspect.hasOwnProperty(key)) {
                var tok = key.split('@');
                if (tok.length == 1) {
                    var pos = 'after';
                    target = tok[0];
                }
                else {
                    pos = tok[0];
                    target = tok[1];
                }
                if (target.charAt(0) == '+') {
                    this.prototype[target.slice(1)] = aspect[key];
                }
                else {
                    if (target == '*') {
                        for (var k in this.prototype) {
                            if (this.prototype.hasOwnProperty(k) && typeof this.prototype[k] == 'function' && !(k in ObjectX.prototype)) {
                                _addAnAspect.call(this, k, pos, aspect[key]);
                            }
                        }
                    }
                    else {
                        _addAnAspect(target, pos, aspect[key]);
                    }
                }
            }
        }
        return this;
    }

    var _hasOwnProperty = Object.prototype.hasOwnProperty,
        _slice = Array.prototype.slice,
        r_super = /this\.$super\(/;

    function Class(main) { //类实现
        if (typeof main == 'function') {//如果Class的参数是一个函数 那么这个函数作为静态模块处理 其实就是当做一个自执行匿名函数处理
            var exports = {};
            var ret = main(exports);
            if (ret) {
                return ret
            }
            else {
                return exports;
            }
        }
        var parent = main.$extend || ObjectX;
        var construct = main.$init;
        delete main.$init;
        delete main.$extend;

        function Parent() {
        }

        Parent.prototype = parent.prototype;
        var hasSuper = construct && r_super.test(construct.toString());
        var newClass = function Class() {
            if (!hasSuper) {
                parent.call(this);
            }
            construct && construct.apply(this, _slice.call(arguments));
        };
        newClass.toString = function () {
            return construct ? construct.toString() : 'function(){}';
        };
        newClass.prototype = new Parent();
        newClass.prototype.constructor = newClass;
        if (!newClass.prototype.$super) {
            newClass.prototype.$super = ObjectX.prototype.$super;
        }
        //newClass.prototype.constructor = newClass;
        newClass.$parent = parent;
        newClass.addAspect = addAspect;
        for (var key in main) {
            if (_hasOwnProperty.call(main, key)) {
                var member = main[key];
                if (typeof member == 'function') {

                    if (key.charAt(0) == '@') {
                        newClass[key.slice(1)] = member;
                    }
                    else {
                        newClass.prototype[key] = member;
                    }
                }
                else {
                    newClass[key] = member;
                }
            }

        }
        return newClass;
    }

    return Class;
}();


var xCube = {};
var _controllerMap = {};

var Filters = function () {
    var _filters = {}, exports = {};
    exports.doFilter = function (name, value, exp) {
        var filter = _filters[name];
        if (filter) {
            return filter(value);
        }
        else {
            throw new Error('undefined filter:"' + name + '" @"' + exp + '"');
        }
    };
    exports.addFilter = function (name, filter) {
        _filters[name] = filter;
    };
    return exports;

}();
Filters.addFilter('html', function (v) {
    return v;
});
Filters.addFilter('caps', function (v) {
    return v;
});
Filters.addFilter('json', function (v) {
    if (typeof v == 'object') {
        return JSON.stringify(v.toJSON ? v.toJSON() : v);
    }
    else {
        return v;
    }

});

var r_vars = /[[_a-zA-Z$][_a-zA-Z.0-9$]*(?![_a-zA-Z.0-9$]*\()/g,//将表达式里面的变量取出来
    r_exp = /{{([^}]*)}}/g,//判断表达式
    r_attr = /^xc-?|^data-xc/,//判断xcube支持的指令
    r_encludeAttr = /^(constructor|toJSON|hasOwnProperty|\$super|_[^_]+_)$/,//过滤内置属性 用于hasOwnProperty
    r_isArray = /@#$/,
    r_isObject = /@\$$/;//判断变量是否是一个数组


var directiveManager = Class(function (exports) {
    var _directives = {};
    exports.register = function (name, handler) {
        _directives[name] = handler;
    };
    exports.getHandler = function (name) {
        return _directives[name];
    };
    exports.resolve = function (curContext, name, value, element, index) {
        var names = name.split('-');
        var handler = _directives[names[0]],
            ctx = {curContext: curContext, args: names.slice(1), nodeIndex: index};
        if (typeof handler == 'function') {
            if (handler.call(ctx, value, element) === false) {
                ctx.interrupt = true;
            }

        }
        return ctx;
    };
});


var TextEvaluator = Class({
    $init: function (node, path) {
        this.node = node;
        this.path = path ? path + '.' : path;
    },
    compile: function (text) {
        var match, lastIdx = 0, code = '', varMap = {}, hasExp = false;
        r_exp.lastIndex = 0;
        this.exp = text;
        while (match = r_exp.exec(text)) {
            var exp = match[1];
            hasExp = true;
            if (lastIdx > 0) {
                code += '+';
            }
            code += ('"' + text.substring(lastIdx, match.index) + '"').replace(/\n/g, '\\n');
            lastIdx = r_exp.lastIndex;
            var filters = exp.split('|');
            var expWrapL = '', expWrapR = '';
            for (var i = filters.length - 1; i > 0; i--) {
                var f = filters[i];
                expWrapL += '$$filter.doFilter("' + f + '",';
                expWrapR += ',exp)'
            }
            code += '+' + expWrapL + filters[0] + expWrapR;
            var vars = filters[0].match(r_vars);
            for (i = 0; i < vars.length; i++) {
                varMap[vars[i]] = true;
            }
        }
        if (hasExp) {

            if (lastIdx < text.length) {
                code += ('+"' + text.slice(lastIdx) + '"').replace(/\n/g, '\\n');
            }

            var argsStr = '';
            this.argsMap = [];
            for (var k in varMap) {
                if (varMap.hasOwnProperty(k)) {
                    var param = k.split('.')[0];
                    if (argsStr.indexOf(param) == -1) {
                        argsStr += param + ',';
                        this.argsMap.push(param);
                    }
                }
            }
            this.evalFunc = new Function(argsStr + '$$filter,exp', 'return ' + code);
            return varMap;

        }
        else return false;
    },
    evaluate: function (ctx) {
        var args = [];
        for (var i = 0; i < this.argsMap.length; i++) {

            args.push(ctx.getVal(this.argsMap[i].split('.')[0]));
        }
        args.push(Filters, this.exp);
        return  this.evalFunc.apply(null, args);
    }

});

function after(newChild, next, parent) {
    if (next) {
        parent.insertBefore(newChild, next);
    }
    else {
        parent.appendChild(newChild);
    }
}
function _remove(dom) {
    if (dom.parentNode) {
        dom.parentNode.removeChild(dom);
    }
}
var DomPosition = Class({
    $init: function (el, placeholderId) {
        var parent = el.parentNode;
        var placeholder = document.createComment(placeholderId || 'placeholder');
        parent.insertBefore(placeholder, el);
        parent.removeChild(el);
        this.placeholder = placeholder;

    },
    insert: function (el, nodeMap) {
        var nodeId = this.placeholder.nodeValue;
        if (isFinite(nodeId)) {
            next = nodeMap[nodeId];
        }
        else {
            next = this.placeholder;
        }
        var parent = next.parentNode;
        parent.insertBefore(el, next);
        //parent.removeChild(next);
        return el;
    }
});

var Debugger = Class(function (exports) {
    var _breakpoint = {};
    exports.breakpoint = function (id) {
        if (_breakpoint[id]) {
            debugger;
            _breakpoint[id] = false;
        }
    };
    exports.enable = function (id) {
        _breakpoint[id] = true;
    };
    exports.disable = function (id) {
        _breakpoint[id] = false;
    };
    exports.a = _breakpoint;
});
directiveManager.register('debug', function (value, el) {
    Debugger.enable(this.args[0] || 0);
});
directiveManager.register('controller', function (value, el) {
    if (_controllerMap[value]) {
        this.curContext = _controllerMap[value];
    }
    else {
        var newScope = new ScopeContext(value, this.curContext, el, ScopeType.Controller);
        _controllerMap[value] = this.curContext = newScope;
    }

});
function valueSetter(node, value) {
    node.nodeValue = value;
}
var ScopeType = {
    'Controller': 1,
    'Collection': 2
};
directiveManager.register('repeat', function (value, el, index) {
    var tk = value.split(' in ');
    var name = tk[1];
    var params = tk[0].split(':');
    var prefix = params[params.length - 1];
    var key = params.length > 1 ? params[0] : '';



    if (this.curContext.type == ScopeType.Collection) {//如果是子数组x

        name = name.replace(new RegExp('^(' + this.curContext.prefix + '|$this)(.|$)'), '')||'@';
        var sc = new ScopeContext(this.curContext.path + '.' + name, this.curContext, el, ScopeType.Collection);
        sc.prefix = prefix;
        sc.key = key;
        var childMap = this.curContext.arrayModel._childMap_;

        sc.positon = new DomPosition(el, _uNodeId++);
        if (!childMap[name]) {
            sc.arrayModel = new ArrayModel(this.curContext.path + '.#.' + name);
            generateArrayTree(this.curContext, [name], true);
            childMap[name] = sc.arrayModel;
        }
        else {
            sc.arrayModel = childMap[name];
        }
    }
    else {//如果是顶层数组
        sc = new ScopeContext(this.curContext.path + '.' + name, this.curContext, el, ScopeType.Collection);
        sc.prefix = prefix;
        sc.key = key;
        sc.positon = new DomPosition(el);
        generateViewModel(this.curContext, [name + '@#']);
        sc.arrayModel = _objectGet(_viewModels[this.curContext.path], name);
    }


    var varMap = this.curContext.varMap;
    (varMap[name] || (varMap[name] = [])).push(new CollectionEvaluator(sc));

    this.curContext = sc;

});

var ScopeContext = Class({

    $init: function (path, parent, el, type) {

        this.path = path;
        this.parent = parent;
        if (parent) {
            this.name = this.path.replace(this.parent.path + '.', '');
        }
        this.node = el;
        this.varMap = {};
        this.type = type || ScopeType.Controller;

        if (this.type == ScopeType.Collection) {

            this.nodeMap = [];
            this.env = {};
        }
        (ScopeContext.map[path] || (ScopeContext.map[path] = [])).push(this);
    },
    getVal: function (name) {
        if (this.env && this.env.hasOwnProperty(name)) {
            return this.env[name];
        }
        if (this.type == ScopeType.Collection) {
            var base = this.parent.getVal(this.name);
            if (name == this.prefix) {
                if (base[this.env.$key].hasOwnProperty('@')) {
                    return base[this.env.$key]['@'];
                }
                else {
                    return base[this.env.$key];

                }

            }
            else {
                return base[this.env.$key][name];
            }


        }
        else {
            return _objectGet(_viewModels[this.name], name);
        }

    },
    removeNode:function(index,length){
        if(this.type==ScopeType.Collection) {
            length = length || this.nodeMap.length;
            for (var i = index; i < length; i++) {
                var node = this.nodeMap[i].root;
                node.parentNode.removeChild(node);
            }
            this.nodeMap.splice(index, length - index);
        }
    },
    'map': {},
    '@find': function (path) {
        console.log('find path===========',path);
        var resolvedPath=path.replace(/\.\{[^}]+\}\./g, '.').replace(/\.(\d+|@)$/, '').replace(/\.{\d+}$/,'.@');
        var scList=ScopeContext.map[resolvedPath];
        console.log(resolvedPath,scList);
        return scList;
    },
    '@applyEnv': function (scList, env) {
        for (var i = 0; scList && i < scList.length; i++) {
            scList[i].env = {
                $index: env.$index,
                $first: env.$first,
                $last: env.$last,
                $key:env.$key
            };
            scList[i].env[scList[i].key] = env.$key;
        }
    },
    '@cloneEnv':function(scList){
        var env=_clone(scList[0].env);
        env.$key=env[scList[0].key];
        return env;

    }
});

var _uNodeId = 0;
function _findVarName(curContext, varName, evaluator) {
    var scope = curContext.varMap[varName];
    if (scope) {
        scope.push(evaluator);
    }
    else if (curContext.parent) {
        _findVarName(curContext.parent, varName)
    }
}
var _attrNameNodeId = 'xc-field-id-' + _expendo;

var ObjectModel = Class({
    $init: function (properties, path, data, arrayScopes) {
        this._model_ = {};
        this._path_ = path;
        this.addProperties(properties, arrayScopes);
        if (typeof data == 'object') {
            for (var k in data) {
                if (data.hasOwnProperty(k) && this._model_[k] !== null) {//this[k]==null表示该属性需要延迟赋初值.
                    this[k] = data[k];
                }
            }
        }
        if (this.hasOwnProperty('@')) {
            this['@'] = data;
        }
    },
    addProperties: function (properties, arrayScopes) {
        if (typeof properties == 'string') {
            var props = properties.split(',');

            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                var type = 0;//属性类型 0基本类型 1数组 2 对象
                if (r_isArray.test(prop)) {//检测属性是否是一个数组
                    prop = prop.slice(0, -2);
                    type = 1;
                }
                else if (r_isObject.test(prop)) {//检测属性是一个对象
                    prop = prop.slice(0, -2);
                    type = 2;
                }
                if (this.hasOwnProperty(prop)) {
                    continue;
                }
                this._model_[prop] = undefined;
                Object.defineProperty(this, prop, {
                    enumerable: true,
                    get: function (name) {
                        return function () {
                            return this._model_[name];
                        }
                    }(prop),
                    set: function (name) {
                        return function (val) {
                            _propertySetter.call(this, name, val);
                        }
                    }(prop)
                });
                if (type == 1) {
                    if (arrayScopes && arrayScopes[prop]) {
                        this[prop] = arrayScopes[prop].clone(this._path_ + '.' + prop);
                    }
                    else {
                        this[prop] = new ArrayModel(this._path_ + '.' + prop);
                    }
                }
                else if (type == 2) {//如果该属性是一个对象赋予null初始值 并且阻止后续的赋初值
                    this._model_[prop] = null;
                }
            }

        }
        else {

        }
    },
    toJSON: function (includeNewer) {//讲viewmodel转换成简单的JSON数据 includeNewer为true代表临时给viewmodel加上的属性值也加入转换
        var obj = _clone(this._model_);
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                if (obj[k] instanceof ObjectModel) {
                    obj[k] = obj[k].toJSON(includeNewer);
                }
                else if (obj[k] instanceof ArrayModel) {
                    obj[k] = obj[k].toJSON(includeNewer);
                }
            }

        }
        if (includeNewer) {
            for (k in this) {
                if (this.hasOwnProperty(k) && !this._model_.hasOwnProperty(k)) {
                    obj[k] = this[k];
                }
            }
        }
        return obj;
    },
    hasOwnProperty: function (key) {
        return Object.prototype.hasOwnProperty.call(this, key) && !r_encludeAttr.test(key);
    }
});
var ArrayModel = Class({
    $init: function (path) {
        this._childMap_ = {};
        this._model_ = {length: 0};
        this._path_ = path;
        this.length = 0;
    },
    clone: function (path) {
        var newly = new ArrayModel(path || this._path_);
        newly._tree_ = this._tree_;
        newly._childMap_ = this._childMap_;
        return newly;
    },
    apply: function (index, data) {
        if (this._model_.hasOwnProperty(index)) {
            this[index] = data;
        }
        else {
            //Notification.notifySubscriber.call(this, 'setter:apply', this._path_ + '.' + index);
            Object.defineProperty(this, index, {
                enumerable: true,
                configurable:true,
                set: function (val) {
                    _propertySetter.call(this, index, val,true);
                    if (isFinite(index)) {
                        if(index + 1>this.length) {
                            this.length = index + 1;
                            this._model_.length = this.length;
                        }
                    }
                    else {
                        delete this._model_.length;
                    }
                },
                get: function () {
                    return this._model_[index];
                }
            });

            for (var i = 0; i < this._tree_.length; i++) {
                for (var parent in this._tree_[i]) {
                    if (this._tree_[i].hasOwnProperty(parent)) {
                        var name = this._tree_[i][parent];
                        if (parent == '') {
                            if (name=='@@#') {
                                this[index]= this._childMap_['@'].clone(this._path_+'.{'+index+'}');
                                this[index]= data;
                            }
                            else {
                                this[index] = new ObjectModel(name, this._path_ + '.{' + index+'}', data, this._childMap_);
                            }
                        }
                        else {
                            //if(this[index], parent)
                            _objectSet(this[index], parent, new ObjectModel(name, this._path_ + '.{' + index + '}.' + parent, data[parent], this._childMap_));
                        }
                    }
                }

            }


        }
    },

    toJSON: function (includeNewer) {
        if (this._model_.length !== undefined) {
            var obj = _Slice.call(this._model_);
        }
        else {
            obj = this._model_;
        }
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                if (obj[k].hasOwnProperty('@')) {
                    obj[k] = obj[k]['@'];
                    continue;
                }
                if (obj[k] instanceof ObjectModel) {
                    obj[k] = obj[k].toJSON(includeNewer);
                }
                else if (obj[k] instanceof ArrayModel) {
                    obj[k] = obj[k].toJSON(includeNewer);
                }
            }

        }
        if (includeNewer) {
            for (k in this) {
                if (this.hasOwnProperty(k) && !this._model_.hasOwnProperty(k)) {
                    obj[k] = this[k];
                }
            }
        }
        return obj;
    },
    hasOwnProperty: function (key) {
        return Object.prototype.hasOwnProperty.call(this, key) && !r_encludeAttr.test(key)&&key!='length';
    }
});
function buildVarMap(curContext, evaluator, index) {//当前Node属于第几个儿子
    var varList = [];//用于生成viewmodel的属性名列表
    evaluator.curContext = curContext;
    if (curContext.type == ScopeType.Collection) {
        if (evaluator.node.nodeType == Node.TEXT_NODE) {
            var id = evaluator.node.parentNode.getAttribute(_attrNameNodeId);
            if (id === null) {
                id = _uNodeId++;
                evaluator.node.parentNode.setAttribute(_attrNameNodeId, id);
            }
            evaluator.nodeId = id + ':' + index;
        }
        else {
            id = evaluator.node.getAttribute(_attrNameNodeId);
            if (id === null) {
                evaluator.node.parentNode.setAttribute(_attrNameNodeId, _uNodeId);
                id = _uNodeId++;
            }
            evaluator.nodeId = id;
        }
    }
    if (evaluator.varMap) {
        for (var varName in evaluator.varMap) {//生成变量关联表
            if (evaluator.varMap.hasOwnProperty(varName)) {
                if (curContext.type == ScopeType.Collection) {
                    var rPrefix = new RegExp('^(' + curContext.prefix + '|$this)(.|$)');
                    if (rPrefix.test(varName)) {
                        varName = varName.replace(rPrefix, '') || '@';

                    }
                    else {

                        _findVarName(curContext, varName, evaluator);
                        continue;

                    }
                }
                var scope = curContext.varMap[varName];
                if (scope) {
                    scope.push(evaluator);
                }
                else {
                    curContext.varMap[varName] = [evaluator];
                    varList.push(varName);

                }
            }


        }
        if (curContext.type == ScopeType.Collection) {
            generateArrayTree(curContext, varList);
        }
        else {
            generateViewModel(curContext, varList);
        }//构建viewModel
    }
}
function scanNode(curNode, curContext, index) {
    if (curNode.nodeType == Node.ELEMENT_NODE) {
        for (var i = 0, l = curNode.attributes.length; i < l; i++) {
            var attr = curNode.attributes[i];
            if (r_attr.test(attr.name)) {
                var dname = attr.name.replace(r_attr, '');
                var ret = directiveManager.resolve(curContext, dname, attr.value, curNode, index);
                curContext = ret.curContext;
                if (ret.interrupt) {
                    break;
                }
            }
        }
    }
    else if (curNode.nodeType == Node.TEXT_NODE) {
        if (r_exp.test(curNode.nodeValue)) {
            buildVarMap(curContext, new FieldEvaluator(curNode, curNode.nodeValue, valueSetter), index);//为这个DOM创建一个新的FieldContext
            //curNode.nodeValue = '';//立即把内容置空
        }
    }
    for (i = 0; i < curNode.childNodes.length; i++) {
        scanNode(curNode.childNodes[i], curContext, i);
    }
    /*if (curContext.type == ScopeType.Collection && curContext.parent.type == ScopeType.Controller) {
     _objectSet(_viewModels[curContext.parent.path], curContext.name, curContext.arrayModel);
     }*/

}
function _buildClone(curNode, result) {
    if (curNode.nodeType == Node.ELEMENT_NODE) {
        var id = curNode.getAttribute(_attrNameNodeId);
        if (id !== null) {
            result[id] = curNode;
        }

    }
    else if (curNode.nodeType == Node.COMMENT_NODE) {
        id = curNode.nodeValue;
        if (id && isFinite(id)) {
            result[id] = curNode;
        }
    }
    for (var i = 0, l = curNode.childNodes.length; i < l; i++) {
        _buildClone(curNode.childNodes[i], result);
    }
}
function generateArrayTree(ctx, varList, isArray) {//生成数组的变量层级树

    if (varList.length > 0) {
        var tree = ctx.arrayModel._tree_ || [];//将变量列表 分层

        for (var i = 0; i < varList.length; i++) {
            var k = varList[i];
            var tok = k.split('.');
            for (var j = 0; j < tok.length; j++) {

                if (!tree[j]) {
                    tree[j] = {};
                }
                var suffix = '';
                if (isArray) {
                    suffix = '@#';
                }
                else if (j < tok.length - 1) {
                    suffix = '@$';
                }
                var parent = tok.slice(0, j).join('.');
                if (!tree[j][parent]) {
                    tree[j][parent] = tok[j] + suffix;
                }
                else if (tree[j][parent].indexOf(tok[j]) == -1) {
                    tree[j][parent] += ',' + tok[j] + suffix;
                }

            }
        }
        ctx.arrayModel._tree_ = tree;
    }
}
var Notification = function () {
    var _subscriber = {};
    var msgId = 0;//消息Id 用于事件跟踪 一般调试的时候用
    return {
        notifySubscriber: function (type) {
            var types = type.split(':');//消息分级 可针对每一级进行订阅 如setter:array
            var args = _Slice.call(arguments, 1);
            var ctx = {msgId: msgId++, type: type};
            for (var j = 0; j < types.length; j++) {
                var subs = _subscriber[types.slice(0, j + 1).join(':')], ret = true;

                for (var i = 0; subs && i < subs.length; i++) {
                    if (subs[i].apply(ctx, args) == false) {
                        ret = false;
                    }
                }
            }
            return ret;
        },
        registerSubscriber: function (type, handler) {
            (_subscriber[type] || (_subscriber[type] = [])).push(handler);
        }
    };
}();

function _objectSet(root, path, value) {
    var paths = path.split('.');
    var cur = root;
    for (var i = 0; i < paths.length - 1; i++) {
        cur = cur[paths[i]];
    }
    //value.$parent=cur;
    cur[paths[paths.length - 1]] = value;
}
function _objectGet(root, path) {
    var paths = path.split('.');
    var cur = root;
    for (var i = 0; i < paths.length; i++) {
        if (cur == undefined) {
            return cur;
        }
        cur = cur[paths[i]];
    }
    return cur;
}
var _viewModels = {};
function generateViewModel(ctx, varList) {
    if (varList.length > 0) {
        var path = ctx.path;
        var root = _viewModels;

        var tree = [];//将变量列表 分层

        for (var i = 0; i < varList.length; i++) {
            var k = varList[i];
            var tok = k.split('.');
            for (var j = 0; j < tok.length; j++) {

                if (!tree[j]) {
                    tree[j] = {};
                }
                var parent = tok.slice(0, j).join('.');
                if (!tree[j][parent]) {
                    tree[j][parent] = tok[j];
                }
                else if (tree[j][parent].indexOf(tok[j]) == -1) {
                    tree[j][parent] += ',' + tok[j];
                }

            }
        }
        for (i = 0; i < tree.length; i++) {
            for (k in tree[i]) {
                if (tree[i].hasOwnProperty(k)) {
                    if (k == '') {
                        if (root[path]) {
                            root[path].addProperties(tree[i][k]);
                        }
                        else {
                            root[path] = new ObjectModel(tree[i][k], path);
                        }

                    }
                    else {
                        if (root[path][k]) {

                            root[path][k].addProperties(tree[i][k]);
                        }
                        else {
                            _objectSet(root[path], k, new ObjectModel(tree[i][k], path + '.' + k));
                        }
                    }
                }
            }

        }
        return tree;
    }
}

function _applyObject(target, data, path) {
    if (typeOf(data) == 'object') {
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                target[k] = data[k];
            }
        }
    }
    else if(target.hasOwnProperty('@')){
        target['@']=data;
    }
    else{
        console.debug('尝试将object类型的[' + path + ']置为' + data + '。这种赋值操作毫无意义，会使得视图更新失败');
    }
}

function _applyArray(target, data, path) {
    var oldLength=target.length;
    var scList=ScopeContext.find(path);
    if (typeOf(data) == 'array' || (data.splice && data.jquery)) {
        for (var i = 0; i < data.length; i++) {
            _curEnv={
                $first:i == 0,
                $last:i == data.length - 1,
                $index:i,
                $key:i
            };
            console.log('saveEnv',path);
            ScopeContext.applyEnv(scList,_curEnv);
            target.apply(i, data[i]);
        }
    }
    else if (typeOf(data) == 'object') {
        var count = 0, lastKey, firstKey = null;
        for (var key in data) {
            if (firstKey === null) {
                firstKey = key;
            }
            lastKey = key;
        }
        for (key in data) {
            if (data.hasOwnProperty(key)) {
                _curEnv={
                    $first:key == firstKey,
                    $last:key == lastKey,
                    $index:count++,
                    $key:key
                };
                ScopeContext.applyEnv(scList,_curEnv);
                target.apply(key, data[key]);
            }
        }
    }
    else {
        console.debug('尝试将Array类型的[' + path + ']置为' + data + '。这种赋值操作毫无意义，会使得视图更新失败');
        return;
    }
    //处理两次
    var curLength=count||data.length||0;
    if(oldLength>curLength){
        for(i=0;i<scList.length;i++){
            scList[i].removeNode(curLength);
        }
    }
    target.length=curLength;
    if(!count){
        target._model_.length=curLength;
    }
    for(var k in target){
        if(target.hasOwnProperty(k)&&!data.hasOwnProperty(k)){
            delete target[k];
            delete target._model_[k];
        }
    }

}
function _propertySetter(name, val,isIndex) {
    if(isIndex){
        var path = this._path_ + '.{' + name+'}';
    }
    else{
        path = this._path_ + '.' + name;
    }

    messageManager.push(path);
    if (this._model_[name] instanceof ObjectModel) {
        _applyObject(this._model_[name], val, path);
    }
    else if (this._model_[name] instanceof ArrayModel) {
        _applyArray.call(this, this._model_[name], val, path);
    }
    else {
        var oldVal = this._model_[name], isChanged = oldVal !== val;
        this._model_[name] = val;

        if (!(val instanceof ObjectModel) && !(val instanceof ArrayModel) && isChanged) {
            var ret = Notification.notifySubscriber.call(this, 'setter:object', path, val, oldVal);
        }

    }
    messageManager.resolve(path);
}

Notification.registerSubscriber('setter', function (path, newVal, oldVal) {
    if (this.type == 'setter:object') {
        console.debug('[' + this.msgId + ']' + this.type, 'path:', path, 'newVal', newVal, 'oldVal', oldVal);
    }
    else {
        console.log('[' + this.msgId + ']' + this.type, 'path:', path, 'newVal', newVal, 'oldVal', oldVal);
    }

});
var CollectionEvaluator = Class({
    $init: function (context) {
        this.context = context;
    },
    evaluate: function (index, path, ctx) {
        var nodeMap = this.context.nodeMap;
        var $index=this.context.env.$index;
        if (!nodeMap[$index]) {
            nodeMap[$index] = {key:index,nodes:{}};
            var newNodes = this.context.node.cloneNode(true);
            nodeMap[$index].root=newNodes;
            _buildClone(newNodes, nodeMap[$index].nodes);
            if (this.context.parent.type == ScopeType.Collection) {
                this.context.positon.insert(newNodes, this.context.parent.nodeMap[this.context.parent.env.$index].nodes)
            }
            else {
                this.context.positon.insert(newNodes);
            }
        }
        else{
            nodeMap[$index].key=index;
        }
        var pathInfo = PathUtils.divide(path||'@');
        var evaluators = this.context.varMap[pathInfo[0]];
        for (var i = 0; evaluators && i < evaluators.length; i++) {
            if(evaluators[i] instanceof CollectionEvaluator){
                evaluators[i].evaluate(pathInfo[1], pathInfo[2], this.context);
            }
            else{
                evaluators[i].evaluate($index, pathInfo[2], this.context);
            }

        }
    }

});

var PathUtils = Class(function (exports) {
    var r_division = /(?:\.|^)(\{[^}]+\})(?:\.|$)/;
    exports.divide = function (path) {
        var paths=path.split(r_division);
        return [paths[0], paths[1]&&paths[1].replace(/^{|}$/g,''), paths.slice(2).join('.').replace(/\.$/,'')];
    }
});

var FieldEvaluator = Class({
    $init: function (node, express, setter) {
        this.express = express;
        this.node = node;
        this.setter = setter;
        this.textEvaluator = new TextEvaluator(node);
        this.varMap = this.textEvaluator.compile(express);//编译TextEvaluator
    },
    evaluate: function (index) {
        if (this.nodeId) {
            var ids = this.nodeId.split(':');
            var node = this.curContext.nodeMap[index].nodes[ids[0]];
            if (ids.length > 1) {
                node = node.childNodes[ids[1]];
            }
        }
        else {
            node = this.node;
        }
        try {
            this.setter(node, this.textEvaluator.evaluate(this.curContext, node));
        } catch (e) {
            console.error(e);
        }
    }
});
var ControllerEvaluator = Class(function (exports) {
    exports.evaluate = function (ctx, path, data) {
        var pathInfo = PathUtils.divide(path);

        var evaluators = ctx.varMap[pathInfo[0]];
        for (var i = 0; i < evaluators.length; i++) {
            evaluators[i].evaluate(pathInfo[1], pathInfo[2], ctx);
        }
    }
});
/**消息管理器 用于控制属性改动消息的触发
 * 由viewModel属性变更是在viewmodel数据构建时出发的，构建的时候递归调用极其复杂
 * 比如数组嵌套的时候，只有完成子数组时才会把这个子数组实例给父数组的索引上面
 * 此时便会触发该子数组的数据改动事件 如果此时立即出发视图更新 无法从路径上直接引过来找到数据
 * 因为该子数组还未挂接在父组的索引上 路径不通（参见ScopeContext 的getVal逻辑）
 * 因此需要先收集这些消息 放入messageList队列里暂不处理。在整个viewmodel构建完成时再处理这些消息。
 * 因为整个viewmodel构建的过程呈现一个根据Path呈现一个树形结构。因此在逐级创建的时候（体现为_propertySetter的逻辑）
 * 在_propertySetter开始时将path入栈 结束时出栈 并判断如果出完栈 栈为空说明本层级及其所有子层级都构建完毕 此时可以处理本层级及其所有子层级的x消息 * * */
var messageManager = Class(function (exports) {
    var messageList = {}, messageStack = [];
    exports.push = function (id) {
        console.error('push',id);
        messageStack.push(id);
        if(id=='Ctrl.a.list')debugger;
    };
    exports.add = function (id, callback, args) {
        if (!messageList[id]) {
            messageList[id] = [];
        }
        messageList[id].push({callback: callback, args: args})
    };
    window.x=messageList;
    exports.resolve = function (id) {
        var resolved=false;
        var ret=messageStack.pop();
        if (messageStack.length == 0) {
            console.error('ok!!!!!',ret);
            var message;
            for (var k in messageList) {
                if (messageList.hasOwnProperty(k) && k.indexOf(id) == 0) {
                    while (message = messageList[k].shift()) {
                        resolved=true;
                        message.callback.apply(null, message.args);
                    }
                }
            }
            if(resolved){
                for(var i=0;i<listeners.length;i++){
                    listeners[i]();
                }
            }
        }
    };
    var listeners=[];
    exports.afterResolved=function(listener){
        listeners.push(listener);
    }
});
function _evaluate(path,env) {
    console.warn('_evaluate!!!!!!!!',path,env);
    if(env){
        var scList = ScopeContext.find(path);
        ScopeContext.applyEnv(scList,env);
    }
    if(path=='Ctrl.a.list.{0}.list2.{0}.d')debugger;
    var ctrlName = path.substr(0, path.indexOf('.'));
    path = path.slice(path.indexOf('.') + 1);
    ControllerEvaluator.evaluate(_controllerMap[ctrlName], path);
}
Notification.registerSubscriber('setter:object', function (path, newVal, oldVal) {
    var scList=ScopeContext.find(path);
    var args=[path];

    if(scList&&scList[0].type==ScopeType.Collection){
        args.push(ScopeContext.cloneEnv(scList));
    }
    messageManager.add(path, _evaluate, args);

});
console.time(1);
Controller = _controllerMap;
document.addEventListener("DOMContentLoaded", function () {
    var root = new ScopeContext('');
    scanNode(document.body, root);
    for (var k in _viewModels) {
        if (_viewModels.hasOwnProperty(k) && !window.hasOwnProperty(k)) {
            window[k] = _viewModels[k];
        }
    }
    console.timeEnd(1);

}, false);
