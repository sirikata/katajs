

Kata.require([
    'katajs/oh/Script.js'
], function() {
    if (typeof(Example) === "undefined") {
        Example = {};
    }
    
    var SUPER = Kata.GraphicsScript.prototype;
    Example.BlessedScript = function(channel, args){
        SUPER.constructor.call(this, channel, args);
        
        this.connect(args, null, Kata.bind(this.connected, this));

        for (var idx = 0; idx < 2; idx++) {
            this.createObject("tests/envjs/test_Script.js", "Example.TestScript", {
                space: args.space,
                visual: {mesh:"../content/teapot"}
            });
        }
        Example.blessedInstance=this;
    };
    Kata.extend(Example.BlessedScript, SUPER);
    Example.BlessedScript.prototype.proxEvent = function(remote, added){
        if (added) {
            Kata.warn("Camera Discover object.");
            this.mPresence.subscribe(remote.id())
        }
        else {
            Kata.warn("Camera Wiped object.");      // FIXME: unsubscribe!
        }
    };
    Example.BlessedScript.prototype.connected = function(presence){
        this.enableGraphicsViewport(presence, 0);
        presence.setQueryHandler(Kata.bind(this.proxEvent, this));
        presence.setQuery(0);
        this.mPresence=presence;
        presence.setPosition([1.5,2,5])
        Kata.warn("Got connected callback.");
    };
    Example.BlessedScript.prototype._handleGUIMessage = function (channel, msg) {
        if (msg.msg == "keydown") {
            console.log("ENVJSTEST: _handleGUIMessage:", msg.msg, msg.keyCode)
        }
        else if (msg.msg == "mousedown") {
            console.log("ENVJSTEST: _handleGUIMessage:",  msg.msg, msg.button)
        }
        else if (msg.msg == "drag") {
            var q = [0,1,0,0]
            console.log("ENVJSTEST: _handleGUIMessage:",  msg.msg, msg.x, msg.y, q)
            Example.blessedInstance.mPresence.setOrientation(q)
        }
        else {
            console.log("ENVJSTEST: _handleGUIMessage unexpected event", msg.msg, msg.event)
        }
    };
}, 'tests/envjs/test_Blessed.js');

Kata.DEBUG_FAKE_UUID=true;
