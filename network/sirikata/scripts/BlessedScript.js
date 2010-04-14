
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
Kata.include("sirikata/scripts/BasicScript.js");
Kata.include("sirikata/scripts/CameraScript.js");
(function() {
    var SUPER = Sirikata.CameraScript.prototype;
    Sirikata.BlessedScript = function(channel,args){
        SUPER.constructor.call(this,channel,args);

        channel.sendMessage({
                                msg: "Camera",
				                primary: "true",
                                spaceid: args.spaceid
                            });//set us up


        //make object 0

        channel.sendMessage({msg: "Create",
                             spaceid: args.spaceid,
                             script:"sirikata/scripts/DeferScript.js",
                             method:"Sirikata.DeferScript",
                             id:"1",
                             args:{
                                 mesh:"cube",                                 
                                 pos:[0,0,0],
                                 deferscale:[2,2,2],
                                 id:"1",
                                 spaceid: args.spaceid,
                                 defertime:2000
                             }
                             
                            });
        
        //make object 1
        channel.sendMessage({msg: "Create",
                             spaceid: defaultSpace,
                             script:"sirikata/scripts/DeferScript.js",
                             method:"Sirikata.DeferScript",
                             id:"2",
                             args:{
                                 deferscale:[.1,.1,.1],
                                 mesh:"cube",                                 
                                 deferpos:[1,20,3],
                                 pos:[1,2,3],
                                 id:"2",
                                 spaceid: args.spaceid,
                                 defertime:3000
                             }
                            });

    };
    Kata.extend(Sirikata.BlessedScript, SUPER);
})();


