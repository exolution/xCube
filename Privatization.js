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

//外部根本访问不到
console.log(udata.db, udata.pri);//undefined undefined
udata.show();//成员变量依然可以访问到
udata.change();
udata.show();
//这种情况是非法的 虽然不会报错 私有变量db是不会被修改的

udata.db=123;
//虽然此时 udata.db这样访问能访问到123
console.log(udata.db);// 123
//但是很明显私有的db并没有被影响
udata.show();//{ name: 'mongoDB' }
//但是一旦成员方法使用了该私有变量 外部的udata.db就会被清空
console.log(udata.db);//undefine


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
        function splitPrivateData(target,privateDefinition){
            var privateData={};
            for(var i=0;i<privateDefinition.length;i++){
                if(target.hasOwnProperty(privateDefinition[i])){
                    privateData[privateDefinition[i]]=target[privateDefinition[i]];
                     delete target[privateDefinition[i]];
                }
            }
            return privateData;
        }
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
                var privateData={};
                forEach(prototype, function(methodName, method) {
                    proxyedPrototype[methodName] = function(Do, Re, Mi, Fa) {//创建每个原型方法的代理函数
                        merge(instance,privateData);
                        var ret;
                        //因为call比apply性能高 所以尽量用call
                        switch(arguments.length) {
                            case 0:
                                ret= method.call(instance);
                                break;
                            case 1:
                                ret= method.call(instance, Do);
                                break;
                            case 2:
                                ret= method.call(instance, Do, Re);
                                break;
                            case 3:
                                ret= method.call(instance, Do, Re, Mi);
                                break;
                            case 4:
                                ret= method.call(instance, Do, Re, Mi, Fa);
                                break;
                            default:
                                ret= method.apply(instance, slice.call(arguments));
                                break;
                        }
                        privateData=splitPrivateData(instance,privates);
                        return this;

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
                //取消引用prototype防止泄露
                constructor.prototype=null;
                //分离实例中的私有变量
                privateData=splitPrivateData(instance,privates);
                return instance;
            }
        };
    ///////////////////////////////////
    }(module);
    return module.exports;
}