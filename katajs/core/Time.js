if (typeof(Kata) == "undefined") {Kata = {};}
if (typeof(console) == "undefined") {
	console = {};
	debug_console = false;
} else {
	debug_console = true;
}

Kata.require([
], function() {
    var currentTime = (new Date()).getTime();
    var scheduled=false;
    Kata.scheduleNowUpdates=function(time){
        function replay() {
            setTimeout(replay,time);
            Kata.updateNow();
        }
        replay();
        scheduled=true;
    };
    /**
     * Returns the time in a given space such that the space will be synced with this time
     * Right now does not distinguish between spaces--future may have to lookup the space class
     */
    Kata.now = function(space) {
        return scheduled?currentTime:Kata.updateNow();
    };
    Kata.updateNow = function (newTime) {
        if (newTime===undefined)
            currentTime=(new Date()).getTime();
        else
            currentTime = newTime;
        return currentTime;
    };
}, 'katajs/core/Time.js');
