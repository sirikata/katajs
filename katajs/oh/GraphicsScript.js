Kata.include("katajs/oh/impl/ScriptProtocol.js");
Kata.include("katajs/oh/Presence.js");
Kata.include("katajs/oh/RemotePresence.js");

(function() {
     var SUPER = Kata.Script.prototype;
     Kata.GraphicsScript = function(channel, args) {
         SUPER.constructor.call(this, channel, args);
         /**
          *  @type {Array} Array of indexes into the mRemotePresences map that have a chance of being rendered
          *  conservative list: occasionally contains elements that no longer exist. 
          */
         this.mRenderableRemotePresences=[];
         /**
          * Which index the render callback thread is investigating for object relevence
          * @type {number}
          */
         this.mRenderableRemotePresenceIndex=0;
         this.mGraphicsTimer=null;
         this.mNumGraphicsSystems=0;
     };

     /**
      * Enables graphics on the main canvas viewport. 
      * @param {Kata.Presence} presence The presence that graphics should be enabled for
      * @param {number} canvasId Optional canvas ID, which, if specified, indicates which canvas is the preferred attachment point. Otherwise it's first come, first serve for canvas 0 followed by canvas 1 (if present), etc
      */
     Kata.GraphicsScript.prototype.enableGraphicsViewport = function (presence,canvasId) {
         this._enableGraphics(presence,canvasId);
     };

     /**
      * Attach the current presence as a camera unit the specified texture. 
      * Also notify the graphics system of all current renderables.
      */
     Kata.GraphicsScript.prototype.enableGraphicsTexture = function (presence,textureObjectUUID,textureName, textureObjectSpace) {
         if (textureObjectSpace===undefined) {
             textureObjectSpace=presence.space();
         }
         this._enableGraphics(presence,undefined,textureObjectSpace, textureObjectUUID,textureName);
     };

     /**
      * Sends a remote presence to the graphics system to be considered for rendering
      * Marks the item as being on the graphics thread
      */
     Kata.GraphicsScript.prototype.renderRemotePresence = function(presence,remotePresence) {
         //in our space, add to the new graphics subsystem;
         var msg = new Kata.ScriptProtocol.FromScript.GFXCreateNode(presence.space(),presence.id(),remotePresence);
         this._sendObjectHostMessage(msg);
         //in our space, add to the new graphics subsystem;
         var messages=Kata.ScriptProtocol.FromScript.generateGFXUpdateVisualMessages(presence.space(),presence.id(),remotePresence);
         var len=messages.length;
         for (var i=0;i<len;++i) {
             this._sendObjectHostMessage(messages[i]);
         }
         remotePresence.inGFXSceneGraph=true;
         this.appearanceRemotePresence(presence, remotePresence);
     };
     /**
      * Removess a remote presence to the graphics system from consideration for rendering
      * Marks the item as not being on the graphics thread
      */
     Kata.GraphicsScript.prototype.unrenderRemotePresence = function(presence,remotePresence) {
         var msg = new Kata.Script.GFXDestroyNode(presence.space(),presence.id(),remotePresence);
         this._sendObjectHostMessage(msg);
         delete remotePresence.inGFXSceneGraph;
     };
     /**
      * Attach the current presence as a camera unit to either the canvasId or, if undefined, the specified texture. 
      * Also notify the graphics system of all current renderables.
      */
     Kata.GraphicsScript.prototype._enableGraphics = function (presence,canvasId,textureObjectSpace, textureObjectUUID,textureName) {
         var space=presence.space();
         this.renderRemotePresence(presence,presence);
         for (var remotePresenceId in this.mRemotePresences) {
             var remotePresence=this.mRemotePresences[remotePresenceId];
             if (remotePresence.space()==space) { 
                 this.mRenderableRemotePresences[this.mRenderableRemotePresences.length]=remotePresenceId;
                 if (this.shouldRender(presence,remotePresence)&&!remotePresence.inGFXSceneGraph) {
                     this.renderRemotePresence(presence,remotePresence);
                 }
             }
         }
         var msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(),presence.id(),presence.id(),canvasId,textureObjectSpace,textureObjectUUID,textureName);
         this._sendObjectHostMessage(msg);
         if (this.mNumGraphicsSystems++==0)
             this.mGraphicsTimer=this.timer(Kata.Duration.seconds(2),Kata.bind(Kata.GraphicsScript.processRenderables,this),true);
     };

     /**
      * Goes through one remotePresence per timer call and checks whether it is renderable
      * If it should be, but it is not in the scene graph it marks it as renderable and adds to gfx thread
      * If it shouldn't be but is in the scene graph it marks it as unrenderable and removes from gfx thread
      * If it is no longer being shown by the cameras
      */
     Kata.GraphicsScript.processRenderables=function() {
         var len=this.mRenderablerRemotePresence.length;
         if (len) {
             this.mRenderableRemotePresenceIndex%=len;             
             var remotePresenceName=this.mRenderableRemotePresence[this.mRenderableRemotePresenceIndex];
             var remotePresence=this.mRemotePresences[remotePresenceName];
             if (remotePresence) {
                 var presence = this.mPresences[remotePresence.space()];
                 var shouldRender=this.shouldRender(presence,remotePresence);
                 if (shouldRender) {
                     if (!remotePresence.inGFXSceneGraph)
                         this.renderRemotePresence(presence,remotePresence);
                 }else {
                     if (remotePresence.inGFXSceneGraph)
                         this.unrenderRemotePresence(presence,remotePresence);                     
                 }
                 this.mRenderableRemotePresenceIndex++;
             }else {
                 this.mRemotePresences[this.mRenderableRemotePresenceIndex]=this.mRemotePresences[len];
                 this.mRemotePresences.pop();
             }
         }
     };
     /**
      * Remove all renderables from the given presence from the render thread and unattach the camera
      */
     Kata.GraphicsScript.prototype.disableGraphics = function (presence) {
         {
             var msg = new Kata.ScriptProtocol.FromScript.GFXDetachCamera(presence.space(),presence.id(),presence.id());
             this._sendObjectHostMessage(msg);
    
         }
         var space=presence.space();
         var len = this.mRenderableRemotePresences.length;
         var msg = unrenderRemotePresence(presence,presence);
         this._sendObjectHostMessage(msg);
         for (var i=0;i<len;) {
             var remotePresence=this.mRemotePresences[this.mRenderableRemotePresences[i]];
             if (remotePresence && remotePresence.space()==space) {
                 if (remotePresence.inGFXSceneGraph) {
                     //in our space, add to the new graphics subsystem;
                     this.unrenderRemotePresence(presence,remotePresence);
                 }
                 this.mRenderableRemotePresences[i]=this.mRenderableRemotePresences[len];
                 len=--this.mRenderableRemotePresences.length;                 
             }else {
                 ++i;
             }
         }
         if (--this.mNumGraphicsSystems==0){
             this.mGraphicsTimer.disable();
             this.mGraphicsTimer=null;
         }
     };
     /**
      *
      */
     Kata.GraphicsScript.prototype._handleQueryEvent=function(data) {
         var remotePresence=SUPER.handleQueryEvent.call(this,data);
         if (remotePresence) {
             var key=Kata.Script.remotePresenceKey(msg.space,msg.observed);
             var presence=this.mPresences[key];
             if (presence.inGFXSceneGraph) {//if this particular presence has gfx enabled
                 if (msg.entered) {
                     this.mRenderableRemotePresences.push(remotePresence);
                     if (this.shouldRender(presence,remotePresence)) {
                         this.renderRemotePresence(presence,remotePresence);
                     }
                 }else {
                     if (remotePresence.inGFXSceneGraph) {
                         this.unrenderRemotePresence(presence,remotePresence);
                     }
                 }
             }
         }
         return remotePresence;
     };
     /**
      * Overridable function that indicates whether a given remotePresence 
      * should be rendered for the given presence.
      */
     Kata.GraphicsScript.prototype.shouldRender = function(presence,remotePresence) {
         return true;
     };
     
 })();
