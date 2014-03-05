var context = require("./context")
var app = require("./applications")
var logger = context.mainlogger
var async = require("async")

function spider(ip,controller){
	if(!(this instanceof spider )) return new spider(ip,controller)
	var configure = context.configure;
	this.redis_historySet =  configure.redis.historySet;
	this.redis_targetSet = configure.redis.targetSet;
	this.mongo_col = configure.mongodb.mongoCollection;
	this.mongoSourceCol = configure.mongodb.mongoSourceCol;
	this.erroStep = configure.spider.erroStep;
	this.erroMaxSleep = configure.spider.erroMaxSleep;
	this.sleepForEmpty = configure.spider.sleepForEmpty;
	this.redisClientSleepTime = 0;
	this.mongoClientSleepTime =0;
	this.webSleepTime = 0;
	this.state = 0;
	this.ip = ip;
	this.controller = controller;
    this.pagesCol;
	this.redisClient = context.getRedisClient();
}

spider.prototype.sleepForRedis = function(callback){
	this.redisClientSleepTime=
	(this.redisClientSleepTime+this.erroStep)>this.erroMaxSleep?
	this.erroMaxSleep:(this.redisClientSleepTime+this.erroStep);
	setTimeout(callback,this.redisClientSleepTime);
}
spider.prototype.sleepForMongo = function(callback){
	this.mongoClientSleepTime=
	(this.mongoClientSleepTime+this.erroStep)>this.erroMaxSleep?
	this.erroMaxSleep:(this.mongoClientSleepTime+this.erroStep);
	setTimeout(callback,this.mongoClientSleepTime);
}

spider.prototype.sleepForWeb = function(callback){
	this.webSleepTime = 
	(this.webSleepTime+this.erroStep)>this.erroMaxSleep?
	this.erroMaxSleep:(this.webSleepTime+this.erroStep);
	setTimeout(callback,this.webSleepTime);
}

spider.prototype.stop = function(){
	this.state = 0;
}

spider.prototype.start = function(){
    var self = this;
    context.getMongoDB(function(err,db){
        if(err){
            logger.error("analyser start getDB err %s",err.toString())
            return self.sleepForMongo(function(){ self.start()})
        }
        self.mongoClientSleepTime =0;
        self.pagesCol = db.collection(self.mongoSourceCol)
        self.state = 1;
        self.run()
    })
}

spider.prototype.run = function(){
	var self = this;
	var id
	var movie
	logger.debug("spider run begin")
	async.series([checkState,getId,isInHistory,downLoad,saveMongo,changeRedis],
		function(err,result){
			if(err==1){
				logger.debug("spider sleep "+self.sleepForEmpty+" for empty ")
				return  setTimeout(function(){self.run()},self.sleepForEmpty)
				}
			if(err == 3)	
				return process.nextTick(function(){self.run()})
			if(err == 5)
				return pushback(function(){ 
					self.sleepForWeb(function(){self.run()})}	)
			if(err == 7)
				return 
			return process.nextTick(function(){self.run()})
				
		})	
	
	function checkState(callback){
		if(this.state == 0)
			return callback(7)
		return callback()
	}

	function pushback(callback){
		self.redisClient.sadd(self.redis_targetSet,id,function(err,reply){
			if(err){
				logger.error("spider pushback err %s",err.toString())
				return self.sleepForRedis(function(){ pushback(callback)})
			}
			self.redisClientSleepTime = 0;
			callback()
		})
	}
	function getId(callback){
		self.redisClient.spop(self.redis_targetSet,function(err,reply){
			if(err){
				logger.error("spider getId %s",err.toString())
				return self.sleepForRedis(function(){ getId(callback)})
			}
			self.redisClientSleepTime=0;
			if(!reply){
				logger.warn("spider getId empty")
				return callback(1)     // sleep for empty
			}
			id = parseInt(reply)
			logger.debug("spider gitId get %d",id)
			callback()
		})
	}
	function isInHistory(callback){
		self.redisClient.sismember(self.redis_historySet,id,function(err,reply){
			if(err){
				logger.error("spider isInHistory %s",err.toString())
				return self.sleepForRedis(function(){isInHistory(callback)})
			}
			self.redisClientSleepTime=0
			if(reply){
				logger.info("spider isInHistory %d is old",id)
				return callback(3)           //go back again
			}
			logger.debug("spider isInHistory %d is not in history",id)
			return callback()
		})	
	}
	function downLoad(callback){
		app.downLoad("movie.douban.com","/subject/"+id+"/",self.ip,function(content,path,code){
			if(code == 404){
				logger.warn("spider downLoad %s 404",path)
				return callback(3)
			}
			if(code != 200 || !content){
				logger.warn("spider downLoad %s code:%d",path,code)
				return callback(5)   //pushback and go back immediately
			}
			self.webSleepTime = 0;
			logger.debug("spider downLoad %s ok",path)
			movie = content;
			self.controller.askForTocken(self.ip,function(){ callback() })
		}	)			
	}
	function saveMongo(callback){
			self.pagesCol.save({"_id":id,"page":movie},function(err,reply){
				if(err){
					logger.error("spider saveMongo save %d  err %s ",id,err.toString())
					return self.sleepForMongo(function(){saveMongo(callback)});
				}
				self.mongoClientSleepTime = 0;
				if(!reply){
					logger.warn("spider saveMongo save %d reply emtpy",id)
				}
				logger.debug("spider saveMongo save %d ok",id)
				callback()
			})
	}
	
	function changeRedis(callback){
		self.redisClient.sadd(self.redis_historySet,id,function(err,reply){
			if(err){
				logger.error("spider changeRedis err %s",err.toString())
				return self.sleepForRedis(function(){ changeRedis(callback)})
			}
			logger.debug("spider changeRedis %d ok",id)
			callback()
		})	
	}
}

exports.spider = spider

//var sp =new spider()
//sp.run()
