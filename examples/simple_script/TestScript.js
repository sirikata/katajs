
Kata.include("katajs/oh/Script.js");

(function() {
     if (typeof(Example) === "undefined") { Example = {}; }

     var SUPER = Kata.Script.prototype;
     Example.TestScript = function(channel, args) {
         SUPER.constructor.call(this, channel, args);

         this.connect(args.space, null, Kata.bind(this.connected, this));
     };
     Kata.extend(Example.TestScript, SUPER);

     Example.TestScript.prototype.connected = function(presence) {
         this.mPresence = presence;
         this.mPresence.setQueryHandler(Kata.bind(this.proxEvent, this));
         this.mPresence.setQuery(0);
     };

     Example.TestScript.prototype.proxEvent = function(presence, added) {
         if (added)
             this.mNearby[presence.id()] = presence;
         else
             delete this.mNearby[presence.id()];
     };
})();
