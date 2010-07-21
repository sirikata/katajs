
Kata.include("katajs/oh/Script.js");

(function() {
     if (typeof(Example) === "undefined") { Example = {}; }

     var SUPER = Kata.GraphicsScript.prototype;
     Example.TestScript = function(channel, args) {
         SUPER.constructor.call(this, channel, args);

         this.mNearby = {};
         this.connect(args.space, null, Kata.bind(this.connected, this));
		 this.instance = Example.TestScript.instance
		 Example.TestScript.instance+=1
     };
     Kata.extend(Example.TestScript, SUPER);

     Example.TestScript.prototype.connected = function(presence) {
         this.mPresence = presence;
         this.mPresence.setQueryHandler(Kata.bind(this.proxEvent, this));
         this.mPresence.setQuery(0);

         // Start periodic movements
         this.move();
     };

     Example.TestScript.prototype.proxEvent = function(presence, added) {
         if (added) {
             presence.track();
             this.mNearby[presence.id()] = presence;
         }
         else
             delete this.mNearby[presence.id()];
     };

     Example.TestScript.prototype.move = function() {
         if (!this.mPresence) return;

         var pos = this.mPresence.position();
         pos[0] = this.instance*3;
		 pos[2] = -10
         this.mPresence.setPosition(pos);

		 // disabled until updates work
		 /*
         setTimeout(
             Kata.bind(this.move, this),
             5000
         );
         */
     };
	 Example.TestScript.instance=0;
})();
