
Kata.include("katajs/oh/Script.js");

(function(){
    if (typeof(Example) === "undefined") {
        Example = {};
    }
    
    var SUPER = Kata.GraphicsScript.prototype;
    Example.BlessedScript = function(channel, args){
        SUPER.constructor.call(this, channel, args);
        
        this.connect(args.space, null, Kata.bind(this.connected, this));
        
        for (var idx = 0; idx < 1; idx++) {
            this.createObject("examples/simple_script/TestScript.js", "Example.TestScript", {
                space: args.space
            });
        }
    };
    Kata.extend(Example.BlessedScript, SUPER);
    Example.BlessedScript.prototype.proxEvent = function(remote, added){
        console.log("debug BlessedScript proxEvent remote:", remote.id(), added)
        if (added) {
            Kata.warn("Camera Discover object.");
            this.mPresence.subscribe(remote.id())
        }
        else {
            Kata.warn("Camera Wiped object.");      // FIXME: unsubscribe!
        }
    };
    Example.BlessedScript.prototype.connected = function(presence){
        console.log("debug BlessedScript connected presence:", presence.id())
        this.enableGraphicsViewport(presence, 0);
        presence.setQueryHandler(Kata.bind(this.proxEvent, this));
        presence.setQuery(0);
        this.mPresence=presence;
        Kata.warn("Got connected callback.");
    };
})();
