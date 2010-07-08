
Kata.include("externals/protojs/protobuf.js");
Kata.include("externals/protojs/pbj.js");
Kata.include("network/sirikata/scripts/BasicScript.js");
Kata.include("network/sirikata/scripts/CameraScript.js");
(function() {
    var SUPER = Sirikata.CameraScript.prototype;
    Sirikata.BlessedScript = function(channel,args){
        var connectionCallback=function(message){
            channel.sendMessage({msg:"BindPort",port:64,space:args.spaceid});
            
            
            
            channel.sendMessage({msg: "Create",
                                 spaceid: args.spaceid,
                                 script:"network/sirikata/scripts/DeferScript.js",
                                 method:"Sirikata.DeferScript",
                                 args:{
                                     mesh:"../content/teapot",
                                     creator:message.object_reference,
                                     creatorport:64,
                                     nickname:"pretty print object A",                       
                                     pos:[3,0,-10],//Warning current code does not respect movement settings before proxies discovered: so you need to set defer pos
                                     deferscale:[.25,.5,.25],
                                     scale:[.25,.25,.25],//Warning current code does not respect scale settings before proxies discovered: so you need to set defer pos
                                     spaceid: args.spaceid,
                                     defertime:2000
                                 }
                                 
                                });
            
            //make object 1
            channel.sendMessage({msg: "Create",
                                 spaceid: defaultSpace,
                                 script:"network/sirikata/scripts/DeferScript.js",
                                 method:"Sirikata.DeferScript",
                                 args:{
                                     deferscale:[.5,.25,.25],
                                     mesh:"../content/teapot",
                                     creator:message.object_reference,
                                     creatorport:64,
                                     nickname:"pretty print object B",                                     
                                     pos:[-3,0,-10],//Warning current code does not respect movement settings before proxies discovered: so you need to set defer pos
                                     scale:[.25,.25,.25],//Warning current code does not respect scale settings before proxies discovered: so you need to set defer pos
                                 spaceid: args.spaceid,
                                 defertime:3000
                             }
                            });
            
        };
        
        SUPER.constructor.call(this,channel,args,connectionCallback);

        channel.sendMessage({
                                msg: "Camera",
                                spaceid: args.spaceid
                            });//set us up

        

    };
    Kata.extend(Sirikata.BlessedScript, SUPER);

     Sirikata.BlessedScript.prototype.processMessage=function(channel,msg){
         SUPER.processMessage.call(this,channel,msg);
         if (msg.msg=="Message"&&msg.header.destination_port==64) {
             var nickname = new Sirikata.Protocol.StringProperty;
             nickname.ParseFromStream(new PROTO.Base64Stream(msg.data));
             console.log("Got object ID "+msg.header.source_object+" as "+nickname.value);
             
         }
     };
})();


