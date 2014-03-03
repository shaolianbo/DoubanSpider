var log4js=require("log4js")
log4js.configure("../log4jsConf.json")
var globalAgent=require("http").globalAgent
var configure = require("../configure.json")
var dbContext = require("./db")

exports.mainlogger=log4js.getLogger("mainlogger")

globalAgent.maxSockets=10
exports.globalAgent = globalAgent;

var redisPool
var mongoDB
exports.getRedisClient = function(){
	if(!redisPool)
		redisPool = new dbContext.redisPool(configure.redis.redisPoolSize,
		configure.redis.redisPort,configure.redis.redisHost,
		configure.redis.redis_max_delay,exports.mainlogger)
	return redisPool.get()
}
exports.getMongoDB = function(callback){
	if(mongoDB)
		return callback(null,mongoDB);
	dbContext.createMongoClient(configure.mongodb.poolSize,configure.mongodb.mongos,
	configure.mongodb.mongodbName,exports.mainlogger,callback)
}

exports.configure = configure
