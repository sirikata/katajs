
Kata.include("sirikata/QueryTracker.js");
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
(function() {
     Sirikata.CameraScript = function(channel,args){
         var th=this;
         function listen(channel,msg) {
             s="";
             for (var i in msg) {
                 s+=i+":"+msg[i]+"\n";
             }
             console.log("Script got object location {\n"+s+"\n}\n");
             //alert(s);
         }

         channel.registerListener(listen);
         channel.sendMessage({msg:"ConnectToSpace",spaceid:args.spaceid});
         channel.sendMessage({msg:"Proximity",spaceid:args.spaceid,radius:1.0e+8});
     };
})();


