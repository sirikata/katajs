
Kata.include("katajs/oh/Script.js");
Kata.include("katajs/oh/GraphicsScript.js");

(function(){
    if (typeof(Example) === "undefined") {
        Example = {};
    }
    
    var SUPER = Kata.GraphicsScript.prototype;
    Example.TestScript = function(channel, args){
        SUPER.constructor.call(this, channel, args);
        
        this.mNearby = {};
        this.connect(args, null, Kata.bind(this.connected, this));
        this.instance = Example.TestScript.instance;
        this.movecount = 0;
        this.movemax = 1;
        Example.TestScript.instance += 1;
    };
    Kata.extend(Example.TestScript, SUPER);
    
    Example.TestScript.prototype.connected = function(presence){
        this.mPresence = presence;
        // Start periodic movements
        this.move();
        // Listen for messages
        this.mTestODPPort = this.mPresence.bindODPPort(10);
        this.mTestODPPort.receive(Kata.bind(this._handleTestODPMessage, this));
    };

    Example.TestScript.prototype._handleTestODPMessage = function(src, dest, payload) {
        Kata.warn("Received test message from " + dest + ": " + payload);
    };
     
    Example.TestScript.prototype.move = function(){
        if (!this.mPresence) 
            return;
        
        var loc = this.mPresence.mLocation;
        var pos = [this.instance * 3,
                   this.movecount * 3,
                   -10];
        console.log("move mPresence.setPosition:", pos[0], pos[1], pos[2]);
        this.mPresence.setPosition(pos);
        if(this.instance) this.mPresence.setOrientation([.5,.5,.5,.5])
        if(this.instance) this.mPresence.setScale([.5,.5,.5])
        if (this.instance && this.movecount) {
            this.mPresence.setLocation({orient:[1,0,0,0],pos:[4,4,-12],scale:[4,2,1]})
        }
        
        // disabled until updates work
        if (this.movecount < this.movemax) {
            this.movecount++;
            setTimeout(Kata.bind(this.move, this), 3000);
        }
    };
    Example.TestScript.instance = 0;
})();
