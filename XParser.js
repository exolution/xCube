/**
 * XParser Node端 MVVM（目前针对avalon.js）模板静态渲染引擎
 * 解析指令 ms-href ms-src ms-repeat ms-controller ms-class ms-html ms-text
 * 不支持过滤器 ms-attr （ms-attr-href形式需要转换成ms-href）
 * @author godsong
 * @version 1.0
 * #TODO 性能需优化 准确性验证 内存泄露检查
 * #TODO  注释处理
 */

var  _uuid = 0;
var _selfClosedTag = boolObject('area,base,basefont,br,col,command,embed,hr,img,input,link,meta,param,source,track,wbr');

/**
 * 节点类
 * 包含tagName
 * body 指整个标签体的内容。 为简单字串 不解析出attributes 因为用不到
 * evaluators 分析出的ms-*指令的 求值器
 */
function Node(name, body) {
    this.tagName = name.toLowerCase();
    this.childNodes = [];
    this.body = body;
    this.evaluators = [];
    resolveAvalonDirective(this, body);//解析avalon的指令
}
//文本节点 只包含texContent
function TextNode(text) {
    this.textContent = text;
}
//对包含{{}}的文本节点进行编译 生成求值器（evaluator）
TextNode.prototype.compile = function(parentNode) {
    var splits = this.textContent.split(/{{|}}/);
    if(splits.length > 1) {
        parentNode.html = trim(this.textContent);
        var expr = '', code = '';
        for(var i = 0; i < splits.length; i++) {
            if(i % 2 == 1) {
                code += resolveExpr(splits[i]);
                expr += '"+(' + splits[i] + ')+"';
            }
            else expr += splits[i].replace(/\n/g, '\\n');
        }
        expr = '"' + expr + '"';

        this.evaluator = {
            expr     : expr,
            evaluate : new Function('ctx', code + 'return ' + expr + ';')
        };

    }
};

/**
 * 渲染上下文类
 * 只要存在嵌套结构 就需要上下文信息组成一个context树
 * 一个ms-controller范围 和一个ms-repeat的范围都会创建context
 */
function Context(parent, ctrlName, id) {
    this.parent = parent || null;
    this.ctrlName = ctrlName || (parent && parent.ctrlName);
    this.scope = {};
    this.id = id;
    if(this.parent) {
        this.scope.$outer = this.parent.scope;
    }
}
Context.model = {};
//用于evaluator函数中取具体某个变量的值
Context.prototype.getVal = function(name) {
    var root = this.scope[name] === undefined ?
        Context.model[this.ctrlName] && Context.model[this.ctrlName][name] :
        this.scope[name];
    if(root === undefined && this.parent) {
        return this.parent.getVal(name);
    }
    return root;

};


var re_tagclose = /\/?>$/;
/**
 * 基于正则匹配的解析器
 * 基本原理并不复杂
 * 遇到标签开始 就把该标签解析一下 创建Node并入栈
 * 遇到标签结束 将栈顶node出栈并加到栈顶node的childNodes里
 */
function _parse(html) {
    var tagSniper = /<([\w:.-]+)(\s+[\w.-]+\s*=\s*('|").*?\3)*\s*\/?>|<\/([\w:.-]+)\s*>/g;
    var result, root = [], curNode, nodeStack = [], lastIndex = 1;

    function _bindNode(node) {//把node绑定到其父node上
        if(nodeStack.length > 0) {
            var parent = nodeStack[nodeStack.length - 1];
            parent.childNodes.push(node);
            if(node.textContent !== undefined && parent.tagName != 'script') {
                node.compile(parent);
            }
        }
        else {
            root.push(node);
        }
    }

    while(result = tagSniper.exec(html)) {
        if(tagSniper.lastIndex - lastIndex > result[0].length) {//上个结束标签和这个开始标签之间有文本 作为文本节点处理
            if(lastIndex == 1) {//开始的文本节点
                lastIndex = 0;
            }
            var textNode = new TextNode(html.substring(lastIndex, tagSniper.lastIndex - result[0].length));
            _bindNode(textNode);
        }

        if(result[4] === undefined) {
            var tagName = result[1];
            curNode = new Node(tagName, result[0]);
            curNode.body = curNode.body.replace(re_tagclose, '');
            if(_selfClosedTag[curNode.tagName]) {
                _bindNode(curNode);
            }
            else {
                nodeStack.push(curNode);
            }


        }
        else {
            curNode = nodeStack.pop();
            if(curNode.tagName !== result[4].toLowerCase()) {//开始和结束标签不匹配 作为文本节点处理
                nodeStack.push(curNode);
                curNode.childNodes.push(new TextNode(result[0]));
            }
            else {
                _bindNode(curNode);
            }
        }
        lastIndex = tagSniper.lastIndex;
    }
    if(lastIndex < html.length) {//剩余一些文本 作为文本节点
        textNode = new TextNode(html.slice(lastIndex));
        _bindNode(textNode)
    }
    while(curNode = nodeStack.pop()) {
        _bindNode(curNode);
    }
    return root;
}
/**
 * 渲染Node主逻辑
 * 逻辑极其复杂复杂 自己理解，自求多福吧=。=
 * isHidden 当前渲染的状态是“已经隐藏” 表示在其祖先节点中已经有元素隐藏了
 *          因此此节点和其子孙阶段无需隐藏
 * isIgnore 当前的渲染状态是“已经忽略” 表示在其祖先节点中有ms-if未命中
 *          因此此节点树 已不需要进行任何avalon指令分析运算以提高性能
 * */
function render(node, ctx, isHidden,isIgnore) {
    if(node.textContent !== undefined) {//渲染文本节点
        if(node.evaluator) {//todo 将来更精确的区分 ms-html和ms-text
            return EvaluatorManager.resolve('html', node.evaluator, null, ctx, node);
        }
        return node.textContent;
    }
    else {
        var isSelfClosedTag = _selfClosedTag[node.tagName];
        var result = {attributes : [], className : '', style : ''};
        if(!isIgnore) {//不是忽略状态 进行各种avalon指定的吻戏
            if(node.controller) {
                //根据ms-controller创建新的Context
                ctx = new Context(ctx, node.controller.expr);
                delete node.controller;
            }
            //处理repeat逻辑
            if(node.repeat && (node.repeat.contextId === undefined || ctx.id != node.repeat.contextId)) {
                //尼玛这点儿逻辑自己真看不懂了 就这样吧 反正这么处理就是对 不这么处理就错
                var html = '';
                var array;
                ctx = new Context(ctx, null, _uuid);
                node.repeat.contextId = _uuid;
                _uuid++;
                try {
                    array = node.repeat.evaluate(ctx);
                } catch(e) {
                }
                if(array && array.length > 1) {
                    var proxy = node.repeat.args;
                    if(proxy) {
                        proxy = proxy.slice(1);
                        for(var idx = 0; idx < array.length; idx++) {
                            ctx.scope.$index = idx;
                            ctx.scope.$first = idx == 0;
                            ctx.scope.$last = idx == array.length - 1;
                            ctx.scope[proxy] = array[idx];
                            if(idx > 0) {
                                node.needDelRepeatNode = true;

                            }
                            html += render(node, ctx, isHidden,isIgnore);
                        }
                    }
                    else {
                        var firstKey = false;
                        for(var k in array) {
                            if(array.hasOwnProperty(k)) {
                                if(firstKey === false) {
                                    firstKey = k;
                                }
                                else {
                                    node.needDelRepeatNode = true;
                                }
                                ctx.scope.$key = k;
                                ctx.scope.$val = array[k];
                                html += render(node, ctx, isHidden,isIgnore);
                            }
                        }
                    }
                    return html;
                }
                else {
                    result.style += 'display:none';
                    result.className += '_avalon_need_show ';
                    result.isHidden = true;
                }
            }
            if(isHidden) {
                result.isHidden = true;
            }
            for(var i = 0; i < node.evaluators.length; i++) {
                EvaluatorManager.resolve(node.evaluators[i].name, node.evaluators[i], result, ctx, node);
            }

            if(node.needDelRepeatNode) {
                result.className += '_avalon_need_del ';
            }

            html = resolveEvaluatorResult(node, result, isSelfClosedTag);
            isHidden = result.isHidden;
            isIgnore = result.isIgnore;
        }
        else{
            html=node.body;
            if(node.html) {
                html += ' ms-text="' + node.html.replace(re_trimBrace,'').replace(/"/g,"'") + '"';
            }
            if(isSelfClosedTag){
                html+='/>';
            }
            else{
                html+='>';
            }
        }
        if(result.innerHTML === undefined) {
            for(i = 0; i < node.childNodes.length; i++) {
                html += render(node.childNodes[i], ctx, isHidden, isIgnore);
            }
        }
        if(!isSelfClosedTag) {
            html += '</' + node.tagName + '>';
        }
        ctx = null;
        return html;
    }
}


if(typeof exports !== 'undefined') {
    exports.parse = _parse;
    exports._render = render;
    exports.setModel = function(model) {
        Context.model = data;
    };
    exports.render = function(srcHtml, data) {
        Context.model = data;
        var dom = _parse(srcHtml);
        var dstHtml = '';
        dom.forEach(function(node) {
            dstHtml += render(node, null);
        });
        return dstHtml;
    }
}

//region 工具函数区
function boolObject(str) {
    var obj = {};
    var splits = str.split(',');
    for(var i = 0; i < splits.length; i++) {
        obj[splits[i]] = true;
    }
    return obj;
}
var re_trim = /^\s*|\s*$/g;//trim正则
var re_gt = />/g, re_lt = /</g;
function trim(str) {
    return str.replace(re_trim, '');
}

var _needResolveDirective = boolObject('html,text,src,href,repeat,css,visible,if');
var _needFixCss = boolObject('width,height,font-size,top,left,right,bottom');
var avalonSniper = /ms-(\w+)((?:-\w+)*)\s*=\s*('|")(.+?)\3/g;//抓取ms指令正则
function resolveAvalonDirective(node, body) {//解析avalon指令 此处是影响parse效率的根本 优化从此处入手
    var result, code = '';
    while(result = avalonSniper.exec(body)) {
        var text = result[4], name = result[1].toLowerCase();
        if(_needResolveDirective[name]) {
            var splits = text.split(/{{|}}/);
            var expr = '';
            for(var i = 0; i < splits.length; i++) {
                if(i % 2 == 1) {
                    code += resolveExpr(splits[i]);//解析表达式
                    expr += '"+(' + splits[i] + ')+"';
                }
                else expr += splits[i];
            }
            if(splits.length > 1) {
                expr = '"' + expr + '"';
            }
            else {
                code = resolveExpr(expr);
            }
            /*try {*/
            var evaluator = {
                name     : name,
                args     : result[2],
                expr     : expr,
                evaluate : new Function('ctx', code + 'return ' + expr + ';')
            };
            /* }catch(e){
             console.log(expr);
             }*/
            if(name == 'repeat') {
                node.repeat = evaluator;//repeat需要特殊处理所以直接设置在node上
            }
            else {//其余的扔在evaluator列表里 渲染时一次运算即可
                node.evaluators.push(evaluator);
            }

        }
        else if(name == 'class') {//ms-class需要特殊的语法分析
            var tok = text.split(':');
            if(tok.length > 1) {
                node.evaluators.push({
                    name     : name,
                    args     : tok[0],
                    expr     : tok[1],
                    evaluate : new Function('ctx', resolveExpr(tok[1]) + 'return ' + tok[1] + ';')
                })
            }
            else {
                node.evaluators.push({
                    name     : name,
                    args     : tok[0],
                    evaluate : false
                });
            }
        }
        else if(name === 'controller') {
            node.controller = {
                expr : trim(text)
            }
        }

    }

}
var origClassName, origStyle, re_class = / class=('|")(.+?)\1/g, re_style = / style=('|")(.+?)\1/g; //很不优雅的方式 但是为了效率
function _classReplacer(m, a, b) {
    origClassName += b + ' ';
    return '';
}
function _styleReplacer(m, a, b) {
    origStyle += b + ';';
    return '';
}
var re_trimBrace=/^\s*\{\{\s*|\s*\}\}\s*$/g
function resolveEvaluatorResult(node, result, isSelfClosedTag) {//对evaluator的运算结果进行拼装
    var html = node.body;
    if(result.className.length > 0) {
        origClassName = '';
        html = html.replace(re_class, _classReplacer);
        html += ' class="' + origClassName + result.className.slice(0, -1) + '"';
    }
    for(var i = 0; i < result.attributes.length; i++) {
        var attribute = result.attributes[i];
        html += ' ' + attribute.name + '="' + attribute.value + '"';
    }
    if(result.style.length > 0) {
        origStyle = '';
        html = html.replace(re_style, _styleReplacer);
        html += ' style="' + origStyle + result.style + '"';
    }
    if(node.html) {
        html += ' ms-text="' + node.html.replace(re_trimBrace,'').replace(/"/g,"'") + '"';
    }
    if(isSelfClosedTag) {
        html += '/>';
        return html;
    }
    else {
        html += '>';
    }


    if(result.innerHTML !== undefined) {
        html += result.innerHTML;
    }
    return html;
}
var re_quote = /('|").*?\1/g, re_trans = /\\'|\\"/g, re_operator = /\s*[,+*\/%|&~!()<>:?=-]\s*/, re_idt = /^\s*[a-zA-Z_$]\w*/;
var _exprCache = {};
var _nonVarsWord = boolObject('Math,true,false,instanceof,new,null');//fixme 需要补充
function resolveExpr(expr) {//fixme 需要完善
    var code = '';
    expr = trim(expr);
    if(_exprCache[expr]) {
        return _exprCache[expr];
    }
    expr = expr.replace(re_trans, '').replace(re_quote, '');
    var tokens = expr.split(re_operator);
    for(var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if(re_idt.test(token) && !_nonVarsWord[token]) {
            token = token.split('.')[0];
            code += 'var ' + token + '=ctx.getVal("' + token + '");\n';
        }
    }
    _exprCache[expr] = code;
    return code;
}
function handleError(e) {
    //throw e;
}
//endregion

//region 指令解析器定义区
var EvaluatorManager = function() {
    var _evaluatorList = {}, exports = {};
    exports.register = function(name, resolver) {
        _evaluatorList[name] = resolver;
    };
    exports.resolve = function(name, evaluator, result, ctx, node) {
        return _evaluatorList[name] && _evaluatorList[name](evaluator, result, ctx, node);
    };
    return exports;
}();
EvaluatorManager.register('text', function(evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        handleError(e);
    }
    ret = ret.replace(re_gt, '&gt;').replace(re_lt, '&lt;');
    if(result)result.innerHTML = ret;
    return ret;
});
EvaluatorManager.register('html', function(evaluator, result, ctx, node) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        //console.log(node);
        //handleError(e);
    }
    if(result)result.innerHTML = ret;
    return ret;
});
EvaluatorManager.register('href', function(evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        handleError(e);
    }
    result.attributes.push({name : 'href', value : ret});
});
EvaluatorManager.register('src', function(evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        handleError(e);
    }
    result.attributes.push({name : 'src', value : ret});
});
EvaluatorManager.register('class', function(evaluator, result, ctx) {
    if(evaluator.evaluate === false) {
        result.className += evaluator.args + ' ';
    }
    else {
        var ret = false;
        try {
            ret = evaluator.evaluate(ctx);
        } catch(e) {
            handleError(e);
        }
        if(ret) {
            result.className += evaluator.args + ' ';
        }
    }
});
EvaluatorManager.register('visible', function(evaluator, result, ctx) {
    var ret = false;
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        handleError(e);
    }
    if(!ret) {
        result.style += 'display:none;';
        result.isHidden = true;
    }
});
EvaluatorManager.register('if', function(evaluator, result, ctx) {
    var ret = false;
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        handleError(e);
    }
    if(!ret ) {
        if(!result.isHidden){
            result.style += 'display:none;';
            result.className += '_avalon_need_show ';
            result.isHidden = true;

        }
        result.isIgnore=true;
    }
    else{
        //result.isHidden=false;
    }
});
EvaluatorManager.register('css', function(evaluator, result, ctx) {
    var ret = '';
    try {
        ret = evaluator.evaluate(ctx);
    } catch(e) {
        //console.log(node);
        //handleError(e);
    }
    var styleName = evaluator.args.slice(1);
    if(_needFixCss[styleName]) {
        ret += 'px';
    }
    result.style += styleName + ':' + ret + ';';
});
//endregion