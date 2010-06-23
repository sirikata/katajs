
Kata.include("katajs/oh/Script.js");

(function() {
     if (typeof(Example) === "undefined") { Example = {}; }

     var SUPER = Kata.Script.prototype;
     Example.BlessedScript = function(channel, args) {
         SUPER.constructor.call(this, channel, args);

         this.connect(args.space, null, Kata.bind(this.connected, this));
     };
     Kata.extend(Example.BlessedScript, SUPER);

     Example.BlessedScript.prototype.connected = function() {
         Kata.warn("Got connected callback.");
     };
})();
