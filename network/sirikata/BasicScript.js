
Kata.include("sirikata/QueryTracker.js");
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
(function() {
     var connectionAttempt=2;
     Sirikata.BasicScript = function(channel,args){
         this.mChannel=channel;
         channel.registerListener(Kata.bind(this.processMessage,this));
         if(args.spaceid) {
             if (args.parent) {
                 var parentObject=args.parent;
                 var parentNickname=args.nickname;
                 Sirikata.BasicScript.prototype.connectToSpace
                     .call(this,args.spaceid,
                           function(msg){
                               msg.msg="ChildObjectSpaceConnect";
                               msg.nickname=parentNickname;
                              //FIXME: channel.sendODPMessage(parentObject,msg);
                           });
             } else {
                 Sirikata.BasicScript.prototype.connectToSpace.call(this,args.spaceid,function(msg){});                 
             }
                                                                //,function(msg){alert("Connected to space "+msg.spaceid+" as "+msg.object_reference);});//if we want to test callback mechanism
         }
     };
     Sirikata.BasicScript.prototype.connectToSpace=function(spaceid,callback){
         if (callback) {
            if (!this.mWaitingSpaceConnections) {
                this.mWaitingSpaceConnections={};
            }
            ++connectionAttempt;
            var localConnectionAttempt=connectionAttempt;
            var th=this;
            this.mWaitingSpaceConnections[spaceid]={callback:callback,id:localConnectionAttempt};
            var failureRetry;
             failureRetry=function(){
                 if (th.mWaitingSpaceConnections&&(spaceid in th.mWaitingSpaceConnections)&&th.mWaitingSpaceConnections[spaceid].id==localConnectionAttempt) {
                     if (localConnectionAttempt>2) {
                         localConnectionAttempt=2;                                   
                     }
                     --localConnectionAttempt;
                     if (localConnectionAttempt>=0){
                         th.mWaitingSpaceConnections[spaceid]={callback:callback,id:localConnectionAttempt};
                         setTimeout(failureRetry,2000);
                         th.mChannel.sendMessage({msg:"ConnectToSpace",spaceid:spaceid});                                   
                     }else {
                         //permanent connection failure   
                         th.mWaitingSpaceConnections[spaceid].callback({msg:"RetObj",spaceid:spaceid});
                     }
                 }
             };
             setTimeout(failureRetry,2000);
         }
         this.mChannel.sendMessage({msg:"ConnectToSpace",spaceid:spaceid});
     };
     Sirikata.BasicScript.prototype.processMessage=function(channel,msg){
         {
    
             var s="";
             for (var i in msg) {
                 s+=i+":"+msg[i]+"\n";
             }
             console.log("Script got property "+msg.msg+" {\n"+s+"\n}\n");
             //alert(s);
         }

         switch (msg.msg){
             case "RetObj":
             if (this.mWaitingSpaceConnections)  {
                 if (msg.spaceid in this.mWaitingSpaceConnections){
                     this.mWaitingSpaceConnections[msg.spaceid].callback(msg);
                     delete this.mWaitingSpaceConnections[msg.spaceid];
                     var empty=true;
                     for (var item in this.mWaitingSpaceConnections){
                         empty=false;
                         break;
                     }
                     if (empty){
                         delete this.mWaitingSpaceConnections;//no more pending connections
                     }
                 }
             }
             break;
             default:
             break;
         }
         
     };
})();


