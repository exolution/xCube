/**
 * Created by godsong on 15-2-3.
 */
var fs=require('fs');
var parser=require('./XParser.js');


console.time('read source');
var buffer=fs.readFileSync('./mass2.html');
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
dom1=JSON.parse(buffer.toString());
console.timeEnd('parse from tpl');
console.time('render');
var result='';
var ctx=new parser.Context();
parser.Context.model={
    countryInfo:{
        cn_name: "法国",
        en_name: "France",
        fullname: "",
        pinyin: "",
        description: "",
        currency_code: "EUR",
        is_hot: "1",
        link_url: "/France",
        country_image: {
            country_code: "FR",
            cover_url: "http://hitour.qiniudn.com/4ee54d1364396d08ef05010eee9c5288.jpg",
            mobile_url: ""
        }
    },
    cityList:{
        cities: [
            {
                country_code: "FR",
                city_code: "AVN",
                cn_name: "阿维尼翁",
                en_name: "Avignon",
                pinyin: "a wei ni wong",
                has_product: "1",
                has_online_product: "1",
                link_url: "/France/Avignon",
                link_url_m: "/mobile#/city/AVN",
                city_name: "Avignon",
                country_name: "France",
                country_cn_name: "法国",
                city_image: {
                    city_code: "AVN",
                    banner_image_url: "http://hitour.qiniudn.com/c80a6632b5225832985520be2d69eae6.jpg",
                    grid_image_url: "http://hitour.qiniudn.com/c70d79c841687c8f09ad7f3bf38b5324.JPG",
                    app_image_url: "",
                    app_strip_image_url: ""
                }
            },
            {
                country_code: "FR",
                city_code: "PAR",
                cn_name: "巴黎",
                en_name: "Paris",
                pinyin: "ba li",
                has_product: "1",
                has_online_product: "1",
                link_url: "/France/Paris",
                link_url_m: "/mobile#/city/PAR",
                city_name: "Paris",
                country_name: "France",
                country_cn_name: "法国",
                city_image: {
                    city_code: "PAR",
                    banner_image_url: "http://hitour.qiniudn.com/d72e26bf54a98f5c9fe23c6fd461c0c3.jpg",
                    grid_image_url: "http://hitour.qiniudn.com/a373cea4f478a3df02c11f26fb9517bd.jpg",
                    app_image_url: "",
                    app_strip_image_url: ""
                }
            },
            {
                country_code: "FR",
                city_code: "DISN",
                cn_name: "巴黎-迪士尼",
                en_name: "Paris-Disneyland",
                pinyin: "Bali Dishini",
                has_product: "1",
                has_online_product: "1",
                link_url: "/France/Paris-Disneyland",
                link_url_m: "/mobile#/city/DISN",
                city_name: "Paris-Disneyland",
                country_name: "France",
                country_cn_name: "法国",
                city_image: {
                    city_code: "DISN",
                    banner_image_url: "http://hitour.qiniudn.com/9bd178ff0ab4344d32e0da42aa92d957.jpg",
                    grid_image_url: "http://hitour.qiniudn.com/a927a6f047e2ee3547f9b571a4f08d46.jpg",
                    app_image_url: "",
                    app_strip_image_url: ""
                }
            },
            {
                country_code: "FR",
                city_code: "LYN",
                cn_name: "里昂",
                en_name: "Lyon",
                pinyin: "li ang",
                has_product: "1",
                has_online_product: "1",
                link_url: "/France/Lyon",
                link_url_m: "/mobile#/city/LYN",
                city_name: "Lyon",
                country_name: "France",
                country_cn_name: "法国",
                city_image: {
                    city_code: "LYN",
                    banner_image_url: "http://hitour.qiniudn.com/d277028ebd7181d9be818929b35c5d32.png",
                    grid_image_url: "http://hitour.qiniudn.com/537eb2279929f26b099c75c1f57d784e.jpg",
                    app_image_url: "",
                    app_strip_image_url: ""
                }
            },
            {
                country_code: "FR",
                city_code: "MRS",
                cn_name: "马赛",
                en_name: "Marseille",
                pinyin: "ma sai",
                has_product: "1",
                has_online_product: "1",
                link_url: "/France/Marseille",
                link_url_m: "/mobile#/city/MRS",
                city_name: "Marseille",
                country_name: "France",
                country_cn_name: "法国",
                city_image: {
                    city_code: "MRS",
                    banner_image_url: "http://hitour.qiniudn.com/402143ebdd6a8fb33ff0b5af7344e15e.png",
                    grid_image_url: "http://hitour.qiniudn.com/5f088aea7cbef91472e512bc446fd7a6.jpg",
                    app_image_url: "",
                    app_strip_image_url: ""
                }
            },
            {
                country_code: "FR",
                city_code: "NCE",
                cn_name: "尼斯",
                en_name: "Nice",
                pinyin: "ni si",
                has_product: "1",
                has_online_product: "1",
                link_url: "/France/Nice",
                link_url_m: "/mobile#/city/NCE",
                city_name: "Nice",
                country_name: "France",
                country_cn_name: "法国",
                city_image: {
                    city_code: "NCE",
                    banner_image_url: "http://hitour.qiniudn.com/2bf2fbb5f9a96b4eaf984d6c6fe64f49.jpg",
                    grid_image_url: "http://hitour.qiniudn.com/34c786aa8c358a36c5c20718a93cdbab.jpg",
                    app_image_url: "",
                    app_strip_image_url: ""
                }
            }
        ]
    },
    groupList:{
        city_groups: [ ]
    }
}
dom.forEach(function(e){
    result+= parser._render(e,ctx);
});
console.timeEnd('render');

console.time('render write');
fs.writeFileSync('xx.html',result);
console.timeEnd('render write');