/*  Kata Javascript Graphics - O3D Interface
 *  o3dgfx.js
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

var GLGEGraphics=function(callbackFunction,parentElement) {
    this.callback=callbackFunction;
    {        
        var canvas;
        var thus=this;
        canvas = document.createElement('canvas');
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        parentElement.appendChild(canvas);
        if (!canvas) {
            this.webGlCanvasError(parentElement, 'HTMLCanvas');
        }else {
            var resizeHandler = function() {
                var width = Math.max(1, canvas.clientWidth);
                var height = Math.max(1, canvas.clientHeight);
                canvas.width = width;
                canvas.height = height;
                canvas.sizeInitialized_ = true;
                thus.displayInfo = {width: canvas.width, height: canvas.height};
            };
            this.renderer=new GLGE.Renderer(canvas);
            this.keys=new GLGE.KeyInput();
            
            window.addEventListener('resize', resizeHandler, false);
            setTimeout(resizeHandler, 0);                
        }
        this.mClientElement=canvas;
    }
    
    var lasttime = 0;
    var frameratebuffer = 60;
    this.mCurTime=new Date();
    this.mObjectUpdates = {}; // map id -> function
    

    function render(){
        if(typeof(GlobalLoadDone)=="function") {
                GlobalLoadDone();//this should be done with message passing
            GlobalLoadDone=null;
        }
        var now = parseInt(new Date().getTime());
        frameratebuffer = Math.round(((frameratebuffer * 9) + 1000 / (now - lasttime)) / 10);
        //mouselook();
        //checkkeys();
        thus.renderer.render();
        lasttime = now;
        var debug=document.getElementById("debug");
        if (debug)
            debug.innerHTML = "Frame Rate:" + frameratebuffer;
        }
    setInterval(render, 16);
    canvas.addEventListener('mousedown',
                            function (e){thus._mouseDown(e);},
                            true);
    canvas.addEventListener('mouseup',
                                function(e){thus._mouseUp(e);},
                            true);
    canvas.addEventListener('mousemove',
                            function(e){thus._mouseMove(e);},
                            true);
    
};
(function(){
    function RenderTarget(graphicsSystem, canvas,textureCanvas) {
        this.mGraphicsSystem=graphicsSystem;
        this.mCanvas=canvas;
        this.mTextureCanvas=textureCanvas;        
        this.mTextureCamera = null;
        this.mCamera=null;
        this.mSpaceRoot=null;//not attached
    }
    RenderTarget.prototype.attachScene=function(spaceRoot,camera) {
        this.mSpaceRoot=spaceRoot;
        if (this.mTextureCamera==null) {
            this.mGraphicsSystem.setScene(spaceRoot.mScene);            
            spaceRoot.mScene.setCamera(camera);
        }else {
            console.log("Do not know how to deal with texture camera");
        }

    };
    RenderTarget.prototype.detachScene=function(spaceRoot) {
        if (this.mTextureCamera==null) {
            this.mSpaceRoot.mScene.setCamera(null);
            this.mGraphicsSystem.setScene(null);            
            
        }else{
             //FIXME
            console.log("Do not know how to deal with texture camera");
        }
        this.mSpaceRoot=null;
    };
    function VWObject(id,time,spaceid,spaceroot) {
        //var pack=spaceroot.mElement.client.createPack();
        
        this.mID = id;
        this.mSpaceID = spaceid;
        //this.mPack = pack;
        this.mNode = new GLGE.Group(id);
        this.mCurLocation=Kata.LocationIdentityNow();
        this.mPrevLocation=Kata.LocationIdentityNow(new Date(0));
        this.mNode.mKataObject=this;
        this.update = this.updateTransformation;
        this.mParent = null;
        spaceroot.addChild(this.mNode);
    };

    VWObject.prototype.createCamera = function(fov,hither,yon) {
        this.mHither = hither;
        this.mYon = yon;
        this.mFOV = fov;
        this.mCamera=new GLGE.camera(this.mID+"C");
        this.mNode.addChild(this.mCamera);
        this.update = this.updateCamera;
    };
    VWObject.prototype.destroyCamera = function() {
        this.detachRenderTarget();
        delete this.mHither;
        delete this.mYon;
        delete this.mFOV;
        this.mNode.removeChild(this.mCamera);
        delete this.mCamera;
        this.update = this.updateTransformation;
    };
    VWObject.prototype.attachRenderTarget = function(renderTarg, spaceRoot) {
        if (renderTarg.mCamera) {
            renderTarg.mCamera.detachRenderTarget();
        }
        this.detachRenderTarget();
        this.mRenderTarg = renderTarg;
        renderTarg.mCamera = this;
        renderTarg.attachScene(spaceRoot, this.mCamera);
        this.update(renderTarg.mGraphics);
    };

    VWObject.prototype.detachRenderTarget = function(curTime) {
        if (this.mRenderTarg) {
            var graphics=this.mRenderTarg.mO3DGraphics;
            this.mRenderTarg.detatchScene();
            this.mRenderTarg.mCamera = null;
            this.mRenderTarg.mSpaceRoot = null;
            
            delete this.mRenderTarg;
            this.update(graphics);
        }
    };
    VWObject.prototype.stationary = function (curTime) {
        var v=this.mCurLocation.vel;
        var a=this.mCurLocation.mAngVel;
        var t=curTime;//.getTime();
        return v[0]==0&&v[1]==0&&v[2]==0&&a==0&&t-this.mCurLocation.scaleTime/*.getTime()*/>=0&&t-this.mCurLocation.posTime/*.getTime()*/>=0&&t-this.mCurLocation.orientTime/*.getTime()*/>=0;
    };
    
    VWObject.prototype.updateTransformation = function(graphics) {
        var l=Kata.LocationInterpolate(this.mCurLocation,this.mPrevLocation,graphics.mCurTime);
        this.mNode.setLoc(l.pos[0],l.pos[1],l.pos[2]);
        this.mNode.setScale(l.scale[0],l.scale[1],l.scale[2]);
        this.mNode.setQuat(l.orient[0],l.orient[1],l.orient[2],l.orient[3]);
        if (this.stationary(graphics.mCurTime)) {
            graphics.removeObjectUpdate(this);        
        }
        return l;
    };
    VWObject.prototype.updateCamera = function(graphics) {
        var location=this.updateTransformation(graphics);
        /*
        var mat = o3djs.quaternions.quaternionToRotation(location.orient);
        //console.log(mat);
        o3djs.math.matrix4.setTranslation(mat, location.pos);
        this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.inverse(mat);
         */
        /*
         this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.matrix4.lookAt([0, 1, 5],  // eye
         [0, 0, 0],  // target
         [0, 1, 0]); // up
         */
    };

    function SpaceRoot(glgegfx, element, spaceID) {
        this.mElement = element;
        //this.mPack = this.mElement.client.createPack();
        this.mScene = new GLGE.Scene(spaceID);
        this.mDefaultRenderView = new RenderTarget(glgegfx, element, null);
        //this.mDefaultRenderView.createBasicView([0,0,0,0], [0,0,0,0]);
        //FIXME not sure what to do with this this.initializeDrawList(this.mDefaultRenderView.mViewInfo);
    }
    
    GLGEGraphics.prototype.methodTable={};
    
    GLGEGraphics.prototype.addObjectUpdate = function(vwObj) {
        this.mObjectUpdates[vwObj.mID] = vwObj;
    };
    
    GLGEGraphics.prototype.removeObjectUpdate = function(vwObj) {
        delete this.mObjectUpdates[vwObj.mID];
    };
    
    
    GLGEGraphics.prototype.send=function(obj) {
        return this.methodTable[obj.msg].call(this, obj);
    };
    GLGEGraphics.prototype.setInputCallback=function(cb) {
        this._inputCb = cb;
    };
    
    GLGEGraphics.prototype._extractMouseEventInfo = function(e){
        var ev = {};
        ev.type = e.type;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        ev.which = e.button;
        ev.x = e.offsetX;
        ev.y = e.offsetY;
        ev.screenX = e.screenX;
        ev.screenY = e.screenY;
        ev.clientX = e.clientX;
        ev.clientY = e.clientY;
        if (typeof(e.srcElement) != "undefined") {
            ev.width = e.srcElement.clientWidth;
            ev.height = e.srcElement.clientHeight;
        }
        else if (typeof(e.target != "undefined")) {
            ev.width = e.target.width;
            ev.height = e.target.height;
        }
        else {
            ev.width = 0;
            ev.height = 0;
        }
        return ev;
    };
    

    GLGEGraphics.prototype._mouseDown = function(e){
        if (e.button<2) this._buttonState="down";
        var ev = this._extractMouseEventInfo(e);
        var msg = {
            msg: "mousedown",
            event: ev
        };
        this._inputCb(msg);
    };
    
    GLGEGraphics.prototype._mouseUp = function(e){
        if (e.button<2) this._buttonState="up";
        var ev = this._extractMouseEventInfo(e);
        var msg = {
            msg: "mouseup",
            event: ev
    };
        this._inputCb(msg);
    };
    
    /*
     * for now, we only send mouse moves if left button depressed
     * otherwise we flood with messages.  Note right button is controlled by OS so we ignore
     */
    GLGEGraphics.prototype._mouseMove = function(e){
        if (this._buttonState == "down") {
            var ev = this._extractMouseEventInfo(e);
            var msg = {
                msg: "mousemove",
                event: ev
            };
            this._inputCb(msg);
        }
    };
    
    GLGEGraphics.prototype._scrollWheel = function(e){
        /// FIXME: figure out what event attributes to copy
        var msg = {
            msg: "wheel",
            event: e
        };
        this._inputCb(msg);
    };
    


    GLGEGraphics.prototype.methodTable["Create"]=function(msg) {//this function creates a scene graph node
        var s = msg.spaceid;
        if (!s) {
            s="";
        }
        if (!(s in this.mSpaceRoots)) {
            var dl =new SpaceRoot(this, this.mClientElement);
            this.mSpaceRoots[s] = dl;

            var rootsEmpty=true;
            for (var i in this.mSpaceRoots) {
                rootsEmpty=false;
                break;
            }
        }
        var spaceRoot=this.mSpaceRoots[s];
        var newObject;
        this.mObjects[msg.id]=newObject=new VWObject(msg.id,msg.time,msg.spaceid,spaceRoot);
        newObject.mParent=null;
        spaceRoot.mRootNode.addChild(newObject.mNode);
        this.moveTo(newObject,msg);
        newObject.updateTransformation(this);
        
        if (msg.id in this.mUnsetParents) {
            var unset=this.mUnsetParents[msg.id];
            var unsetl=unset.length;
            for (var i=0;i<unsetl;++i) {
                newObject.mNode.addChild(unset[i].mNode);//.parent=newObject.mNode;
                delete unset[i].mUnsetParent;
            }
        }
    };
    function LocationFromGLGETransformation(transformation,time) {
        return Kata.LocationSet({time:time,
                                 pos:[transformation.locX,transformation.locY,transformation.locZ],
                                 orient:[transformation.quatX,
                                         transformation.quatY,
                                         transformation.quatZ,
                                         transformation.quatW]});
};

    function glgeTransformationToLocationList(gfx,vwObject){
        var retval=[];
        while(vwObject!=null) {
            var loc=[vwObject.mPrevLocation,vwObject.mPrevLocation];
            retval.push(loc);
            vwObject=vwObject.mParent;
        }
        return retval;
    }
    GLGEGraphics.prototype.moveTo=function(vwObject,msg) {
	    if (!msg.time) msg.time = new Date().getMilliseconds();
        var prevParent=vwObject.mParent;
        var prevParentNode=null;
        var curParent=null;
        var curParentNode=null;
        if (prevParent==null){
            prevParentNode=this.mSpaceRoot[vwObject.mSpaceID].mScene;
        }else {
            prevParentNode=prevParent.mNode;
        }
        if (msg.parent!==undefined) {
            if (vwObject.mUnsetParent) {
                delete this.mUnsetParents[vwObject.mUnsetParent][msg.id];
                delete vwObject.mUnsetParent;
            }
            if (msg.parent) {
                if (msg.parent in this.mObjects) {
                    var parent=this.mObjects[msg.parent];
                    var parentNode=parent.mNode;
                    if (parent!=vwObject.mParent) {
                        prevParentNode.removeChild(vwObject.mNode);
                        vwObject.mParent=parent;
                        parentNode.addChild(vwObject.mNode);                
                        curParent=parent;
                        curParentNode=parentNode;
                    }
                }else {
                    if (!(msg.parent in this.mUnsetParents)) {
                        this.mUnsetParents[msg.parent]={};
                    }
                    this.mUnsetParents[msg.parent][msg.id]=vwObject;
                    vwObject.mUnsetParent=msg.parent;
                    var spaceRoot = this.mSpaceRoot[vwObject.mSpaceID];
                    if (vvwObject.mParent) {
                        vwObject.mParent.mNode.removeChild(vwObject.mNode);
                        spaceRoot.mScene.addChild(vwObject.mNode);
                        vwObject.mParent=null;
                    }
                    curParent=null;
                    curParentNode=sceneRoot.mScene;
                }
            }else {
                if (vwObject.mParent) {                    
                    prevParentNode.removeChild(vwObject.mNode);
                    curParent=null;
                    curParentNode=this.mSpaceRoot[vwObject.mSpaceID].mScene;
                    curParentNode.addChild(vwObject.mNode);
                    vwObject.mParent=null;
                }
            }
            var prevParentTransformation=glgeTransformationToLocationList(this,prevParent);
            var curParentTransformation=glgeTransformationToLocationList(this,curParent);
            vwObject.mPrevLocation=Kata.LocationReparent(vwObject.mPrevLocation,prevParentNode,curParentNode);
            vwObject.mCurLocation=Kata.LocationReparent(vwObject.mCurLocation,prevParentNode,curParentNode);
        }
        var newLoc=Kata.LocationUpdate(msg,vwObject.mCurLocation,vwObject.mPrevLocation,this.mCurTime);
        vwObject.mPrevLocation=vwObject.mCurLocation;
        vwObject.mCurLocation=newLoc;
        if (!vwObject.stationary(this.mCurTime)) {
            this.addObjectUpdate(vwObject);
        }
    };
    GLGEGraphics.prototype.methodTable["Move"]=function(msg) {
        var vwObject=this.mObjects[msg.id];
        this.moveTo(vwObject,msg);
        vwObject.updateTransformation(this);
    };
    GLGEGraphics.prototype.methodTable["Destroy"]=function(msg) {
        if (msg.id in this.mObjects) {
            var vwObject=this.mObjects[msg.id];
            var children=vwObject.mNode.getChildren();
            for (var i=0;i<children.length;++i) {
                if (!(msg.id in this.mUnsetParents)) {
                    this.mUnsetParents[msg.id]={};
                }
                var kataObject=children[i].mKataObject;
                if (kataObject) {
                    
                    this.mUnsetParents[msg.id][kataObject.mId]=kataObject;
                    kataObject.mUnsetParent=msg.id;
                    kataObject.mParent=null;
                    var spaceRoot=this.mSpaceRoots[children[i].mKataObject.mSpaceId];
                    var prevParentNode=glgeTransformationToLocationList(this,vwObject);
                    var curParentNode=glgeTransformationToLocationList(this,null);
                    
                    kataObject.mPrevLocation=Kata.LocationReparent(kataObject.mPrevLocation,prevParentNode,curParentNode);
                    kataObject.mCurLocation=Kata.LocationReparent(kataObject.mCurLocation,prevParentNode,curParentNode);

                    vwObject.mNode.removeChild(children[i]);//FIXME: is this appropriate?
                    spaceRoot.mScene.addChild(children[i]);
                }
            }
            //vwObject.mPack.destroy();
            delete this.mObjects[msg.id];
        }
    };
    GLGEGraphics.prototype.methodTable["MeshShaderUniform"]=function(msg) {
        //"Uniform "+msg.name+"="+msg.value;
    };
    GLGEGraphics.prototype.methodTable["Mesh"]=function(msg) {
        //q.innerHTML="Mesh "+msg.mesh;
        if (msg.mesh && msg.id in this.mObjects) {
            var vwObject=this.mObjects[msg.id];
            vwObject.createMesh(msg.mesh, msg.anim);//FIXME we need to add this function
            //msg.up_axis == "Z_UP"
                                // FIXME: needs to be permanent, so future setOrientations will be relative to this
                                //orient: [-0.7071067805519557, 0, 0, 0.7071067818211394]
            vwObject.updateTransformation(this);
        }
    };
    GLGEGraphics.prototype.methodTable["DestroyMesh"]=function(msg) {
        if (msg.id in this.mObjects) {
            var vwObject=this.mObjects[msg.id];
            vwObject.destroyMesh();
        }
    };
    GLGEGraphics.prototype.methodTable["Light"]=function(msg) {
        //q.innerHTML="Light "+msg.type;
    };
    GLGEGraphics.prototype.methodTable["DestroyLight"]=function(msg) {
        //destroyX(msg,"Light");
    };

    GLGEGraphics.prototype.methodTable["Camera"]=function(msg) {
        if (msg.id in this.mObjects) {
            var vwObject=this.mObjects[msg.id];
            vwObject.createCamera(o3djs.math.degToRad(45),
                                  0.1,
                                  50000);
        }
    };
    GLGEGraphics.prototype.methodTable["AttachCamera"]=function(msg) {
        var renderTarg;
        if (msg.id in this.mObjects && msg.target !== undefined) {
            var cam = this.mObjects[msg.id];
            var spaceView;
            console.log("cam.mSpaceID:", cam.mSpaceID);
            if (cam.mSpaceID in this.mSpaceRoots) {
                spaceView = this.mSpaceRoots[cam.mSpaceID];
            } else {
                spaceView = new SpaceRoot(this, this.mClientElement);
                this.mSpaceRoots[cam.mSpaceID] = spaceView;
            }
            if (cam.mCamera) {
                
            }
            renderTarg = this.mRenderTargets[msg.target];
            if (!renderTarg) {
                renderTarg = new RenderTarget(
                    this,
                    spaceView);
                this.mRenderTargets[msg.target] = renderTarg;
            }
            if (renderTarg) {
                cam.attachRenderTarget(renderTarg,spaceView);
            }
        }
    };
    GLGEGraphics.prototype.methodTable["DetachCamera"]=function(msg) {
        if (msg.id in this.mObjects) {
            var cam = this.mObjects[msg.id];
            cam.detachRenderTarget(this.mCurTime);
        }
    };
    GLGEGraphics.prototype.methodTable["DestroyCamera"]=function(msg) {
        if (msg.id in this.mObjects) {
            var vwObject=this.mObjects[msg.id];
            vwObject.destroyCamera();
        }
    };

    GLGEGraphics.prototype.methodTable["IFrame"]=function(msg) {
        /*UNIMPL*/
    };
    GLGEGraphics.prototype.methodTable["DestroyIFrame"]=function(msg) {
        //destroyX(msg,"IFrame");
    };



    // Register as a GraphicsSimulation if possible.
    Kata.defer(function() {
                   Kata.GraphicsSimulation.registerDriver("GLGE", GLGEGraphics);
               });
 })();
