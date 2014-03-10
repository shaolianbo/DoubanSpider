var http=require("http")
var jq = require("jQuery").create()
var context = require("./context")
var logger = context.mainlogger

/* 
* download web page from host/path
* @param host
* @param path
* @param agent : http agent
* @param callback: 
* 	function(content,path,code){...}  content is buffer,path pref the web address
*/
exports.downLoad = function(host,path,interface,callback){

	if(typeof(interface)=="function"){
		callback = interface
		interface = ""
	}
	var option={
		hostname     : host,
		path         : path,
		method       : "GET",
		headers      : {
		"User-Agent" : "Mozilla/5.0"
		},
		agent        : context.globalAgent
	}
	if(interface)
		option.localAddress=interface;
	//	try{
		var req = http.request(option,function(res){

			if(res.statusCode !=200){
				logger.warn("downLoad %s%s response return code : %d",host,path,res.statusCode)
				callback("",path,res.statusCode)
				req.abort()
				return
			}
			logger.trace("downLoad %s%s response return code : %d",host,path,res.statusCode)
			var source=new Buffer("")
			res.on("data",function(chunk){
				source+=chunk
			})
			res.on("end",function(){
				callback(source,host+path,res.statusCode)
			})
		})

		req.setTimeout(60000,function(){

			logger.warn("downLoad %s%s request timeout",host,path)
			req.abort()
			callback("",path,0)
		})

		req.on("error",function(e){

			logger.error("downLoad %s%s request error: %s",host,path,JSON.stringify(e))
			callback("",path,1)
		})

		req.end()
		//	}
		//	catch(err){
			//		logger.error("downLoad %s%s unknown error %s",host,path,err.toString())
			//		callback("",path,2)
			//	}
}

/*    
*    analyse content to get struct data
*    @param content : web page context, buffer type
*    @param callback: function(movie){..}
*    
*    movie: {
*      id: 12345,
*      title:"...",
*      time:"...",
*      baseInfo:{
*          "导演"：[...],
*          "类型"：[...],
*          ...
*      },
*      scoreInfo:{
*          "score":80.1,
*          "people":12345,
*          "percent":["30%","40%"，"30%","0%","0%"]
*      },
*      intro: "...",
*      recommendations:[
*          {id:123456,title:"..."},
*          ...
*      ]
*    }
*
*/
exports.analyse = function (content,path,callback){

	if(!content){
		return callback()
	}

	var movie={}
	movie["_id"] = parseInt(path.match(/\d+/g)[0])
	var xml = content.toString();
	var $ = jq(xml);
	try{
		movie.title = $.find("div#content h1 span:nth-child(1)").text();
		movie.time = $.find("div#content h1 span:nth-child(2)").text().match(/\d+/g)[0];
		movie.time = parseInt(movie.time)
	}catch(err){
		logger.error("analys %s error: %s",path,err.stack)
	}

	try{
		var infoXml = $.find("div#info");
		var info =infoXml.text().trim();
		info = info.split("\n");
		var baseInfo={};
		for(var i=0;i<info.length;i++){
			var line = info[i].trim()
			if(!line)
				continue;
			var item=line.split(":",2);
			if(!item || item.length!=2)
				continue;
			baseInfo[item[0].trim()] = item[1].split("/").map(function(value){return value.trim()});
		}
		movie["baseInfo"]=baseInfo;
	}catch(err){
		logger.error("analys %s error: %s",path,err.stack)
	}

	try{
		var score = $.find("div#interest_sectl div[class='rating_wrap clearbox']").text();
		score = score.trim()
		score = score.split("\n").map(function(value){return value.trim()}).filter(function(value){return value})
		var scoreInfo={};
		scoreInfo["score"]=parseFloat(score[0]);
		scoreInfo["people"]=parseInt(score[1].match(/\d+/g));
		scoreInfo["percent"]=score.slice(2);
		movie["scoreInfo"]=scoreInfo;
	}catch(err){
		logger.error("analys %s error: %s",path,err.stack)
	}

	try{
		movie["intro"] = $.find("div[id='link-report'][class='indent'] span[property='v:summary']").text().trim();
	}catch(err){
		logger.error("analys %s error: %s",path,err.stack)
	}

	try{	
		movie["recommendations"]=[];
		var result =  $.find("div[id='recommendations'] div[class='recommendations-bd'] dl dd a")
		var n = result.length;
		var i=0;
		if(!n)
			return callback(movie);
		result.each(function(element){
			var $=jq(this);
			var recommond={};
			recommond["title"]=$.text();
			recommond["id"]=parseInt($.attr("href").match(/\d+/g)[0]);
			movie.recommendations.push(recommond);
			if(++i==n)
				return callback(movie)
		})
	}
	catch(err){
		logger.error("analys %s error: %s",path,err.stack)
	}
}
