/**
 * Created by godsong on 15-2-3.
 */
var fs=require('fs');
var parser=require('./XParser.js');


console.time('read source');
var buffer=fs.readFileSync('./nb.html');
console.timeEnd('read source');


console.time('parse');
var str=buffer.toString();
var dom=parser.parse(str);
console.timeEnd('parse');



console.time('write to tpl');
fs.writeFileSync('xx.tpl',JSON.stringify(dom));
console.timeEnd('write to tpl');


console.time('read tpl');
buffer=fs.readFileSync('./xx.tpl');
console.timeEnd('read tpl');


console.time('parse from tpl');
dom=JSON.parse(buffer.toString());
console.timeEnd('parse from tpl');
console.time('render');
var result='';
var ctx=new parser.Context();
parser.Context.model={abc:{name:'高嵩',b:'http://www.baidu.com'}};
dom.forEach(function(e){
    result+= parser.render(e,ctx);
});
console.timeEnd('render');

console.time('render write');
fs.writeFileSync('xx.html',result);
console.timeEnd('render write');