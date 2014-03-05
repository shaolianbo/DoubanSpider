var analyser = require("./pageAnalyse").analyser
var context = require("./context")
var logger = context.mainlogger
var fs = require("fs")
var runShell = context.runShell

function startMonitor(shell){
	function monitor(){
			var content = fs.readFileSync("../configure.json",{encoding:"utf8"})
			var control = (JSON.parse(content)).control
			var len = shell.length()
			if(control.analyserCountPerPro > len){
				for(var i=0;i<(control.analyserCountPerPro-len);i++)
					shell.add(new analyser())
			}
			else if(control.analyserCountPerPro<len)
					shell.pop(len - control.analyserCountPerPro)
			setTimeout(monitor,5000);
			}
	setTimeout(monitor,5000);
}

try{
	var controlConf = context.configure.control
	var shell = new runShell()
	for(var i=0;i<controlConf.analyserCountPerPro;i++)
		shell.add(new analyser())
	startMonitor(shell)
}
catch(err){
	logger.error("workers Analyse error %s",err.stack)
	process.exit(1)
}

