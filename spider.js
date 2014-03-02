var context = require("./context")
var app = require("./applications")
var logger = context.mainlogger
var async = require("async")

function spider(){
	if(!(this instanceof spider )) return spider
	var configure = context.configure;
	this.redis_historySet =  configure.redis.historySet;
	this.redis_targetSet = configure.redis.targetSet;
	this.mongo_col = configure.mongodb.mongoCollection;
	this.erroStep = configure.spider.erroStep;
	this.erroMaxSleep = configure.spider.erroMaxSleep;
	this.sleepForEmpty = configure.spider.sleepForEmpty;
	this.redisClientSleepTime = 0;
	this.mongoClientSleepTime =0;
	this.webSleepTime = 0;
	this.state = 0;
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
	this.state = 1;
	this.run()
}

/*  errocode:
 *  	1 sleep n s for empty 
 *      2 pushback + sleep steps for redis
 *      3 goback
 *      4 pushback + sleep steps for mongos
 *      5 pushback + sleep steps for web
 *      6 sleep steps for redis
 *      7 stop
 */
spider.prototype.run = function(){
	var self = this;
	var redisClient = context.getRedisClient();
	var id
	var movie
	logger.debug("spider run begin")
	async.series([getId,isInHistory,downLoadAndAnalyse,saveMongo,changeRedis],
		function(err,result){
			if(err==1){
				logger.debug("spider sleep "+self.sleepForEmpty+" for empty ")
				return  setTimeout(function(){self.run()},self.sleepForEmpty)
				}
			if(err==2)
				return pushback(function(){ 
					self.sleepForRedis(function(){self.run()})})
			if(err == 3)	
				return process.nextTick(function(){self.run()})
			if(err == 4)
				return pushback(function(){ 
					self.sleepForMongo(function(){self.run()})}	)
			if(err == 5)
				return pushback(function(){ 
					self.sleepForWeb(function(){self.run()})}	)
			if(err == 6)
				return self.sleepForRedis(function(){self.run()})
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
		redisClient.sadd(self.redis_targetSet,id,function(err,reply){
			if(err){
				logger.error("spider pushback err %s",err.toString())
				return self.sleepForRedis(function(){ pushback(callback)})
			}
			self.redisClientSleepTime = 0;
			callback()
		})
	}
	function getId(callback){
		redisClient.spop(self.redis_targetSet,function(err,reply){
			if(err){
				logger.error("spider getId %s",err.toString())
				return callback(6)
			}
			self.redisClientSleepTime=0;
			if(!reply){
				logger.warn("spider getId empty")
				return callback(1)
			}
			id = parseInt(reply)
			logger.debug("spider gitId get %d",id)
			callback()
		})
	}
	function isInHistory(callback){
		redisClient.sismember(self.redis_historySet,id,function(err,reply){
			if(err){
				logger.error("spider isInHistory %s",err.toString())
				return callback(2)
			}
			self.redisClientSleepTime=0
			if(reply){
				logger.info("spider isInHistory %d is old",id)
				return callback(3)
			}
			logger.debug("spider isInHistory %d is not in history",id)
			return callback()
		})	
	}
	function downLoadAndAnalyse(callback){
		app.downLoad("movie.douban.com","/subject/"+id+"/",function(content,path,code){
			if(code == 404){
				logger.warn("spider downLoad %s 404",path)
				return callback(3)
			}
			if(code != 200 || !content){
				logger.warn("spider downLoad %s code:%d",path,code)
				return callback(5)
			}
			self.webSleepTime = 0;
			logger.debug("spider downLoad %s ok",path)
			app.analyse(content,path,function(mv){
				if(!mv){
					logger.warn("spider analys %s failed",path)
					return callback(3)
				}
				movie = mv
				logger.debug("spider analyse %s ok",path)
				return callback()
			})		
		}	)			
	}
	function saveMongo(callback){
		context.getMongoDB(function(err,db){
			if(err){
				logger.error("spider saveMongo getMongoDb error %s",err.toString())
				return callback(4);
			}
			var col = db.collection(self.mongo_col)	;
			col.save(movie,function(err,reply){
				if(err){
					logger.error("spider saveMongo save %d  err %s ",id,err.toString())
					return callback(4)
				}
				self.mongoClientSleepTime = 0;
				if(!reply){
					logger.warn("spider saveMongo save %d reply emtpy",id)
					return callback(3)
				}
				logger.debug("spider saveMongo save %d ok",id)
				callback()
			})
		})
	}
	function changeRedis(callback){
		redisClient.sadd(self.redis_historySet,movie._id,function(err,reply){
			if(err){
				logger.error("spider history sadd err %s",err.toString())
				return callback(2)
			}
			logger.debug("spider addToHistory %d ok",id)
			var newids = movie.recommendations.map(function(value){return value.id})
			redisClient.sadd(self.redis_targetSet,newids,function(err,reply){
				if(err){
					logger.error("spider target sadd err %s",err.toString())
					return callback(2)
				}
				self.redisClientSleepTime = 0;
				logger.debug("spider addToTarget %d,%s,ok",id,newids.toString())
				callback()	
			})
		})
	}
}

/*
 * 1.get a id (no data:sleep1s  err:sleep steps   )
 * 2.whether is in history (err:pushback + sleep steps)
 * 3.downLoad (err:pushback+goback)
 * 4.analyse  (err:pushback+goback)
 * 5.insert into mongo (err:pushback+goback)
 * 6.add to histroy (err:pushbck+goback)
 * 7.add to target (err:goback)
 *
 */
exports.spider = spider

//var sp =new spider()
//sp.run()
