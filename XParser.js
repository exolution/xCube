/**
 * XParser Node端 MVVM（目前针对avalon.js）模板渲染引擎
 * 解析指令 ms-href ms-src ms-repeat ms-controller ms-class ms-html ms-text
 * 未完成指令 ms-if ms-visible
 * 不支持过滤器 ms-attr （ms-attr-href形式需要转换成ms-href）
 * @author gaosong
 * @version 0.5
 * #TODO 性能需优化 准确性验证 内存泄露检查
 */

var _expando = Math.random().toString().slice(-8), _uuid = 0;
function boolObject(str) {
    var obj = {};
    var splits = str.split(',');
    for (var i = 0; i < splits.length; i++) {
        obj[splits[i]] = true;
    }
    return obj;
}
var _selfClosedTag = boolObject('area,base,basefont,br,col,command,embed,hr,img,input,link,meta,param,source,track,wbr');
var re_trim = /^\s*|\s*$/g;//trim正则
var re_gt = />/g, re_lt = /</g;
function trim(str) {
    return str.replace(re_trim, '');
}
if (typeof window == 'undefined') {
    window = global;
}
window.xx = [];

var EvaluatorManager = function () {
    var _evaluatorList = {}, exports = {};
    exports.register = function (name, resolver) {
        _evaluatorList[name] = resolver;
    };
    exports.resolve = function (name, evaluator, result, ctx) {
        return _evaluatorList[name] && _evaluatorList[name](evaluator, result, ctx);
    };
    return exports;
}();
function Node(name, body) {
    this.tagName = name.toLowerCase();
    this.childNodes = [];
    this.body = body;
    this.evaluators = [];
    resolveAvalonDirective(this, body);
    this.attributes = [];
}
function TextNode(text) {
    this.textContent = text;

}
TextNode.prototype.toString = function () {
    return this.textContent;

};
TextNode.prototype.compile = function () {
    var splits = this.textContent.split(/{{|}}/);
    if (splits.length > 1) {
        var expr = '', code = '';
        for (var i = 0; i < splits.length; i++) {
            if (i % 2 == 1) {
                code += resolveExpr(splits[i]);
                expr += '"+(' + splits[i] + ')+"';
            }
            else expr += splits[i].replace(/\n/g, '\\n');
        }
        expr = '"' + expr + '"';
        this.evaluator = {
            expr: expr,
            evaluate: new Function('ctx', code + 'return ' + expr + ';')
        }

    }
};

function Context(parent, ctrlName, id) {
    this.parent = parent || null;
    this.ctrlName = ctrlName || (parent && parent.ctrlName);
    this.scope = {};
    this.id = id;
    if (this.parent) {
        this.scope.$outer = this.parent.scope;
    }
}
Context.model = {};
Context.prototype.getVal = function (name) {
    var root = this.scope[name] === undefined ? Context.model[this.ctrlName][name] : this.scope[name];
    if (root === undefined && this.parent) {
        return this.parent.getVal(name);
    }
    return root;

};
function render(node, ctx, isRepeat) {
    if (node.textContent !== undefined) {
        if (isRepeat) {
            //debugger;
        }
        if (node.evaluator) {
            return EvaluatorManager.resolve('html', node.evaluator, null, ctx);
        }
        return node.textContent;
    }
    else {
        var isSelfClosedTag = _selfClosedTag[node.tagName];
        if (node.controller) {
            ctx = new Context(ctx, node.controller.expr);
            delete node.controller;
        }
        if (node.repeat && (node.repeat.contextId === undefined || ctx.id != node.repeat.contextId)) {
            var html = '';
            var array;
            ctx = new Context(ctx, null, _uuid);
            node.repeat.contextId = _uuid;
            _uuid++;
            try {
                array = node.repeat.evaluate(ctx);
            } catch (e) {
            }
            if (array) {
                var proxy = node.repeat.args;
                if (proxy) {
                    proxy = proxy.slice(1);
                    for (var idx = 0; idx < array.length; idx++) {
                        ctx.scope.$index = idx;
                        ctx.scope.$first = idx == 0;
                        ctx.scope.$last = idx == array.length - 1;
                        ctx.scope[proxy] = array[idx];
                        html += render(node, ctx, true);
                    }
                }
                else {
                    for (var k in array) {
                        if (array.hasOwnProperty(k)) {
                            ctx.scope.$key = k;
                            ctx.scope.$val = array[k];
                            html += render(node, ctx, true);
                        }
                    }
                }
                return html;
            }
        }
        var result = {attributes: [], className: ''};
        for (var i = 0; i < node.evaluators.length; i++) {
            EvaluatorManager.resolve(node.evaluators[i].name, node.evaluators[i], result, ctx);
        }
        html = resolveEvaluatorResult(node.body,result, isSelfClosedTag);
        if (result.innerHTML === undefined) {
            for (i = 0; i < node.childNodes.length; i++) {
                html += render(node.childNodes[i], ctx, isRepeat);
            }
        }
        if (!isSelfClosedTag) {
            html += '</' + node.tagName + '>';
        }
        ctx = null;
        return html;
    }
}



function _parse(html) {
    var tagSniper = /<([\w:.-]+)(\s+[\w.-]+\s*=\s*('|").*?\3)*\s*\/?>|<\/([\w:.-]+)\s*>/g;
    var result, root = [], curNode, nodeStack = [], lastIndex = 1;

    function _bindNode(node) {
        if (nodeStack.length > 0) {
            var parent = nodeStack[nodeStack.length - 1];
            parent.childNodes.push(node);
            if (node.textContent !== undefined && parent.tagName != 'script') {
                node.compile();
            }
            /*if(node.exprInfo){
             parent.text=node.exprInfo;
             parent.evaluator.push('text');
             }*/
        }
        else {
            root.push(node);
        }
    }

    while (result = tagSniper.exec(html)) {
        if (tagSniper.lastIndex - lastIndex > result[0].length) {//开始的文本节点
            if (lastIndex == 1) {
                lastIndex = 0;
            }
            var textNode = new TextNode(html.substring(lastIndex, tagSniper.lastIndex - result[0].length));

            _bindNode(textNode);
        }

        if (result[4] === undefined) {
            var tagName = result[1];
            curNode = new Node(tagName, result[0]);
            if (_selfClosedTag[tagName.toLowerCase()]) {
                curNode.body = curNode.body.slice(0, -2);
                _bindNode(curNode);
            }
            else {
                curNode.body = curNode.body.slice(0, -1);
                nodeStack.push(curNode);
            }


        }
        else {
            curNode = nodeStack.pop();
            if (curNode.tagName !== result[4].toLowerCase()) {
                nodeStack.push(curNode);
                curNode.childNodes.push(new TextNode(result[0]));
            }
            else {
                _bindNode(curNode);
            }
        }

        lastIndex = tagSniper.lastIndex;
    }
    if (lastIndex < html.length) {
        textNode = new TextNode(html.slice(lastIndex));
        _bindNode(textNode)
    }
    while (curNode = nodeStack.pop()) {
        _bindNode(curNode);
    }
    return root;
}

if (typeof exports !== 'undefined') {
    exports.parse = _parse;
    exports.render = render;
    exports.Context = Context;
}

//region 工具函数区
var _needResolveDirective = boolObject('html,text,src,href,repeat');
var avalonSniper = /ms-(\w+)(-\w+)*\s*=\s*('|")(.+?)\3/g;//抓取ms指令正则
function resolveAvalonDirective(node, body) {
    var result, code = '';
    while (result = avalonSniper.exec(body)) {
        var text = result[4], name = result[1].toLowerCase();
        if (_needResolveDirective[name]) {
            var splits = text.split(/{{|}}/);
            var expr = '';
            for (var i = 0; i < splits.length; i++) {
                if (i % 2 == 1) {
                    code += resolveExpr(splits[i]);
                    expr += '"+(' + splits[i] + ')+"';
                }
                else expr += splits[i];
            }
            if (splits.length > 1) {
                expr = '"' + expr + '"';
            }
            else {
                code = resolveExpr(expr);
            }
            var evaluator = {
                name: name,
                args: result[2],
                expr: expr,
                evaluate: new Function('ctx', code + 'return ' + expr + ';')
            };
            if (name == 'repeat') {
                node.repeat = evaluator;
            }
            else {
                node.evaluators.push(evaluator);
            }

        }
        else if (name == 'class') {
            var tok = text.split(':');
            if (tok.length > 1) {
                node.evaluators.push({
                    name: name,
                    args: tok[0],
                    expr: tok[1],
                    evaluate: new Function('ctx', resolveExpr(tok[1]) + 'return ' + tok[1] + ';')
                })
            }
            else {
                node.evaluators.push({
                    name: name,
                    args: tok[0],
                    evaluate: false
                });
            }
        }
        else if (name === 'controller') {
            node.controller = {
                expr: trim(text)
            }
        }

    }

}

function resolveEvaluatorResult(body,result, isSelfClosedTag) {
    var html = body;
    if (result.className.length > 0) {
        /*html=html.replace(/ class=('|")(.+?)\1/,function(m,a,b){
            return ' class="'+b+' '+result.className.slice(0, -1);
        });*/
        html += ' class="' + result.className.slice(0, -1) + '"';
    }
    for (var i = 0; i < result.attributes.length; i++) {
        var attribute = result.attributes[i];
        html += ' ' + attribute.name + '="' + attribute.value + '"';
    }

    if (isSelfClosedTag) {
        html += '/>';
        return html;
    }
    else {
        html += '>';
    }


    if (result.innerHTML !== undefined) {
        html += result.innerHTML;
    }
    return html;
}
var re_quote = /('|").*?\1/g, re_trans = /\\'|\\"/g, re_operator = /[,+*\/%|&~!()<>:?=-]/, re_idt = /^\s*[a-zA-Z_$]\w*/;
var _exprCache = {};
var _nonVarsWord = boolObject('Math');//fixme 需要补充
function resolveExpr(expr) {
    var code = '';
    expr = trim(expr);
    if (_exprCache[expr]) {
        return _exprCache[expr];
    }
    expr = expr.replace(re_trans, '').replace(re_quote, '');
    var tokens = expr.split(re_operator);
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (re_idt.test(token) && !_nonVarsWord[token]) {
            token = token.split('.')[0];
            code += 'var ' + token + '=ctx.getVal("' + token + '");\n';
        }
    }
    _exprCache[expr] = code;
    return code;
}
//endregion

//region 指令解析器定义区
EvaluatorManager.register('text', function (evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    ret = ret.replace(re_gt, '&gt;').replace(re_lt, '&lt;');
    if (result)result.innerHTML = ret;
    return ret;
});
EvaluatorManager.register('html', function (evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    if (result)result.innerHTML = ret;
    return ret;
});
EvaluatorManager.register('href', function (evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    result.attributes.push({name: 'href', value: ret});
});
EvaluatorManager.register('src', function (evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    result.attributes.push({name: 'src', value: ret});
});
EvaluatorManager.register('class', function (evaluator, result, ctx) {
    if (evaluator.evaluate === false) {
        result.className += evaluator.args + ' ';
    }
    else {
        var ret = false;
        try {
            ret = evaluator.evaluate(ctx);
        } catch (e) {
        }
        if (ret) {
            result.className += evaluator.args + ' ';
        }
    }
});

EvaluatorManager.register('visible', function (evaluator, result, ctx) {
    var ret = false;
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    if (ret) {
        result.attributes.push({name: 'style', value: 'display:none'});
    }
});
EvaluatorManager.register('if', function (evaluator, result, ctx) {
    var ret = false;
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    if (ret) {
        result.attributes.push({name: 'style', value: 'display:none'});
    }
});
//endregion