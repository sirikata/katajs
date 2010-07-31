
Kata.include("katajs/oh/Script.js");

(function(){
    if (typeof(Example) === "undefined") {
        Example = {};
    }
    
    var SUPER = Kata.GraphicsScript.prototype;
    Example.TestScript = function(channel, args){
        SUPER.constructor.call(this, channel, args);
        
        this.mNearby = {};
        this.connect(args.space, null, Kata.bind(this.connected, this));
        this.instance = Example.TestScript.instance;
        this.movecount = 0
        this.movemax = 1
        Example.TestScript.instance += 1
    };
    Kata.extend(Example.TestScript, SUPER);
    
    Example.TestScript.prototype.connected = function(presence){
        this.mPresence = presence;
        // Start periodic movements
        this.move();
    };
    
    Example.TestScript.prototype.move = function(){
        if (!this.mPresence) 
            return;
        
        var pos = this.mPresence.rPosition.slice(0);
        pos[0] = this.instance * 3;
        pos[1] = this.movecount * 3
        pos[2] = -10
        console.log("move mPresence.setPosition:", pos[0], pos[1], pos[2])
        this.mPresence.setPosition(pos);

        if (this.movecount < this.movemax) {
            this.movecount++;
            setTimeout(Kata.bind(this.move, this), 2000);
        }
    };
    Example.TestScript.instance = 0;
})();
