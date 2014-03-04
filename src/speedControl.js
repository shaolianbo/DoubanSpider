
function controler(iplists,count,intervalTime){

    if(!(this instanceof controler)) return new controler(iplists,count,intervalTime)
    this.count = count;
    this.intervalTime = intervalTime;
    this.body = {}

    for(var i=0;i<iplists.length;i++){
        this.body[iplists[i]] = {
            left: count,
            readers:[]
        }
    }
    
    this.restart()
}
controler.prototype.reset = function(count,intervalTime){
	this.count = count;
	this.intervalTime = intervalTime;
}

controler.prototype.getCount = function(){
	return this.count
}

controler.prototype.restart = function (){
    var self = this;
    var body = self.body;
    for(var ip in body){
        body[ip].left =  self.count;
        while(body[ip].left){
            var callback = body[ip].readers.shift()
            if(callback){
                body[ip].left--;
                callback();
                }
            else
                break;
        }
    }
    setTimeout(function(){
        self.restart();
    },self.intervalTime)
}

controler.prototype.askForTocken = function (ip,callback){
    
   var self = this;
   if(!(ip in self.body)){
        throw ip+" can not be control"
        return
   }

   if(self.body[ip].left>0){
        self.body[ip].left--;
        callback()
   }else{
        self.body[ip].readers.push(callback)
   }
}

module.exports = controler

/* ===========test=============
var cont = controler(["123","456"],5,1000)

function fucker(ip){
    this.ip = ip;
    this.run = function(){
        var self = this;
        cont.askForTocken(self.ip,function(){
            console.log("%s got a tocken %s",self.ip,(new Date()).toString())
            setTimeout(function(){
                self.run()
            },250) 
        })
    }
}

var fucker1 = new fucker("123")
var fucker2 = new fucker("123")
var fucker3 = new fucker("456")
fucker1.run()
fucker2.run()
fucker3.run()
*/
