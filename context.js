var log4js=require("log4js")
log4js.configure("./log4jsConf.json")
var globalAgent=require("http").globalAgent

exports.mainlogger=log4js.getLogger("mainlogger")

globalAgent.maxSockets=10
exports.globalAgent = globalAgent;
