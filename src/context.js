var log4js=require("log4js")
log4js.configure("../log4jsStatic.json")
var globalAgent=require("http").globalAgent
var configure = require("../configure.json")
var dbContext = require("./db")

exports.mainlogger=log4js.getLogger("spiderLogger")
exports.seedLogger = log4js.getLogger("seedLogger")

globalAgent.maxSockets=10
exports.globalAgent = globalAgent;

var redisPool
exports.getRedisClient = function(){
	if(!redisPool)
		redisPool = new dbContext.redisPool(configure.redis.redisPoolSize,
		configure.redis.redisPort,configure.redis.redisHost,
		configure.redis.redis_max_delay,exports.mainlogger)
	return redisPool.get()
}
var mongodb
exports.getMongoDB = function(callback){
    if(mongodb)
        return callback(null,mongodb)
	dbContext.createMongoClient(configure.mongodb.poolSize,configure.mongodb.mongos,
	configure.mongodb.mongodbName,exports.mainlogger,function(err,db){
        if(db)
            mongodb = db
        callback(err,mongodb)
    })
}

exports.closeMongodb = function(){
    if(mongodb)
        mongodb.close()
}

exports.configure = configure


function runShell(){
	if(!(this instanceof runShell)) return new runShell()
	this.objs = []
}
runShell.prototype.add = function(workers){
	var self = this;
	if(workers instanceof Array){
		for(var i=0;i<workers.length;i++){
			self.objs.push(workers[i])
			workers[i].start()
		}
	}else{
		self.objs.push(workers)
		workers.start()	
	}
}
runShell.prototype.length = function(){
	return this.objs.length
}
runShell.prototype.pop = function(n){
	var self = this;
	for(var i=0;i<n;i++){
		var obj = self.objs.shift()
		if(obj){
			obj.stop()
		}
	}
}

exports.runShell = runShell
