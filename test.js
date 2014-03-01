var app = require("./applications")
var http = require("http")

var id = process.argv[2]

app.downLoad("movie.douban.com","/subject/"+id+"/",http.globalAgent,function(content){

    app.analyse(content,function(movie){
        
        console.log(JSON.stringify(movie))
    })
})


