
Kata.include("katajs/oh/Script.js");

(function(){
    if (typeof(Example) === "undefined") {
        Example = {};
    }
    
    var SUPER = Kata.GraphicsScript.prototype;
    Example.BlessedScript = function(channel, args){
        SUPER.constructor.call(this, channel, args);
        
        this.connect(args, null, Kata.bind(this.connected, this));
        
        for (var idx = 0; idx < 2; idx++) {
            this.createObject("examples/simple_script/TestScript.js", "Example.TestScript", {
                space: args.space,
                visual:"../content/teapot"
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
    Example.cameraPos=[1.5, 2, 5];
    Example.BlessedScript.prototype.connected = function(presence){
        this.enableGraphicsViewport(presence, 0);
        presence.setQueryHandler(Kata.bind(this.proxEvent, this));
        presence.setQuery(0);
        this.mPresence=presence;
        presence.setPosition(Example.cameraPos)
        Kata.warn("Got connected callback.");
    };

    Example.euler2Quat = function(yaw, pitch, roll){
        // takes degrees; roll = rotation about z, pitch = x, yaw = y
        var k = 0.00872664625 // deg2rad/2
        var yawcos = Math.cos(roll * k)
        var yawsin = Math.sin(roll * k)
        var pitchcos = Math.cos(pitch * k)
        var pitchsin = Math.sin(pitch * k)
        var rollcos = Math.cos(yaw * k)
        var rollsin = Math.sin(yaw * k)
        return [rollcos * pitchsin * yawcos + rollsin * pitchcos * yawsin, 
                rollsin * pitchcos * yawcos - rollcos * pitchsin * yawsin, 
                rollcos * pitchcos * yawsin - rollsin * pitchsin * yawcos, 
                rollcos * pitchcos * yawcos + rollsin * pitchsin * yawsin]
    };

    Example.hackInputMsg = function(msg) {
        if (msg.msg == "mousemove") {
            var q = Example.euler2Quat(450-parseFloat(msg.event.offsetX),250-parseFloat(msg.event.offsetY),0)
            console.log("hackInputMsg:", msg.event.offsetX, msg.event.offsetY,q)   
            Example.blessedInstance.mPresence.setOrientation(q)
        }
        if (msg.msg == "keydown") {
            switch(msg.event.keyCode) {
                case 65:
                    Example.cameraPos[0]-=1.0;
                    Example.blessedInstance.mPresence.setPosition(Example.cameraPos);
                    break;
                case 68:
                    Example.cameraPos[0]+=1.0;
                    Example.blessedInstance.mPresence.setPosition(Example.cameraPos);
                    break;
                case 87:
                    Example.cameraPos[2]-=1.0;
                    Example.blessedInstance.mPresence.setPosition(Example.cameraPos);
                    break;
                case 83:
                    Example.cameraPos[2]+=1.0;
                    Example.blessedInstance.mPresence.setPosition(Example.cameraPos);
                    break;
                case 82:
                    Example.cameraPos[1]+=1.0;
                    Example.blessedInstance.mPresence.setPosition(Example.cameraPos);
                    break;
                case 76:
                    Example.cameraPos[1]-=1.0;
                    Example.blessedInstance.mPresence.setPosition(Example.cameraPos);
                    break;
            }            
        }
    };
})();
