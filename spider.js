var context = require("./context")
var app = require("./applications")
var logger = context.mainlogger
var async = require("async")

function spider(){
	if(!(this instanceof spider )) return spider
	this.redis_historySet =  context.redis.historySet;
	this.redis_targetSet = context.redis.targetSet;
	this.mongo_col = context.mongodb.mongoCollection;
	this.erroStep = context.spider.erroStep;
	this.erroMaxSleep = context.spider.erroMaxSleep;
	this.sleepForEmpty = context.spider.sleepForEmpty:
	this.redisClientSleepTime = 0;
	this.mongoClientSleepTime =0;
	this.webSleepTime = 0
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

/*  errocode:
 *  	1 pushback + sleep n s for empty 
 *      2 pushback + sleep steps for redis
 *      3 goback
 *      4 pushback + sleep steps for mongos
 *      5 pushback + sleep steps for web
 *
 */
spider.prototype.run = function(){
	var self = this;
	var redisClient = context.getRedisClient();
	var id
	var movie

	async.series([getId,isInHistory,downLoadAndAnalyse,saveMongo,changeRedis],
		function(err,result){
			if(err==1)
				return pushback(function(){ 
					setTimeout(self.run,self.sleepForEmpty)	}	)
			if(err==2)
				return pushback(function(){ 
					self.sleepForRedis(self.run)}	)
			if(err == 3)	
				return process.nextTick(self.run)
			if(err == 4)
				return pushback(function(){ 
					self.sleepForMongo(self.run)}	)
			if(err == 5)
				return pushback(function(){ 
					self.sleepForWeb(self.run)}	)
			return process.nextTick(self.run)
				
		})	

	function pushback(callback){
		var self = this
		self.sadd(self.redis_targetSet,id,function(err,reply){
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
				return callback(2)
			}
			this.redisClientSleepTime=0;
			if(!reply){
				logger.warn("spider getId empty")
				return callback(1)
			}
			id = parseInt(reply)
			callback()
		})
	}
	function isInHistory(callback){
		redisClient.sismember(self.redis_historySet,id,function(err,reply){
			if(err){
				logger.error("spider isInHistory %s",err.toString())
				return callback(2)
			}
			this.redisClientSleepTime=0
			if(reply){
				logger.info("spider isInHistory %d is old",id)
				return callback(3)
			}
			return callback()
		})	
	}
	function downLoadAndAnalyse(callback){
		var self = this
		app.downLoad("movie.douban.com","/subject/"+id+"/",function(content,path,code){
			if(code == 404){
				logger.warn("spider downLoad %s 404",path)
				return callback(3)
			}
			if(code != 200 || !content){
				logger.warn("spider downLoad %s code:%d",path,code)
				return callback(5)
			}
			this.webSleepTime = 0;
			app.analyse(content,path,function(mv){
				if(!mv){
					logger.warn("spider analys %s failed",path)
					return callback(3)
				}
				movie = mv
				return callback()
			})		
		})			
	}
	function saveMongo(callback){
		var self = this;
		context.getMongoDB(function(err,db){
			if(err){
				logger.error("spider saveMongo getMongoDb error %s",err.toString())
				return callback(4);
			}
			var col = db.collection(self.mongo_col)	;
			col.save(movie,function(err,reply){
				if(err){
					logger.error("spider saveMongo save err %s ",err.toString())
					return callback(4)
				}
				self.mongoClientSleepTime = 0;
				if(!reply){
					logger.warn("spider saveMongo save reply emtpy")
					return callback(3)
				}
				callback()
			})
		})
	}
	function changeRedis(callback){
		var self = this;
		redisClient.sadd(self.redis_historySet,movie._id,function(err,reply){
			if(err){
				logger.error("spider history sadd err %s",err.toString())
				return callback(2)
			}
			var newids = movie.recommendations.map(function(value){return value.id})
			redisClient.sadd(self.redis_targetSet,newids,function(err,reply){
				if(err){
					logger.error("spider target sadd err %s",err.toString())
					return callback(2)
				}
				self.redisClientSleepTime = 0;
				callback()	
			})
		})
	}
}

/*
 * 1.get a id (no data:pushback+sleep1s  err:pushback+sleep steps   )
 * 2.whether is in history (err:pushback + sleep steps)
 * 3.downLoad (err:pushback+goback)
 * 4.analyse  (err:pushback+goback)
 * 5.insert into mongo (err:pushback+goback)
 * 6.add to histroy (err:pushbck+goback)
 * 7.add to target (err:goback)
 *
 */
