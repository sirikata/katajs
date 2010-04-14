
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
Kata.include("sirikata/BasicScript.js");
(function() {
    var SUPER = Sirikata.BasicScript.prototype;
    Sirikata.CameraScript = function(channel,args){
        SUPER.constructor.call(this,channel,args);
        channel.sendMessage({msg:"Proximity",spaceid:args.spaceid,radius:1.0e+8});
    };
    Kata.extend(Sirikata.CameraScript, SUPER);
    Sirikata.CameraScript.prototype.processMessage=function(channel,msg){
        SUPER.processMessage.call(this,channel,msg);
    };
})();


