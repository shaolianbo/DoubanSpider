var context = require("./context")
var logger = context.mainlogger
var app = require("./applications")
var jq = require("jQuery").create()


function getMovieList(tag,callback){

    app.downLoad("movie.douban.com","/tag/"+tag,function(content){

        if(!content){
            logger.warn("tag %s content empty",tag)
            return callback()
        }

        var xml = content.toString()
        var $ = jq(xml)
        var result = $.find("div[id='content'] div[class='grid-16-8 clearfix'] div[class='article'] div:nth-child(3) table"+
        " tr[class='item'] td:nth-child(2) div[class='pl2'] a")
        var n = result.length;
        var i=0;
        var links=[]
        if(!n)
            return callback()
        result.each(function(index){
            var $ = jq(this);
            links.push($.attr("href").match(/\d+/g)[0])
            if(++i>=n)
                callback(links)
        })
    })
}

//app.downLoad("movie.douban.com","/tag/",function(content){
//
//    if(!content){
//        logger.warn("seed context empty")
//        return
//     }
//
//    var xml = content.toString()
//    var $ = jq(xml)
//    $.find("div[id='content'] div[class='grid-16-8 clearfix']"+
//        " div[class='article'] table.tagCol").first().find("tbody tr td a").each(function(index){
//           var $ = jq(this);
//           logger.debug($.text())
//        })
//})

getMovieList("爱情",function(links){
    console.log(links)
})
