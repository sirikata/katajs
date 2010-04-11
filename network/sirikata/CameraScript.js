
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
Kata.include("sirikata/BasicScript.js");
(function() {
     Sirikata.CameraScript = function(channel,args){
         Sirikata.BasicScript.call(this,channel,args);
         channel.sendMessage({msg:"Proximity",spaceid:args.spaceid,radius:1.0e+8});
     };
     Sirikata.CameraScript.prototype.processMessage=function(channel,msg){
         Sirikata.BasicScript.prototype.processMessage.call(this,channel,msg);
         
     };
})();


