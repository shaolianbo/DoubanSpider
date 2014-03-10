var context = require("./context")
var app = require("./applications")
var logger = context.mainlogger
var async = require("async")

function analyser(){
	if(!(this instanceof analyser )) return  new analyser();
	var configure             = context.configure;
	this.redis_historySet     = configure.redis.historySet;
	this.redis_targetSet      = configure.redis.targetSet;
	this.mongo_col            = configure.mongodb.mongoCollection;
	this.mongoSourceCol       = configure.mongodb.mongoSourceCol;
	this.erroStep             = configure.analyser.erroStep;
	this.erroMaxSleep         = configure.analyser.erroMaxSleep;
	this.sleepForEmpty        = configure.analyser.sleepForEmpty;
	this.redisClientSleepTime = 0;
	this.mongoClientSleepTime = 0;
	this.webSleepTime         = 0;
	this.state                = 0;
    this.pagesCol;
    this.movieCol;
	this.redisClient = context.getRedisClient();
}

analyser.prototype.sleepForRedis = function(callback){
	this.redisClientSleepTime=
	(this.redisClientSleepTime+this.erroStep)>this.erroMaxSleep?
	this.erroMaxSleep:(this.redisClientSleepTime+this.erroStep);
	setTimeout(callback,this.redisClientSleepTime);
}
analyser.prototype.sleepForMongo = function(callback){
	this.mongoClientSleepTime=
	(this.mongoClientSleepTime+this.erroStep)>this.erroMaxSleep?
	this.erroMaxSleep:(this.mongoClientSleepTime+this.erroStep);
	setTimeout(callback,this.mongoClientSleepTime);
}

analyser.prototype.sleepForWeb = function(callback){
	this.webSleepTime = 
	(this.webSleepTime+this.erroStep)>this.erroMaxSleep?
	this.erroMaxSleep:(this.webSleepTime+this.erroStep);
	setTimeout(callback,this.webSleepTime);
}

analyser.prototype.stop = function(){
	this.state = 0;
}

analyser.prototype.start = function(){
    var self = this;
    context.getMongoDB(function(err,db){
        if(err){
            logger.error("analyser start getDB err %s",err.toString())
            return self.sleepForMongo(function(){ self.start()})
        }
        self.mongoClientSleepTime =0;
        self.pagesCol = db.collection(self.mongoSourceCol)
        self.movieCol = db.collection(self.mongo_col)
        self.state = 1;
        self.run()
    })
}


/*  1. getPage : err:block , empty: sleep n s for emtpy
 *  2. analyse: err: delete 
 *  3. changeMongo:  addErr:add block , delErr:go on
 *  4. changeRedis:  err:blok
 *  erroCode:
 *  	1.sleep n s for empty
 *  	2. got to run again after del mongo
 *      7. stop
 */
analyser.prototype.run = function(){
	var self = this;
	var id
	var movie
	var mydb
	logger.debug("analyser run begin")
	async.series([checkState,getPage,Analyse,changeMongo,changeRedis],
		function(err,result){
			if(err==1){
				logger.debug("analyser sleep "+self.sleepForEmpty+" for empty ")
				return  setTimeout(function(){self.run()},self.sleepForEmpty)
				}
			if(err == 7)
				return 
			if(err ==2){
				self.pagesCol.remove({"_id":id},function(err,num){
					logger.debug("analyser saveMongo del %d",id)
					process.nextTick(function(){self.run()})
				})
			}
			return process.nextTick(function(){self.run()})
				
		})	
	
	function checkState(callback){
		if(this.state == 0)
			return callback(7)
		return callback()
	}
  
    function getPage(callback){
        logger.debug("analyser getPage start")	
        self.pagesCol.findOne({},function(err,page){
            if(err){
                logger.error("analyser getPage findOne err %s",err.toString())
                return self.sleepForMongo(function(){ getPage(callback)})
            }
            self.mongoClientSleepTime =0 ;
            if(!page)
                return callback(1); 
            id = page._id;
            movie = page.page;
            logger.debug("analyser getPage %d ok",id)
            callback()
        })
    }
	function Analyse(callback){
		app.analyse(movie,"/subject/"+id,function(mv){
			if(!mv){
				logger.warn("analyser analys %s failed",path)
				return callback(2)
			}
			movie = mv
			logger.debug("analyser analyse %d ok",id)
			return callback()
		})		
	}
	function changeMongo(callback){
			self.movieCol.save(movie,function(err,reply){
				if(err){
					logger.error("analyser saveMongo save %d  err %s ",id,err.toString())
					return self.sleepForMongo(function(){ changeMongo(callback )})
				}
				self.mongoClientSleepTime = 0;
				if(!reply){
					logger.warn("analyser saveMongo save %d reply emtpy",id)
				}
				logger.debug("analyser saveMongo save %d ok",id)
				self.movieCol.remove({"_id":id},function(err,num){
					logger.debug("analyser saveMongo del %d",id)
					callback()
				})
			})
	}
	function changeRedis(callback){
			var newids = movie.recommendations.map(function(value){return value.id})
			self.redisClient.sadd(self.redis_targetSet,newids,function(err,reply){
				if(err){
					logger.error("analyser target sadd err %s",err.toString())
					return self.sleepForRedis(function(){ changeRedis(callback)})
				}
				self.redisClientSleepTime = 0;
				logger.debug("analyser addToTarget %d,%s,ok",id,newids.toString())
				callback()	
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
exports.analyser = analyser

