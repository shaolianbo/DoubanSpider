BINPATH=$(pwd)/src
if [ "$#" -lt "1" ]; then
	echo "USAGE: sh spider.sh [seed | spider | analyse]"
	exit 1
fi  
cd $BINPATH
case "$1" in
	seed)
		node  seed.js
		;;
	spider) 
		forever start startSpider.js 2>/dev/null >/dev/null
		;;
	analyse)
		node index.js 2>/dev/null >/dev/null  &
		;;
	*)
		echo "USAGE: sh spider.sh [seed | spider | analyse]"
		;;
esac



