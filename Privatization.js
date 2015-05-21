/**
 * Created by godsong on 15-5-16.
 */

var Privatization = factory();

//写一个类 不用关心私有还是公有
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
//私有化 db和pri
UData = Privatization(UData, 'db,pri');
var udata = new UData();
console.log(udata.db, udata.pri);//undefined undefined 外部根本访问不到
udata.show();//成员变量依然可以访问到
udata.change();
udata.show();

/*代码实现区*/
function factory() {
    var module = {};
    void function(module) {

        ///////////////////////////////////
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

        module.exports = function(constructor, prototype, privates) {

            if(typeof prototype == 'string' && arguments.length == 2) {
                privates = prototype;
                prototype = constructor.prototype;
            }
            privates = privates.split(',');
            return function() {
                var proxyedPrototype = {};//prototype代理
                forEach(prototype, function(methodName, method) {
                    proxyedPrototype[methodName] = function(Do, Re, Mi, Fa) {//创建每个原型方法的代理函数
                        switch(arguments.length) {
                            case 0:
                                return method.call(realInstance);
                            case 1:
                                return method.call(realInstance, Do);
                            case 2:
                                return method.call(realInstance, Do, Re);
                            case 3:
                                return method.call(realInstance, Do, Re, Mi);
                            case 4:
                                return method.call(realInstance, Do, Re, Mi, Fa);
                            default:
                                return method.apply(realInstance, slice.call(arguments));
                        }
                    };
                    //代理函数看起来像是真的
                    proxyedPrototype[methodName].toString = function() {
                        return method.toString();
                    }
                });
                //设置prototype
                constructor.prototype = proxyedPrototype;
                //实例化
                var instance = new constructor();
                //拷贝一份原始实例
                var realInstance = merge({}, instance);
                //分离实例中的私有变量
                for(var i = 0; i < privates.length; i++) {
                    delete instance[privates[i]];
                }
                return instance;
            }
        }
    ///////////////////////////////////
    }(module);
    return module;
}