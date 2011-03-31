/*  KataJS
 *  GraphicsScript.js
 *
 *  Copyright (c) 2010, Daniel Reiter Horn
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Sirikata nor the names of its contributors may
 *    be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


Kata.require([
    'katajs/oh/Script.js',
    'katajs/oh/impl/ScriptProtocol.js'
], function() {
     var SUPER = Kata.Script.prototype;
     /** GraphicsScript is an extension of the core Script interface
      * which provides convenience methods for interacting with an
      * asynchronous rendering service.
      *
      * @constructor
      * @param channel channel for communication with main thread
      * @param args arguments provided by the creator of the object
      * @param update_hook a hook of the form f(presence,
      * remotePresence) invoked when updates are going to be passed to
      * the graphics system.
      */
     Kata.GraphicsScript = function(channel, args, update_hook) {
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
         this._camPos = [0,0,0];
         this._camPosTarget = [0,0,0];
         this._camOrient = [0,0,0,1];
         this._camOrientTarget = [0,0,0,1];
         this._camLag = 0.9;
         var msgTypes = Kata.ScriptProtocol.ToScript.Types;
         this.mMessageDispatcher.add(msgTypes.GUIMessage, Kata.bind(this._handleGUIMessage, this));

         this.mUpdateHook = update_hook;
     };
     Kata.extend(Kata.GraphicsScript, SUPER);

     Kata.GraphicsScript.prototype._handleGUIMessage = function (channel, data) {
         if (data.msg=="loaded")
             this.cameraPeriodicUpdate(true);
     };
     
     Kata.GraphicsScript.prototype.queryMeshAspectRatio = function(presence, remotePresence) {
         var msg = new Kata.ScriptProtocol.FromScript.GFXQueryMeshAspectRatio(presence.space(),presence.id(),remotePresence);
         this._sendHostedObjectMessage(msg);
     };
     /**
      * Enables graphics on the main canvas viewport. 
      * @param {Kata.Presence} presence The presence that graphics should be enabled for
      * @param {number} canvasId Optional canvas ID, which, if specified, indicates which canvas is the preferred attachment point. Otherwise it's first come, first serve for canvas 0 followed by canvas 1 (if present), etc
      */
     Kata.GraphicsScript.prototype.enableGraphicsViewport = function (presence,canvasId, attachCamera) {
         this._enableGraphics(presence, canvasId, undefined, undefined, undefined, attachCamera);
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
     Kata.GraphicsScript.prototype.renderRemotePresence = function(presence,remotePresence, noMesh) {
         //in our space, create
         var msg = new Kata.ScriptProtocol.FromScript.GFXCreateNode(presence.space(),presence.id(),remotePresence);
         Kata.LocationCopyUnifyTime(msg,remotePresence.mLocation);
         this._sendHostedObjectMessage(msg);
         //in our space, add Mesh to the new graphics subsystem;
		 if (!noMesh) {
		 	var messages = Kata.ScriptProtocol.FromScript.generateGFXUpdateVisualMessages(presence.space(), presence.id(), remotePresence);
		 	var len = messages.length;
		 	for (var i = 0; i < len; ++i) {
		 		this._sendHostedObjectMessage(messages[i]);
		 	}
		 }
         remotePresence.inGFXSceneGraph = true;
         // Give everything a chance to run an initial update pass
         this.updateGFX(remotePresence);

         //FIXME: not sure what this line was trying to accomplishthis.appearanceRemotePresence(presence, remotePresence);
     };
     /**
      * Removess a remote presence to the graphics system from consideration for rendering
      * Marks the item as not being on the graphics thread
      */
     Kata.GraphicsScript.prototype.unrenderRemotePresence = function(presence,remotePresence) {
         var msg = new Kata.ScriptProtocol.FromScript.GFXDestroyNode(presence.space(),presence.id(),remotePresence);
         this._sendHostedObjectMessage(msg);
         delete remotePresence.inGFXSceneGraph;
     };
     /**
      * Attach the current presence as a camera unit to either the canvasId or, if undefined, the specified texture. 
      * Also notify the graphics system of all current renderables.
      */
     Kata.GraphicsScript.prototype._enableGraphics = function(presence, canvasId, textureObjectSpace, textureObjectUUID, textureName, attachCamera){
        var space = presence.space();
        // presence may have mesh
        var key = Kata.Script.remotePresenceKey(presence.space(), presence.id());
        this.mRemotePresences[key] = presence;
        for (var remotePresenceId in this.mRemotePresences) {
            var remotePresence = this.mRemotePresences[remotePresenceId];
            if (remotePresence.space() == space) {
                this.mRenderableRemotePresences[this.mRenderableRemotePresences.length] = remotePresenceId;
                if (this.shouldRender(presence, remotePresence) && !remotePresence.inGFXSceneGraph) {
                    this.renderRemotePresence(presence, remotePresence);
                }
            }
        }
        var msg = new Kata.ScriptProtocol.FromScript.RegisterGUIMessage(presence.space(), presence.id(), presence.id());
        this._sendHostedObjectMessage(msg);
        
        msg = new Kata.ScriptProtocol.FromScript.GFXEnableEvent(presence.space(), "drag");
        this._sendHostedObjectMessage(msg);
        msg = new Kata.ScriptProtocol.FromScript.GFXEnableEvent(presence.space(), "pick"); // FIXME: Should be configurable.
        this._sendHostedObjectMessage(msg);
        if (attachCamera) {
            msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(), presence.id(), presence.id(), canvasId, textureObjectSpace, textureObjectUUID, textureName);
            msg.msg = "Camera";
            this._sendHostedObjectMessage(msg);
            msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(), presence.id(), presence.id(), canvasId, textureObjectSpace, textureObjectUUID, textureName);
            this._sendHostedObjectMessage(msg);
        }
        else {
            /// create camera with a fake ID so it's not attached to presence
            Kata.BlessedCameraID = Kata.ObjectID.random();
            var msg = new Kata.ScriptProtocol.FromScript.GFXCreateNode(presence.space(), presence.id(), presence);
            msg.id = Kata.BlessedCameraID;
            Kata.BlessedCameraSpace = msg.space;
            Kata.BlessedCameraSpaceid = msg.spaceid;
            
            this._sendHostedObjectMessage(msg);
            msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(), presence.id(), presence.id(), canvasId, textureObjectSpace, textureObjectUUID, textureName);
            msg.id = Kata.BlessedCameraID;
            msg.msg = "Camera";
            this._sendHostedObjectMessage(msg);
            msg = new Kata.ScriptProtocol.FromScript.GFXAttachCamera(presence.space(), presence.id(), presence.id(), canvasId, textureObjectSpace, textureObjectUUID, textureName);
            msg.id = Kata.BlessedCameraID;
            
            this._sendHostedObjectMessage(msg);
            setInterval(Kata.bind(this.cameraPeriodicUpdate, this), 20);
        }
        if (this.mNumGraphicsSystems++ == 0) {
            var duration = new Date(0);
            duration.setSeconds(2);
            this.mGraphicsTimer = this.timer(duration, Kata.bind(this.processRenderables, this), true);
        }
    };

     Kata.GraphicsScript.prototype.setCameraPosOrient = function(pos, orient, lag){
         if (lag==null) lag = .9;     /// 0 = no lag; 1.0 = infinite
         this._camLag = lag;
         if (pos) {
             if (lag==0) this._camPos = pos;
             this._camPosTarget = pos;
         }
         if (orient) {
             if (lag==0) this._camOrient = orient;
             this._camOrientTarget = orient;
         }
     };

     Kata.GraphicsScript.prototype.cameraPeriodicUpdate = function(forceUpdate){
         var i;
         var originalCamPos=[];
         for (i=0;i<3;++i) {
             originalCamPos[i]=this._camPos[i];
             this._camPos[i] = this._camPos[i] * this._camLag + this._camPosTarget[i] * (1.0-this._camLag);
         }
         var originalCamOrient=[];
         for (i=0;i<4;++i) {
             originalCamOrient[i]=this._camOrient[i];
             this._camOrient[i] = this._camOrient[i] * this._camLag + this._camOrientTarget[i] * (1.0-this._camLag);
         }
         function similarPos(a,b){
             for (var i=0;i<3;++i){
                 if (!(Math.abs(a[i]-b[i])<.001))
                     return false;
             }
             return true;
         }
         function similarOrient(a,b){
             for (var i=0;i<4;++i){
                 if (!(Math.abs(a[i]-b[i])<.0001))
                     return false;
             }
             return true;
         }
         if (forceUpdate||((!similarPos(originalCamPos,this._camPosTarget)||!similarOrient(originalCamOrient,this._camOrientTarget)))) {
             var msg = {};
             msg.__type = Kata.ScriptProtocol.FromScript.Types.GraphicsMessage;
             msg.msg = "Move";
             msg.space = Kata.BlessedCameraSpace;
             msg.id = Kata.BlessedCameraID;
             msg.spaceid = Kata.BlessedCameraSpaceid;
             msg.pos = this._camPos;
             msg.orient = new Kata.Quaternion(this._camOrient);
             msg.orient = msg.orient.normal();
             this._sendHostedObjectMessage(msg);             
         }
     };

     /**
      * Goes through one remotePresence per timer call and checks whether it is renderable
      * If it should be, but it is not in the scene graph it marks it as renderable and adds to gfx thread
      * If it shouldn't be but is in the scene graph it marks it as unrenderable and removes from gfx thread
      * If it is no longer being shown by the cameras
      */
     Kata.GraphicsScript.prototype.processRenderables=function() {
         var len=this.mRenderableRemotePresences.length;
         if (len) {
             this.mRenderableRemotePresenceIndex%=len;             
             var remotePresenceName=this.mRenderableRemotePresences[this.mRenderableRemotePresenceIndex];
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
                 --this.mRemotePresences.length;//FIXME: does this clear the item itself
             }
         }
     };
     /**
      * Remove all renderables from the given presence from the render thread and unattach the camera
      */
     Kata.GraphicsScript.prototype.disableGraphics = function (presence) {
         {
             var msg = new Kata.ScriptProtocol.FromScript.GFXDetachCamera(presence.space(),presence.id(),presence.id());
             this._sendHostedObjectMessage(msg);
    
         }
         var space=presence.space();
         var len = this.mRenderableRemotePresences.length;
         var msg = unrenderRemotePresence(presence,presence);
         this._sendHostedObjectMessage(msg);
         var key = Kata.Script.remotePresenceKey(presence.space(), presence.id());
         delete this.mRemotePresences[key];
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
         msg = new Kata.ScriptProtocol.FromScript.UnregisterGUIMessage(presence.space(),presence.id(),presence.id());
         this._sendHostedObjectMessage(msg);

     };
     /**
      *
      */
     Kata.GraphicsScript.prototype._handleQueryEventDelegate=function(remotePresence,data) {
         if (remotePresence) {
             var presence=this.mPresences[data.space];
             if (presence.inGFXSceneGraph) {//if this particular presence has gfx enabled
                 if (data.entered) {
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
         this.processRenderables();//garbage collect dead renderables;
         return remotePresence;
     };

     Kata.GraphicsScript.prototype.updateGFX = function(remotePresence) {
         var presence = this.mPresences[remotePresence.space()];
         if (!presence || !presence.inGFXSceneGraph) //only if this particular presence has gfx enabled
             return;

         var msg = new Kata.ScriptProtocol.FromScript.GFXMoveNode(
             presence.space(),
             presence.id(),
             remotePresence,
             { loc : remotePresence.predictedLocation() }
         );
         this._sendHostedObjectMessage(msg);
         if (this.mUpdateHook)
             this.mUpdateHook(presence, remotePresence);
     };
     /**
      * Override Script._handlePresenceLocUpdate
      */
     Kata.GraphicsScript.prototype._handlePresenceLocUpdate = function(channel, data){
         var remotePresence = SUPER._handlePresenceLocUpdate.call(this, channel, data);
         if (remotePresence)
             this.updateGFX(remotePresence);
         return remotePresence;
     };
     /**
      * Overridable function that indicates whether a given remotePresence 
      * should be rendered for the given presence.
      */
     Kata.GraphicsScript.prototype.shouldRender = function(presence,remotePresence) {
         return true;
     };
     
    Kata.GraphicsScript.prototype.animate = function(presence, remotePresence, animation) {
        var msg = new Kata.ScriptProtocol.FromScript.GFXAnimate(
            presence.space(),
            presence.id(),
            remotePresence,
            animation
        );
        this._sendHostedObjectMessage(msg);
    };

    Kata.GraphicsScript.prototype.setLabel = function(presence, remoteID, label, offset) {
        var msg = new Kata.ScriptProtocol.FromScript.GFXLabel(
            presence.space(),
            presence.id(),
            remoteID.object(),
            label,
            offset
        );
        this._sendHostedObjectMessage(msg);
    };

}, "katajs/oh/GraphicsScript.js");
