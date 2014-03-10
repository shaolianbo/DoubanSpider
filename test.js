var http = require("http")

var req = http.request({
    host:"www.douban.com",
    path:"/subject/3077742/",
    method:"GET",
    localAddress:"172.16.195.146",
    headers:{                                                                                                                    
        "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36",
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding":"gzip,deflate,sdch",
        "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6",
        "Cache-Control":"max-age=0"
    }
    
},function(res){
    console.log(res.headers["Set-Cookie"])
    console.log(res.socket.address())
})

req.end()
