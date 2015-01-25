/**
 * Created by godsong on 15-1-16.
 */

var fs=require('fs');
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


function TextNode(text) {
    this.textContent = text;
}
TextNode.prototype.toString = function () {
    return this.textContent;
};
function Node(name) {
    this.tagName = name;
    this.childNodes = [];
    this.attributes = [];
    this.attributesMap = {};
}
Node.prototype.addAttribute = function (name, value) {
    this.attributesMap[name] = value;
    this.attributes.push(name);
};
Node.prototype.toString = function () {
    var html = '<' + this.tagName;
    for (var i = 0; i < this.attributes.length; i++) {
        html += ' ' + this.attributes[i] + '="' + this.attributesMap[this.attributes[i]] + '"'
    }
    html += '>';
    for (i = 0; i < this.childNodes.length; i++) {
        html += this.childNodes[i].toString();
    }
    html += '</' + this.tagName + '>';
    return html;
};

function _parse(html) {
    var prevStr = '', state = ParseState.TEXT, isPlain = false, quote, text = '', curNode = new Node('root'), nodeStack = [curNode];
    var root = curNode;
    for (var i = 0; i < html.length; i++) {
        var ch = html.charAt(i);
        if (_whitespace(ch)) {
            if (state === ParseState.BEGIN_TAG) {
                state = ParseState.ATTR_NAME;
                curNode = new Node(text);
                nodeStack.push(curNode);
                text = '';
            }
            else if (state === ParseState.ATTR_NAME) {
                curNode.addAttribute(text, '');
                text = '';
            }
            else if (state === ParseState.IN_TAG) {
                state = ParseState.ATTR_NAME;
            }
            else{
                text+=ch;
            }
        }
        else if (ch === '<' && state != ParseState.ATTR_VALUE) {

            if (state == ParseState.TAG_BODY) {
                nodeStack[nodeStack.length - 1].childNodes.push(new TextNode(text));
            }
            state = ParseState.BEGIN_TAG;
            text = '';
        }
        else if (ch === '>' && state != ParseState.ATTR_VALUE) {

            if (state === ParseState.END_TAG) {
                curNode = nodeStack.pop();
                nodeStack[nodeStack.length - 1].childNodes.push(curNode);
            }
            else if (state === ParseState.BEGIN_TAG) {
                curNode = new Node(text);
                nodeStack.push(curNode);
                text = '';
            }
            state = ParseState.TAG_BODY;
            text = '';
        }
        else if (ch === '!') {

        }
        else if (ch === '=' && state != ParseState.ATTR_VALUE) {
            if (state == ParseState.ATTR_NAME) {
                state = ParseState.ATTR_VALUE_BEGIN;

                curAttributeName = text;
                text = '';
            }
            else {
                console.error()
            }
        }
        else if ((ch === '"' || ch === "'") && !isPlain && state === ParseState.ATTR_VALUE_BEGIN) {
            state = ParseState.ATTR_VALUE;
            quote = ch;
        }
        else if ((ch === '"' || ch === "'") && !isPlain && state === ParseState.ATTR_VALUE && ch == quote) {
            curNode.addAttribute(curAttributeName, text);
            state = ParseState.IN_TAG;
            text = '';
        }
        else if (ch === '/' && prevStr.charAt(prevStr.length - 1) == '<') {
            state = ParseState.END_TAG;
        }

        else {
            text += ch;

        }
        prevStr = prevStr.slice(-3) + ch;
    }
    return root;
}
function _whitespace(c) {
    return c === " " || c === "\n" || c === "\t" || c === "\f" || c === "\r";
}
console.time(1);
var buffer=fs.readFileSync('./mass2.html');
console.timeEnd(1);
var str=buffer.toString();
console.time(2);
var dom=_parse(str);
console.timeEnd(2);
console.time(3);
var result=dom.toString();
console.timeEnd(3);
fs.writeFile('xx.html',result);