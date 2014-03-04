var context = require("./context")
var logger = context.seedLogger
var app = require("./applications")
var jq = require("jQuery").create()

/*get the movei id list acording the tag*/
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
			links.push(parseInt($.attr("href").match(/\d+/g)[0]))
			if(++i==n)
				callback(links)
		})
	})
}

function addSeedFromTag(){
	app.downLoad("movie.douban.com","/tag/",function(content){

		if(!content){
			logger.warn("seed context empty")
			return
		}
		var xml = content.toString()
		var $ = jq(xml)
		$.find("div[id='content'] div[class='grid-16-8 clearfix']"+
		" div[class='article'] table.tagCol")
	.first().find("tbody tr td a").each(function(index){
		var $ = jq(this);
		var redisClient = context.getRedisClient();
		getMovieList($.text(),function(links){
			if(!links || !links.length){
				logger.warn("getMoveiList from %s get empty",$.text())
				return 
			}
			redisClient.sadd(context.configure.redis.targetSet,links,function(err,reply){
				if(err){
					logger.error("addSeed to redis failed %s",err.toString())
					return
				}
				if(!reply){
					logger.error("addSeed to redis reply empty")
					return
				}
				logger.info("addSeed to redis ok %s",links.toString())
				return
			})
		})
	})
	})
}

exports.addSeed = function(){
	addSeedFromTag()
}

try{
	exports.addSeed()
}catch(err){
	console.log("addSeed erro %s",err.stack)
	logger.error("addSeed erro %s",err.stack)
}
