var spider = require("./spider").spider
var context = require("./context")
var logger = context.mainlogger
var fs = require("fs")

function runShell(workerObj){
	this.objs = []
	this.worker = workerObj
}

runShell.prototype.add = function(n){
	var self = this;
	for(var i=0;i<n;i++){
		var obj = new self.worker();
		self.objs.push(obj)
		obj.start()
	}
	logger.info("starter add %d spider",n)
}

runShell.prototype.length = function(){
	return this.objs.length
}

runShell.prototype.pop = function(n){
	var self = this;
	for(var i=0;i<n;i++){
		var obj = self.objs.pop()
		if(obj){
			obj.stop()
		}
	}
	logger.info("starter pop %d spider",n)
}
function startMonitor(shell){
	setInterval(function(){
			var content = fs.readFileSync("./configure.json",{encoding:"utf8"})
			var configure = JSON.parse(content)
			var len = shell.length()
			if(configure.control.spiderCountPerPro > len)
				shell.add(configure.control.spiderCountPerPro-len)
			else if(configure.control.spiderCountPerPro<len)
					shell.pop(len - configure.control.spiderCountPerPro)
			},1000)
}

var shell = new runShell(spider)
shell.add(context.configure.control.spiderCountPerPro)
startMonitor(shell)
