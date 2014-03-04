DoubanSpider
============
目的：
  抓取所有电影信息

运行方法：
  
  1. npm install
  2. 配置
  3. sh spider.sh seed      #抓取种子网址
     sh spider.sh spider    #开启爬虫   ，此处启动，依赖forever
     sh spider.sh analyse   #开启网页分析
     
数据库配置：
  
  两个mongo db，一个用来暂时存储抓取的网页，一个用来存储结构话数据。
  两个redis  set， 一个用来存储待抓取电影编号，一个存储所有抓取过的电影编号。
  
爬虫策略：
  
  抓取数据与分析数据分开。
    抓取时，从redis_target 中取得电影编号，验证是否在redis_history中，如果未曾抓取，则downLoad
  把抓取的网页写入mongodb。 为了解决403问题，可在机器上配置多块网卡，通过配置文件进行配置，另外可配置每块网卡每分钟抓取次数。
  由于抓取程序的瓶颈在io,所以以单进程运行，但可以配置进程中请求并发数。
    网页分析进程用于形成结构化数据和产生新的待抓取网址，计算亮较大，采用master-slaver，主从多进程模式。
    
另：
  爬虫运行参数，热配置，包括爬虫的并发数、抓取频率、子进程数。即 configure.json中control 的子属性。
  
目录结构：

  src/applications.js  核心功能函数 下载和分析
  src/context.js       上下文，包括日志和数据库配置
  src/db.js            mongo redis的驱动调用
  src/index.js         analyse父进程
  src/pageAnalyse.js   网页分析类
  src/seed.js          种子抓取脚本
  src/speedControl.js  抓取平率控制类
  src/spider.js        爬虫策略
  src/startAnalyse.js  网页分析子进程
  src/startSpider.js   启动爬虫进程
  

    

  
