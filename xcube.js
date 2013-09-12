/**
 * @description xCube Framework
 * @author exolution
 * @version 0.8.131 prototype
 */
console.time('resolve')
var exo = {
};
exo.Cube = function tta(window, undefined) {
    try {
        console.log("xCube Framework v0.8.131 Actived"); //避免不支持console的浏览器抛错
    } catch (e) {
        window.console = {
            log: function (v) {
            },
            error: function (v) {
            },
            warn: function (v) {
            }
        }
    }
    /*====util var defination====*/

    var rgxTrimLeft = /^\s+/,
        rgxTrimRight = /\s+$/,
        toString = Object.prototype.toString;
    if (Function.prototype.bind) {
        var log$ = console.log.bind(console);
        var err$ = console.error.bind(console);
    }

    /*====util function defination====*/
    function globalize(v, obj) { //内部用工具函数 将obj暴露到全局作用域 即以名字v绑定在window上
        if (typeof v == 'string') {
            if (!Object.prototype.hasOwnProperty.call(window, v)) {
                window[v] = obj;
            }
        }
    }

    /*语法糖 实参查找器 实现乱序参数*/
    var argSeeker = function (type, defValue, startAt) {
        var args = arguments.callee.caller.arguments;
        for (var i = startAt; i < args.length; i++) {
            if (typeOf(args[i]) == type)return args[i];
        }
        return defValue;
    };
    /**
     * 驼峰法命名与分割法命名互换 自动判断字符串中是否包含分隔符来设定转换模式
     * @param letter 需要转换的字符串 必选参数
     * @param hyphen optional:<string>分割符 默认为'_'
     * @param isfirstUpper optional:<boolean>转换后的驼峰字符串首字母是否为大写 默认为false
     * @param caseMode optional:<number>转换后的分割法字符串 大小写模式 1全大写 0全小写 默认为1
     * ##上述optional标示意思是此参数为可选参数，而且参数次序可以随便摆放，但必须遵循右边尖括号里所指定的类型##
     * */

    var camelCase = function (letter/*,hyphen,isfirstUpper,caseMode*/) {
        var hyphen = argSeeker('string', '_', 1),
            isfirstUpper = argSeeker('boolean', false, 1),
            caseMode = argSeeker('number', 0, 1);
        if (letter == null) return "";
        if (letter.indexOf(hyphen) != -1) {//字串包含分隔符说明是分隔法命名转换成驼峰法
            var expr = new RegExp((isfirstUpper ? '(^.)|' : '(!!!!)|' ) + '(' + hyphen + '.)', 'g');
            letter = letter.toLowerCase();
            return letter.replace(expr, function (m, a, b, i, l) {
                if (a != undefined) return a.toUpperCase();
                else if (b != undefined) return b.slice(1).toUpperCase();
            });
        }
        else {//驼峰法命名转换成分隔法。
            letter = letter.replace(/[A-Z]/g, function (m, a, i, l) {
                if (i == 0)return m.toLowerCase();
                else return '_' + m.toLowerCase();
            });
            if (caseMode == 1)return letter.toUpperCase();
            else return letter;
        }

    };
    var perfAspect={
        time:[],
        doAround:function(target,args){

        }
    }
    //AOP尝试 不过没有IOC AOP应用会很生硬
    function addAspect(target, rule, proxy) {
        if (typeof target === 'function') {
            proxy = rule;
            return function () {
                var ret;
                proxy.doBefore && proxy.doBefore();
                if (proxy.doAround) {
                    ret = proxy.doAround.call(this, target, Array.prototype.slice.call(arguments));
                }
                else {
                    ret = target.apply(this, arguments);
                }
                proxy.doAfter() && proxy.doAfter();
                return ret;
            };

        }
        else if (typeof target === 'object') {
            if (typeof rule === 'string') {

            }
            else if (rule instanceof RegExp) {
                var fn;
                for (var key in target) {
                    if (target.hasOwnProperty(key)) {
                        if (key.test(rule) && typeof target[key] === "function") {
                            fn = target[key];
                            target[key] = function () {
                                var ret;
                                proxy.doBefore && proxy.doBefore();
                                if (proxy.doAround) {
                                    ret = proxy.doAround.call(this, fn, Array.prototype.slice.call(arguments));
                                }
                                else {
                                    ret = fn.apply(this, arguments);
                                }
                                proxy.doAfter() && proxy.doAfter();
                                return ret;
                            }

                        }
                    }
                }
            }
            else if (rule instanceof Array) {
                for (var i = 0; i < rule.length; i++) {
                    if (typeof target[rule[i]] == 'function') {
                        fn = target[rule[i]];
                        target[rule[i]] = function () {
                            var ret;
                            proxy.doBefore && proxy.doBefore();
                            if (proxy.doAround) {
                                ret = proxy.doAround.call(this, fn, Array.prototype.slice.call(arguments));
                            }
                            else {
                                ret = fn.apply(this, arguments);
                            }
                            proxy.doAfter() && proxy.doAfter();
                            return ret;
                        }
                    }
                }
            }
        }
    }

    /*获得当前package的名字(命名空间);*/
    var findPackObj = function () {

        var curFunc = arguments.callee;
        var packObj;
        while (curFunc != null) {
            if (curFunc.hasOwnProperty('packObj')) {
                packObj = curFunc.packObj;
                break;
            }
            curFunc = curFunc.caller;
        }
        return packObj;
    };
    /*
     将普通的类函数（一般函数都有类的语义）转换成框架中能用于继承类，
     主要是附加_parent_参数并继承于ObjectX。使得继承系统能够extend普通的类函数（即非Class（）创建的类）
     !不保证完美兼容!
     */
    var transformClass = function (classfunc) {
        if (typeof classfunc === 'function') {
            if (!classfunc._parent_) {
                classfunc._parent_ = ObjectX;
            }
            return classfunc;
        }
        else {
            return undefined;
        }
    };
    /**
     * 定位一个类
     * 如果不是函数则返回undefined 如果参数指定的函数不是类而是原生函数 则会将其简单转化为本框架中的类。
     * */
    var locClass = function (fullName, bind) {
        fullName = fullName || '';
        var names = fullName.split('.');
        var curObj = bind || window;
        for (var i = 0; i < names.length; i++) {
            if (names[i] === '' || curObj[names[i]] === undefined)return undefined;
            else curObj = curObj[names[i]];
        }
        return transformClass(curObj);
    };
    /**
     * 创建或返回一个命名空间对象（路径终点对象）
     * @param namespace 命名空间字串 xx.xx.xx
     * @param find 查找模式。为true时仅为查找命名空间 否则创建命名空间（若命名空间不存在）
     * @param bind 指定命名空间对象的绑定对象默认为window
     * 命名空间对象会加上_ns_属性
     * */
    var nameSpace = function (namespace, find, bind) {
        namespace = namespace || '';
        var names = namespace.split('.');
        var curObj = bind || window;
        for (var i = 0; i < names.length; i++) {
            if (names[i] === '')continue;
            if (curObj[names[i]] == undefined) {
                if (find)return undefined;
                else curObj = curObj[names[i]] = {'_ns_': true};
            }
            curObj = curObj[names[i]];
        }
        return curObj;
    };


    /**
     * 获得对象的类型结果与原生typeof兼容 采取小写 比如 regexp date
     * */
    var typeOf = function (obj) {
        var typestr = typeof obj;
        if (typestr == 'object') {
            typestr = toString.call(obj);
            typestr = typestr.substring(typestr.indexOf(' ') + 1, typestr.length - 1).toLowerCase();
        }
        return typestr;
    };
    /**
     * 去除字符串头尾的空白字符
     * @param str 字符串
     * @param mode 0代表删除头和尾部的空白符 小于0代表只删除头部空白符 大于0代表只删除尾部的空白符 默认为0
     * */
    var trim = function (str, mode) {
        mode = mode || 0;
        if (str == null)return "";
        if (mode <= 0) {
            str = str.toString().replace(rgxTrimLeft, "");
        }
        if (mode >= 0) {
            str = str.toString().replace(rgxTrimRight, "");
        }
        return str;
    };
    /**
     * 对象深拷贝
     * 将src的属性复制到dest中（深度拷贝）
     * overlap是否覆盖到dest中 如果为false（默认未给实参）则创建一个新的对象 将dest和src合并到这个新对象里
     * @param dest 目标对象
     * @param src 源对象
     * @overlap 是否覆盖到dest目标对象中 若为否 则返回一个合并后的新对象
     * */
    var combine = function (dest, src, overlap) {
        if (!overlap)dest = combine({}, dest, true);
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                if (typeOf(src[key]) == 'object' && src[key] != null) {
                    if (typeof dest[key] == 'undefined' || dest[key] == null) {
                        if (typeOf(src[key]) == 'array') dest[key] = [];
                        else dest[key] = {};
                    }
                    combine(dest[key], src[key], true);
                }
                else dest[key] = src[key];
            }
        }
        return dest;
    };
    /**
     * 不解释的函数 用法跟jquery一样
     * */
    var each = function (obj, callback, args) {
        var iter, len = obj.length, realargs;
        if (len > 0) {
            for (iter = 0; i < len; i++) {
                realargs = args || [iter, obj[iter]];
                if (callback.apply(obj[iter], realargs) === false) {
                    break;
                }
            }
        }
        else {
            for (iter in obj) {
                realargs = args || [i, obj[i]];
                if (callback.apply(obj[i], realargs) === false) {
                    break;
                }
            }
        }
        realargs = null;
    }


    /*类型系统所有类的基类 目的是为了更有弹性的扩展，防止通过Object.prototype的扩展方法 污染所有对象*/
    var ObjectX = function () {

    };
    ObjectX._parent_ = null;
    /**
     * 在构造函数中 调用父类的构造函数，在非构造函数中【返回/调用】父类（所有祖先）中被本地【属性/方法】覆盖的【属性/方法】
     * @param 在构造函数中时 参数即传给其父类构造函数的参数
     * @param name 在非构造函数中时 指定 【返回/调用】的【属性/方法】名 如果name是个方法则name后面传入的参数是为调用该方法的实参。
     * @param 若不给任何参数 则返回该对象的父类
     * */
    ObjectX.prototype.$super = function (name) {
        var curClass = this.constructor, value;
        //初始化_constructor属性，_constructor相当于一个指针 一直当前构造器，
        //由于父类的构造函数中可能会继续使用super调用父类的父类构造函数。而调用父类构造函数是需要把子类的这个实例绑定到this的。
        //那么如果不用这个属性。父类中的super还是相当于子类调用的，通过不断移动这个_constructor指针（每调用一次super则将_constructor后移到其父类构造器），
        // 则能让该super方法得知当前处于哪个类的构造函数里。
        if (!this._constructor)this._constructor = curClass;
        //在非构造函数下使用的分支
        if (arguments.callee.caller != this._constructor) {
            name = name || "";
            if (name.length > 0) {
                while (true) {
                    this._constructor = this._constructor._parent_;
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
                return curClass._parent_;
            }
        }
        //在构造函数下使用的分支
        else {
            //获得父类构造器
            var superConstructor = this._constructor._parent_;
            //_constructor指针移到父类 保存当前的调用状态 使得父类构造函数中的super能正确获得其父类构造函数
            this._constructor = superConstructor;
            //执行父类构造函数（其中若父类构造函数依旧有super则构成了一个隐式的递归）
            if (superConstructor)superConstructor.apply(this, arguments);
            //删除这个_constructor指针，不留痕迹。
            delete this._constructor;
        }
    }

    /**
     * 获取父类 （类工厂使用）
     * */
    var getExtendClass = function (extend/*,packObj*/) {
        var parent = ObjectX;
        if (extend) {
            if (typeOf(extend) == 'function') {
                if (!extend._parent_) {
                    extend._parent_ = ObjectX;
                }
                parent = extend;
            }
            /*else if(typeof extend=='string'){
             parent=locClass(extend,packObj)||locClass(extend,window);
             if(parent==undefined) {
             throw new ReferenceError('class "'+extend+'" is not Found!');
             parent=ObjectX;
             }
             }*/
            else {
                throw new TypeError('"extend" must be a class( or function)');
            }
        }
        return parent;
    };
    /*
     * 解析类的各种描述符（类工厂使用）
     * 返回值：{
     *      ace:访问性描述符 取值为public[公共类 会映射到全局命名空间#默认#] private[私有类会以局部变量返回],
     *      mode:类模式 auto[普通类 #默认#] static[静态类 用于生成单例对象]
     *      prefix:类的命名空间前缀(尽量使用Package的命名空间前缀)
     *      className：类名
     *      body:类的代码体
     * }
     * */
    var resolveClassInfo = function (name, body) {
        var t = +new Date();
        var className, mod, ace, idx, modifiers, prefix;
        var modifierExp = /(public|private)* *(static|auto)*/;
        if (typeof name == 'string') {
            idx = name.lastIndexOf(' ');
            modifiers = name.substring(0, idx);
            className = name.substring(idx + 1);
            ace = modifierExp.exec(modifiers)[1] || 'public';
            mod = modifierExp.exec(modifiers)[2] || 'auto';
            idx = className.lastIndexOf('.');
            if (idx > 0) {
                prefix = className.substr(0, idx);
                className = className.substr(idx + 1);
            }
            body = body || {};
        }
        else if (typeOf(name) == 'object') {
            body = name;
            className = 'construct';
            ace = 'private';
            mod = 'auto';
        }
        else throw new Error('Class defination Error:must specify a object or string!');
        time[0] += (+new Date()) - t;
        return {
            ace: ace,
            mode: mod,
            prefix: prefix,
            className: className,
            body: body
        }
    };
    /**
     * 类工厂方法
     * @param name 完整类名（包含类描述符） 格式为 public|private static|auto pathname.ClassName
     *  完整类名包含四个部分
     *  *访问控制符（public|private）private代表私有类即不会根据命名空间名映射到全局命名空间中而是返回一个局部变量 public反之
     *  *类型描述符 auto|static 没有给出此字段的都默认为auto static则代表静态类。
     *      实际上是一个单例对象（而不再是一个函数）与简单对象的区别是 该静态类生成时，用户指定的构造函数会执行一次。
     *  *路径名。实际上这个是个命名空间前缀 不推荐在这使用 建议使用Package来规定命名空间 如果该Class是在Package内部创建的则该Class最终的命名空间是Package路径加上这里给出的路径
     *  类名默认为public auto 若未给出类名则该类必然为private类，且以construct作为构造函数
     * @param classBody 类的主体内容 为一个Object 包含类属性和类方法，
     * 其中构造函数是与类名（上述参数中提供）同名的函数。如果是未提供类名的类，则构造函数是名为'construct'的函数。
     * */
    var time = [0, 0, 0, 0, 0, 0, 0, 0];
    window.Class = function (name, classBody) {

        var classInfo = resolveClassInfo(name, classBody),

        /*Get pakageName(actually a object) of current env*/
            packObj = findPackObj() || window,
            key,
            newClass = classInfo.body[classInfo.className] || function () {
            };

        delete classInfo.body[classInfo.className];
        if (classInfo.mode == 'auto') {
            var parent = getExtendClass(classInfo.body.extend/*,packObj*/);
            newClass.prototype = new parent();
            newClass._parent_ = parent;
            newClass.prototype.constructor = newClass;
            delete classInfo.body.extend;
            for (key in classInfo.body) {
                newClass.prototype[key] = classInfo.body[key];
            }
            if (classInfo.body.hasOwnProperty('toString'))newClass.prototype.toString = classInfo.body.toString;
            if (classInfo.body.hasOwnProperty('valueOf'))newClass.prototype.valueOf = classInfo.body.valueOf;
        }
        else if (classInfo.mode == 'static') {
            var obj = new ObjectX();
            newClass.call(obj);
            for (key in classInfo.body) {
                obj[key] = classInfo.body[key];
            }
            newClass = obj;
        }
        else throw new Error('Class Error:Unsupported mode:"' + classInfo.mode + '"');

        if (classInfo.ace != 'private') {
            classInfo.prefix && (packObj = nameSpace(classInfo.prefix, false, packObj));
            packObj[classInfo.className] = newClass;
        }
        classInfo.body = null;
        classInfo = null;
        return newClass;
    };

    /*包依赖解析器 主要负责 解析Package所依赖的命名空间 包括动态加载依赖代码所在的js。
     最终将这些全局命名空间里的类和对象转换为局部变量声明 加入到Package 代码函数首部
     */


    window._scriptContextStack = [];
    var DOC = document, head = document.getElementsByTagName('head')[0];
    var isW3cEvent = document.dispatchEvent;
    /*动态加载js文件*/
    var loadScript = function (src) {
        var onload = isW3cEvent ? "onload" : "onreadystatechange",
            script = document.createElement('script');
        /* script[onload] = function () {
         if (isW3cEvent || /loaded|complete|undefine/i.test(this.readyState)) {
         loadRequires();
         }
         };*/
        script.async = true;
        script.defer = true;
        script.src = src;
        document.getElementsByTagName('head')[0].appendChild(script);
    };

    function getCurrentScript() {
        //取得正在解析的script节点
        if (DOC.currentScript) { //firefox 4+
            return DOC.currentScript.src;
        }
        var stack, e, nodes = head.getElementsByTagName("script"); //只在head标签中寻找
        //  参考 https://github.com/samyk/jiagra/blob/master/jiagra.js
        try {
            a.b.c(); //强制报错,以便捕获e.stack
        } catch (e) {
            stack = e.stack;
        }
        if (stack) {
            // chrome IE10使用 at, firefox opera 使用 @
            e = stack.indexOf(' at ') !== -1 ? ' at ' : '@';
            while (stack.indexOf(e) !== -1) {
                stack = stack.substring(stack.indexOf(e) + e.length);
            }
            return stack.replace(/:\d+:\d+$/ig, "");
        }
        for (i = 0; node = nodes[i++];) {
            if (node.readyState === "interactive") {
                return node.className = node.src;
            }
        }
    }

    /*预解析依赖项*/
    var preResove = function (requireInfo, code) {
        var key, name, path, to, ns, fullName,
            requires = [];
        for (key in requireInfo) {
            ns = key.split(':');
            path = ns[0].substring(0, ns[0].lastIndexOf('.'));
            name = ns[0].substring(ns[0].lastIndexOf('.') + 1);
            to = requireInfo[key];
            if (typeof to !== 'string')throw new TypeError('dependence mapper type error!');
            if (/^[a-zA-Z_$]+\w*(\.[a-zA-Z_$]+\w*)*(\.\*)?$/.test(ns[0]) === false) throw new SyntaxError('Unexpected package name:["' + ns[0] + '"]');
            if (to !== '*' && /^[a-zA-Z_$]+\w*$/.test(to) === false) throw new SyntaxError('Unexpected token ILLEGAL:[' + to + ']');
            fullName = name === '*' ? path : path + '.' + name;
            sbj = nameSpace(fullName, true);
            requires.push({path: path, name: name, fullName: fullName, src: ns[1], to: to});
        }
        console.log(getCurrentScript(), ':', window._scriptContextStack);
        window._scriptContextStack.push({requires: requires, idx: 0, code: code, localStr: ''});
    };

    /*构建局部变量字符串*/
    var buildLocals = function (info) {
        var k, locals = '';
        if (info.name === '*') {
            if (info.to === '*') {
                for (k in info.sbj) {
                    if (k === '_ns_')continue;
                    if (locals.length == 0)locals += 'var ';
                    else locals += ',';
                    locals += k + '=' + info.path + '.' + k;
                }
            }
            else {
                locals = 'var ' + info.to + '={};';
                for (k in info.sbj) {
                    if (k === '_ns_')continue;
                    if (locals.length != 0)locals += ',';
                    locals += info.to + '.' + k + '=' + info.path + '.' + k;
                }
            }
        }
        else {
            if (info.to === '*') {
                locals = 'var ' + info.name + '=' + info.path + '.' + info.name + ';';
            }
            else {
                locals = 'var ' + info.to + '=' + info.path + '.' + info.name + ';';
            }
        }
        locals += ';';
        return locals;
    };

    function loadRequires() {
        var info, sbj, pointer,
            curCtx = _scriptContextStack[_scriptContextStack.length - 1],
            len = curCtx.requires.length;
        for (pointer = curCtx.idx; pointer < len; pointer++) {
            info = curCtx.requires[pointer];
            sbj = nameSpace(info.fullName, true);
            if (!sbj) {
                if (info.src) {
                    loadScript(info.src, loadRequires);
                    break;
                }
            }
            else {
                info.sbj = sbj;
                curCtx.localStr += buildLocals(info);
                curCtx.idx++;
                info = null;
                curCtx.requires[pointer] = null;
            }
        }
        if (pointer == len) {
            packageExec(curCtx.code, curCtx.localStr);
            curCtx = null;
            _scriptContextStack.pop();
            if (_scriptContextStack.length > 0) {
                loadRequires();
            }

        }
        else return false;
    }


    /*对Package代码函数 重新编译加入导入的局部变量 最终执行*/
    var packageExec = function (code, locals) {
        var fstr, arglist, newCode;
        if (locals.length >= 0) {
            fstr = code.toString();
            arglist = /function[^\{]*\(([^\{]*)\)[^\{]*\{/.exec(fstr)[1];
            fstr = locals + fstr.substring(fstr.indexOf('{') + 1, fstr.length - 1);
            newCode = new Function(arglist, fstr);
            console.log(newCode.toString());
            window.xxx = fstr;
        }
        else newCode = code;
        newCode.packObj = code.packObj;
        // code = null;
        try {
            newCode(window, newCode.packObj, cube);

        } catch (e) {
            console.log(e.stack);
            var rs = /<anonymous>:(\d+):(\d+)\)/.exec(e.stack);
            console.log(e.stack.substring(0, e.stack.indexOf('\n') + 1) + '\tat Package "' + code.packName + '"(line:' + (+rs[1] - 1) + ',col:' + rs[2] + ')');
        }
    };
    /**
     * 包（模块）管理器
     * 本框架推荐的模块编写模式 即所有的代码写在Package里（其实是写在一个匿名函数中传递给Package方法）
     * Package方法会管理命名空间和依赖。能自动加载依赖的命名空间(不存在的话可以从js文件中加载)，并且能将命名空间中的类或对象局部化。
     * 参数顺序可以任意调换但类型不能变下述[]中是类型
     * @param name [string] 指定包的命名空间 要符合命名空间的规范即以.隔开的标示符
     * @param requires [object] 指定包的依赖，并导入。以键值对指定包的依赖和映射。{require:mapping}
     *          require的格式为 命名空间.具体对象|*<:路径>路径是为了指出找不到该命名空间时从哪个js文件中加载。
     *          可以使用*导入命名空间中所有对象和类。如com.gs.*即为倒出com.gs这个包下的所有对象和类
     *          mapping指定将导入的对象的映射规则 只能为一个字符串（标示符名）或* 字符串标示导入的类或对象全部绑定在这个字符串为名字的局部变量上
     *          *标示 还以导入的对象或类的名字创建局部变量（实际上是把包里的对象和类局部化）
     * @param code [function]包代码 包的所有代码都写在这个函数体 这个方法有两个参数供用户使用（用户自行命名）
     *          第一个是包的导出对象exports。除了使用Class创建的类。如果用户还想导出其他对象或函数。则绑定在这个参数上即可。
     *          第二个是xcube框架本身。你可以使用它调用xcube框架本身的API。
     * */
    window.Package = function (/*name,requires,code*/) {
        var name = '', requires, code, packObj;
        //获取参数
        for (var i = 0; i < 3; i++) {
            var a = arguments[i];
            switch (typeOf(a)) {
                case 'object':
                    requires = a || {};
                    break;
                case 'string':
                    name = a || '';
                    break;
                case 'function':
                    code = a;
            }
        }
        if (!code)throw new SyntaxError('Package must contain a function as its argument');
        if (name.length > 0 && /^[a-zA-Z_$]+\w*(\.[a-zA-Z_$]+\w*)*$/.test(name) === false) throw new SyntaxError('Unexpected package name:["' + name + '"]');
        packObj = nameSpace(name);
        code.packObj = packObj;
        code.packName = name;
        preResove(requires, code);
        loadRequires();
    };

    var cube = {
        typeOf: typeOf,
        getClass: function (name) {
            var classObj = locClass(name, window);
            return classObj && (classObj.hasOwnProperty('_parent_') ? classObj : undefined);
        },
        camelCase: camelCase,
        trim: trim,
        nameSpace: nameSpace,
        combine: combine,
        each: each
    };
    return cube;
}(window);

/*

console.timeEnd('resolve')
console.time('class');
var count = 100000;
for (var i = 0; i < count; i++) {
    Class({
        abc: function () {

        },
        ttt: function () {

        },
        bbb: function () {
        }
    });
}

console.timeEnd('class');
console.time('class2');
for (var i = 0; i < count; i++) {

    function abc() {
    }

    abc.prototype = {
        abc: function () {

        },
        ttt: function () {

        },
        bbb: function () {
        }
    };
}
console.timeEnd('class2');*/
