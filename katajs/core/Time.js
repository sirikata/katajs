if (typeof(Kata) == "undefined") {Kata = {};}
if (typeof(console) == "undefined") {
	console = {};
	debug_console = false;
} else {
	debug_console = true;
}

Kata.require([
], function() {
    'use strict';
    var currentTime = Date.now();
    var scheduled=false;
    Kata.scheduleNowUpdates=function(time){
        'use strict';
        function replay() {
            'use strict';
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
        'use strict';
        return scheduled?currentTime:Kata.updateNow();
    };
    Kata.updateNow = function (newTime) {
        'use strict';
        if (newTime===undefined)
            currentTime=Date.now();
        else
            currentTime = newTime;
        return currentTime;
    };
}, 'katajs/core/Time.js');
