//var app = require("./applications")
//var http = require("http")
//var logger = require("./context").mainlogger
//
//var id = process.argv[2]
//
//app.downLoad("movie.douban.com","/subject/"+id+"/",function(content,path,code){
//			if(code == 404){
//				logger.warn("spider downLoad %s 404",path)
//				return 
//			}
//			if(code != 200 || !content){
//				logger.warn("spider downLoad %s code:%d",path,code)
//				return 
//			}
//			logger.debug("spider downLoad %s ok",path)
//			app.analyse(content,path,function(mv){
//				if(!mv){
//					logger.warn("spider analys %s failed",path)
//					return 
//				}
//				var movie = mv
//				logger.debug("spider analyse %s ok %s",path,JSON.stringify(movie))
//				return 
//			})		

//    app.analyse(content,path,function(movie){
//		console.log("test................")	        
//        console.log(JSON.stringify(movie))
//    })
//})
//
//setInterval(function(){console.log((new Date()))},1000)


var context = require("./context")
//function test(col){
//        col.findOne({},function(err,page){
//            console.log("callback %s %s",(new Date()).toString(),err)
//            setTimeout(function(){},350)
//        })
//}

function test(col){
    col.findOne({},function(err,page){
        console.log("callback %s %s",(new Date()).toString(),err)
        setTimeout(function(){test(col)},350)
    })
}

context.getMongoDB(function(err,db){
    var col = db.collection("pages")
    test(col)
})

