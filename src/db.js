var Mongos=require('mongodb').Mongos
var mongoDb=require('mongodb').Db                                                             
var mongoServer=require('mongodb').Server
var redis=require('redis')

function redisPool(size,redisPort,redisHost,max_delay,logger){

	if(!(this instanceof redisPool))
		return new redisPool(size,redisPort,redisHost,max_delay,logger)
	this.pool=[]
	this.length=size
	this.index=-1
	for(var i=0;i<size;i++){
		var redisClient=redis.createClient(redisPort,redisHost,{retry_max_delay:max_delay})
		redisClient.on('error',function(error){
			logger.warn('redis connect error, now we will reconnect')
		})
		redisClient.on('end',function(error){
			logger.warn('redis connect error, now we will reconnect if closed is not we invoke')
		})
		this.pool.push(redisClient)
	}
	this.get=function() {this.index=(this.index+1)%this.length;return this.pool[this.index]}
	logger.info("redisPool init over")
}

function createMongoClient(size,mongosConf,dbName,logger,callback){

	var servers=[]
	for(var i=0;i<mongosConf.length;i++){
		servers.push(new mongoServer(mongosConf[i][0],
		mongosConf[i][1],{auto_reconnect:true,'poolSize': size}))
	}
	var mongos = new Mongos(servers)
	var db=new mongoDb(dbName,mongos,{w:1})
	db.on("close",function(err){
		logger.error("mongos is closed %s",err) 
	})
	db.open(function(err,db){
		if(err)
			callback(err)
		else{
			callback(null,db)
		}}) 
}

exports.redisPool = redisPool;
exports.createMongoClient = createMongoClient;
