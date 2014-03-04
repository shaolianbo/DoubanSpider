var spider = require("./spider").spider
var context = require("./context")
var logger = context.mainlogger
var fs = require("fs")
var runShell = context.runShell
var speedController = require("./speedControl")

function startMonitor(shell){
	function monitor(){
			var content = fs.readFileSync("../configure.json",{encoding:"utf8"})
			var control = (JSON.parse(content)).control
			var len = shell.length()
			if(control.spiderCount > len){
				for(var i=0;i<(control.spiderCount-len);i++)
					shell.add(new spider(interfaces[shell.length%interfaces.length],
								speedController))
			}
			else if(control.spiderCount<len)
					shell.pop(len - control.spiderCount)
			if(control.visitCountPerMinPerIf != speedController.getCount())	
				speedController.reset(control.visitCountPerMinPerIf,60*1000)
			setTimeout(monitor,5000);
			}
	setTimeout(monitor,5000);
}

try{
	var controlConf = context.configure.control
	var interfaces = controlConf.interfaces;
	var speedController = new speedControl(interfaces,controlConf.visitCountPerMinPerIf,
					60*1000)
	var spiders=[]
	for(var i=0;i<controlConf.spiderCount;i++)
		spiders.push(new spider(interfaces[i%interfaces.length],speedController))	
	var shell = new runShell()
	shell.add(spiders)
	startMonitor(shell)
}
catch(err){
	logger.error("worker spiders  error %s",err.stack)
	process.exit(1)
}

