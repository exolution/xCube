/**
 * Created by godsong on 15-1-16.
 */


var _ci = 0;//const increase index
var ParseState = {
    TEXT: 0,
    BEGIN_TAG: 1,
    TAG_BODY: 2,
    END_TAG: 3,
    ATTR_NAME: 4,
    ATTR_VALUE_BEGIN: 5,
    ATTR_VALUE: 6,
    IN_TAG: 7
};
var _expando = Math.random().toString().slice(-8), VMName = 'vm_' + _expando;
function boolObject(str) {
    var obj = {};
    var splits = str.split(',');
    for (var i = 0; i < splits.length; i++) {
        obj[splits[i]] = true;
    }
    return obj;
}
var _selfClosedTag = boolObject('area,base,basefont,br,col,command,embed,hr,img,input,link,meta,param,source,track,wbr');
var _needResolveDirective = boolObject('html,text,src,href,repeat');
var _nonVarsWord = boolObject('Math');
var re_trim = /^\s*|\s*$/g;

var avalonSniper = /ms-(\w+)(-\w+)*\s*=\s*('|")(.+?)\3/g;
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
var r_gt = />/g, r_lt = /</g;
EvaluatorManager.register('text', function (evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch (e) {
    }
    ret = ret.replace(r_gt, '&gt;').replace(r_lt, '&lt;');
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
function resolveEvaluatorResult(result, isSelfClosedTag) {
    var html = '';
    for (var i = 0; i < result.attributes.length; i++) {
        var attribute = result.attributes[i];
        html += ' ' + attribute.name + '="' + attribute.value + '"';
    }
    if (result.className.length > 0) {
        html += ' class="' + result.className.slice(0, -1) + '"';
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

function Context(parent, ctrlName) {
    this.parent = parent || null;
    this.ctrlName = ctrlName || (parent && parent.ctrlName);
    this.scope = {};
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
        if (isRepeat)console.log(ctx.scope);
        if (node.repeat) {
            var html = '';
            var array;
            try {
                array = node.repeat.evaluate(ctx);
            } catch (e) {
            }
            if (array) {
                var proxy = node.repeat.args.slice(1);
                delete node.repeat;
                if (proxy) {
                    for (var idx = 0; idx < array.length; idx++) {
                        ctx.scope.$outer = {$index: ctx.scope.$index, $outer: ctx.scope.$outer};
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
                            ctx.scope.$outer = {$index: ctx.scope.$index, $outer: ctx.scope.$outer};
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
        html = node.body;
        html += resolveEvaluatorResult(result, isSelfClosedTag);
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
function _render(node) {
    if (node.textContent !== undefined) {
        return node.textContent;
    }
    else {

        var html = node.body;

        for (var i = 0; i < node.evaluator.length; i++) {

        }
        for (i = 0; i < node.childNodes.length; i++) {
            html += render(node.childNodes[i]);
        }
        if (!_selfClosedTag[node.tagName]) {
            html += '</' + node.tagName + '>';
        }
        return html;
    }
}


function Node(name, body) {
    this.tagName = name.toLowerCase();
    this.childNodes = [];
    this.body = body;
    this.evaluators = [];
    resolveAvalonDirective(this, body);
    this.attributes = [];
    this.attributesMap = {};
}
Node.prototype.addAttribute = function (name, value) {
    this.attributesMap[name] = value;
    this.attributes.push(name);
};
Node.prototype.toString = function () {
    if (this.body) {
        var html = this.body;
    }
    else {
        html = '<' + this.tagName;
        for (var i = 0; i < this.attributes.length; i++) {
            html += ' ' + this.attributes[i] + '="' + this.attributesMap[this.attributes[i]] + '"'
        }
        html += '>';
    }
    for (i = 0; i < this.childNodes.length; i++) {
        html += this.childNodes[i].toString();
    }
    if (!_selfClosedTag[this.tagName]) {
        html += '</' + this.tagName + '>';
    }
    return html;
};
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
var re_quote = /('|").*?\1/g, re_trans = /\\'|\\"/g, re_operator = /[,+*\/%|&~!()<>:?=-]/, re_idt = /^\s*[a-zA-Z_$]\w*/;
var _exprCache = {};
function resolveExpr(expr, vmName) {
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