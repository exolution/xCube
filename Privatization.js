/**
 * Created by godsong on 15-5-16.
 */
var Privatization = function() {
    var merge = function(dest, src) {
        for(var k in src) {
            if(src.hasOwnProperty(k)) {
                dest[k] = src[k]
            }
        }
        return dest;
    };
    var slice = Array.prototype.slice;

    function forEach(target, callback) {
        for(var key in target) {
            if(target.hasOwnProperty(key)) {
                callback(key, target[key]);
            }
        }
    }

    return function(constructor, prototype, privates) {

        if(typeof prototype == 'string' && arguments.length == 2) {
            privates = prototype;
            prototype = constructor.prototype;
        }
        privates = privates.split(',');
        return function() {
            var proxyedPrototype = {};
            forEach(prototype, function(methodName, method) {
                proxyedPrototype[methodName] = function() {
                    var args = slice.call(arguments);
                    method.apply(realInstance, args);
                };
                proxyedPrototype[methodName].toString = function() {
                    return method.toString();
                }
            });
            constructor.prototype = proxyedPrototype;
            var instance = new constructor();
            var realInstance = merge({}, instance);
            for(var i = 0; i < privates.length; i++) { //分离私有变量和公有变量
                delete instance[privates[i]];
            }
            return instance;
        }
    }

}();
function UData() {
    this.db = {name : 'mysql'};
    this.pub = 123;
    this.pri = 'hahaha'
}
UData.prototype = {
    show   : function() {
        console.log(this.db);
        console.log(this.pri);
    },
    change : function() {
        this.db = {name : 'mongoDB'};
        this.pri = "ooxx";
    }
};
UData = Privatization(UData, 'db,pri');
var udata = new UData();
udata.show();
udata.change();
udata.show();