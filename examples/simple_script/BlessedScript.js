
Kata.include("katajs/oh/Script.js");

(function() {
     if (typeof(Example) === "undefined") { Example = {}; }

     var SUPER = Kata.Script.prototype;
     Example.BlessedScript = function(channel, args) {
         SUPER.constructor.call(this, channel, args);

         Kata.warn("Blessed script initialized.");
     };
     Kata.extend(Example.BlessedScript, SUPER);
})();
