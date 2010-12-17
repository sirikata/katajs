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
    this.mCurTime=new Date();
    this.callback=callbackFunction;
    var thus=this;
    {
        var canvas, gl;
        canvas = document.createElement('canvas');
        if (canvas) {
            try {
                gl = canvas.getContext("experimental-webgl", {});
            } 
            catch (e) {
                if (typeof(globalNoWebGLError) != "undefined") {
                    globalNoWebGLError();
                }
            }
        }
        if (!canvas || !gl) {
            if (typeof(globalNoWebGLError) != "undefined") {
                globalNoWebGLError();
            }
        }
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
                GLGEGraphics.canvasAspect = width/height;
                if (thus.mCamera) thus.mCamera.setAspect(GLGEGraphics.canvasAspect);
                canvas.sizeInitialized_ = true;
                thus.displayInfo = {width: canvas.width, height: canvas.height};
            };
            this.renderer=new GLGE.Renderer(canvas);
                //this.keys=new GLGE.KeyInput();
            
            window.addEventListener('resize', resizeHandler, false);
            setTimeout(resizeHandler, 0);                
        }
        this.mClientElement=canvas;
    }
    
    var lasttime = 0;
    var frameratebuffer = 60;
    this.mCurTime=new Date();
    this.mObjectUpdates = {}; // map id -> function
    this.mSpaceRoots={};
    this.mRenderTargets={};
    this.mUnsetParents={};
    this.mObjects={};
    this._keyDownMap = {};
    function render(){
        thus.mCurTime=new Date();
        var now = parseInt(thus.mCurTime.getTime());
        frameratebuffer = Math.round(((frameratebuffer * 9) + 1000 / (now - lasttime)) / 10);
        //mouselook();
        //checkkeys();
        thus.renderer.render();
        lasttime = now;
        for (var id in thus.mObjectUpdates) {        
            thus.mObjectUpdates[id].update(thus);
            
        }
	    if (Kata.userRenderCallback) {
		    Kata.userRenderCallback(thus.mCurTime);
	}
        
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
    document.addEventListener('keydown',
                            function (e){thus._keyDown(e);},
                            true);
    document.addEventListener('keyup',
                            function(e){thus._keyUp(e);},
                            true);
    canvas.addEventListener('mousewheel',                           /// Chrome
                            function(e){thus._scrollWheel(e);},
                            true);
    canvas.addEventListener('DOMMouseScroll',                       /// FF
                            function(e){thus._scrollWheel(e);},
                            true);
    canvas.addEventListener('contextmenu', 
    function(e){
        if (e.preventDefault) 
            e.preventDefault();
        else 
            e.returnValue = false;
        return false;
    }, true);
    
};

Kata.require([
    'katajs/oh/GraphicsSimulation.js',
    ['katajs/gfx/WebGLCompat.js', 'externals/GLGE/glge_math.js', 'externals/GLGE/glge.js', 'externals/GLGE/glge_collada.js']
], function(){
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
            this.mGraphicsSystem.renderer.setScene(spaceRoot.mScene);            
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
        this.mMesh = null;
        this.mLabel = null;
        this.mCurLocation=Kata.LocationIdentity(new Date(0));
        this.mPrevLocation=Kata.LocationIdentity(new Date(0));
        this.mNode.mKataObject=this;
        this.update = this.updateTransformation;
        this.mParent = null;
        spaceroot.mScene.addChild(this.mNode);

        this.mLoaded = false;
    };

    /// note: animation ignored
    VWObject.prototype.createMesh = function(gfx, path, animation, offset, scale) {
        if (path == null) {
            throw "loadScene with null path";
        }
        if (path.lastIndexOf(".dae")==-1) {
            path += ".dae";            
        }
        if (offset === undefined || offset === null)
            offset = [0, 0, 0];
        console.log("Loading: " + path);
        this.mMeshURI = path;
        var thus = this;
        var clda = new GLGE.Collada();
        var loadedCallback;
        loadedCallback=function(){
            var bv=clda.getBoundingVolume(true);
            var maxv=bv.radius;
            var colladaUnitRescale=1/maxv;
            //console.log("Scaling by "+colladaUnitRescale+" instead of "+scale);
            //console.log("Offsetting by -["+bv.center+"] instead of "+offset);
            clda.setScaleX(maxv?scale[0]*colladaUnitRescale:1);
            clda.setScaleY(maxv?scale[1]*colladaUnitRescale:1);
            clda.setScaleZ(maxv?scale[2]*colladaUnitRescale:1);
            clda.setLocX(offset[0]-(bv.center[0])*colladaUnitRescale);
            clda.setLocY(offset[1]-(bv.center[1])*colladaUnitRescale);
            clda.setLocZ(offset[2]-(bv.center[2])*colladaUnitRescale);            
            gfx._inputCb({msg:"loaded",id:thus.mID});
            clda.removeEventListener("loaded",loadedCallback);

            thus.mLoaded = true;

            // If somebody set an animation *while* we were loading, honor that request now
            if (thus.mCurAnimation) {
                // Clear out first to make sure we actually run it
                var anim = thus.mCurAnimation;
                thus.mCurAnimation = "";
                thus.animate(anim);
            }
        };
        clda.addEventListener("loaded",loadedCallback);
        clda.setDocument(this.mMeshURI);
    
        if (!scale) scale = [1.0, 1.0, 1.0];
        clda.setScaleX(scale[0]);
        clda.setScaleY(scale[1]);
        clda.setScaleZ(scale[2]);
        clda.setQuatX(0.0);
        clda.setQuatY(0.0);
        clda.setQuatZ(0.0);
        clda.setQuatW(1.0);
        if (offset) {
            clda.setLocX(offset[0]);
            clda.setLocY(offset[1]);
            clda.setLocZ(offset[2]);            
        }
        this.mNode.addCollada(clda);
        this.mMesh = clda;
        return clda;
    };

    VWObject.prototype.createCamera = function(fov,near,far) {
        this.mFOV = fov;
        this.mCamera=new GLGE.Camera(this.mID+"C");
        this.mCamera.setFovY(fov*GLGEGraphics.canvasAspect);
        this.mCamera.setNear(near);
        this.mCamera.setFar(far);
        if (GLGEGraphics.canvasAspect) this.mCamera.setAspect(GLGEGraphics.canvasAspect);
        this.mNode.addChild(this.mCamera);
        this.update = this.updateCamera;
    };
    VWObject.prototype.destroyCamera = function() {
        this.detachRenderTarget();
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
        this.update(renderTarg.mGraphicsSystem);
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
        var a=this.mCurLocation.rotvel;
        var t=curTime;//.getTime();
        return v[0]==0&&v[1]==0&&v[2]==0&&a==0&&t-this.mCurLocation.scaleTime/*.getTime()*/>=0&&t-this.mCurLocation.posTime/*.getTime()*/>=0&&t-this.mCurLocation.orientTime/*.getTime()*/>=0;
    };
    
    VWObject.prototype.updateTransformation = function(graphics) {
        var l=Kata.LocationExtrapolate(this.mCurLocation, graphics.mCurTime);
        this.mNode.setLoc(l.pos[0],l.pos[1],l.pos[2]);
        // Setting scale on cameras does wonky things to lighting
        if (!this.mCamera) {
            this.mNode.setScale(l.scale[0],l.scale[1],l.scale[2]);
        }
        this.mNode.setQuat(l.orient[0],l.orient[1],l.orient[2],l.orient[3]);
        if (this.stationary(graphics.mCurTime)) {
            graphics.removeObjectUpdate(this);        
            //console.log("Stationary ",this.mID,l,l.pos[0],l.pos[1],l.pos[2]);
        }
        return l;
    };
    VWObject.prototype.updateCamera = function(graphics) {
        var location=this.updateTransformation(graphics, true);
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
    VWObject.prototype.animate = function(anim_name) {
        var mesh = this.mMesh;
        if (!mesh)
            Kata.warn("Couldn't handle animate request.");

        if (anim_name == this.mCurAnimation) return;

        var actions = mesh.getColladaActions();
        var new_anim = actions[anim_name];
        if (!new_anim) {
            // When loading, still record current animation so we can start it when loading finishes
            if (!this.mLoaded)
                this.mCurAnimation = anim_name;
            return;
        }

        this.mCurAnimation = anim_name;
        mesh.setAction(new_anim, 400, true);
    };
    VWObject.prototype.label = function(label, offset) {
        var label_node = this.mLabel;
        if (label_node === null) {
            // create
            label_node = new GLGE.Text();
            this.mLabel = label_node;

            // FIXME text seems broken in glge, breaking on a
            // sort. Adding a bogus material is sufficient to get it
            // working.
            label_node.multimaterials = [ new GLGE.MultiMaterial() ];
            var material=new GLGE.Material();
            label_node.multimaterials[0].setMaterial(material);

            this.mNode.addChild(label_node);
        }
        if (offset === undefined) offset = [0, 0, 0];
        label_node.setScaleX(.1);
        label_node.setScaleY(.1);
        label_node.setScaleZ(.1);
        label_node.setQuatX(0.0);
        label_node.setQuatY(0.0);
        label_node.setQuatZ(0.0);
        label_node.setQuatW(1.0);
        label_node.setLocX(offset[0]);
        label_node.setLocY(offset[1]);
        label_node.setLocZ(offset[2]);
        label_node.setColor({r:0.0,g:0.0,b:0.0});
        label_node.setSize(200);
        label_node.setText(label);
    };

    function SpaceRoot(glgegfx, element, spaceID) {
        this.mElement = element;
        //this.mPack = this.mElement.client.createPack();
//        this.mScene = new GLGE.Scene(spaceID);
        this.mScene = g_GLGE_doc.getElement("mainscene");
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
        if (obj.msg!="Custom")
            this.methodTable[obj.msg].call(this, obj);
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
        ev.x = e.clientX;
        ev.y = e.clientY;
        ev.screenX = e.screenX;
        ev.screenY = e.screenY;
        ev.clientX = e.clientX;
        ev.clientY = e.clientY;
        var el = null;
        if (typeof(e.srcElement) != "undefined") {
            el = e.srcElement;
            ev.width = e.srcElement.clientWidth;
            ev.height = e.srcElement.clientHeight;
        }
        else if (typeof(e.target != "undefined")) {
            el = e.target;
            ev.width = e.target.width;
            ev.height = e.target.height;
        }
        else {
            ev.width = 0;
            ev.height = 0;
        }
        while (el != null) {
            ev.x -= el.offsetLeft || 0;
            ev.y -= el.offsetTop || 0;
            el = el.offsetParent;
        }
        return ev;
    };
    

    GLGEGraphics.prototype._mouseDown = function(e){
        this._buttonState |= Math.pow(2, e.button);
        var ev = this._extractMouseEventInfo(e);
        var msg = {
            msg: "mousedown",
            event: ev
        };
        if (ev.which==2) {
            document.body.style.cursor="crosshair";
        }
        this._inputCb(msg);
    };
    
    GLGEGraphics.prototype._mouseUp = function(e){
        this._buttonState &= 7 - Math.pow(2, e.button);
        var ev = this._extractMouseEventInfo(e);
        var msg = {
            msg: "mouseup",
            event: ev
        };
        if (ev.which == 2) {
            document.body.style.cursor = "default";
        }
        this._inputCb(msg);
    };
    
    /*
     * for now, we only send mouse moves if left button depressed
     * otherwise we flood with messages.  Note right button is controlled by OS so we ignore
     */
    GLGEGraphics.prototype._mouseMove = function(e){
        if (this._buttonState) {
            var ev = this._extractMouseEventInfo(e);
            var msg = {
                msg: "mousemove",
                event: ev
            };
            this._inputCb(msg);
        }
    };

    GLGEGraphics.prototype._keyDown = function(e){
        if (Kata.suppressCanvasKeyInput) return;
        this._keyDownMap[e.keyCode]=-1;
        var ev = {};
        ev.type = e.type;
        ev.keyCode = e.keyCode;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        var msg = {
            msg: "keydown",
            event: ev
        };
        this._inputCb(msg);
    };

    GLGEGraphics.prototype._keyUp = function(e) {
        if (!this._keyDownMap[e.keyCode]) {
            return;
        }
        var ev = {};
        ev.type = e.type;
        ev.keyCode = e.keyCode;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        var msg = {
            msg: "keyup",
            event: ev
        };
        var me=this;
        this._keyDownMap[e.keyCode] = 1;
        setTimeout(function () {                            /// wait to see if we're part of a bogus key repeat
            if (me._keyDownMap[e.keyCode] == 1) {           /// if fail, then keydown (or another keyup?) occured in last 50 ms
                me._keyDownMap[e.keyCode] = 0;              /// if no other events on this key, fire the real keyup event & clear map
                me._inputCb(msg);
            }
        }, 50);
    };

    GLGEGraphics.prototype._scrollWheel = function(e){
        var ev = {};
        ev.type = e.type;
        ev.shiftKey = e.shiftKey;
        ev.altKey = e.altKey;
        ev.ctrlKey = e.ctrlKey;
        if (e.wheelDelta != null) {         /// Chrome
            ev.dy = e.wheelDelta;
        }
        else {                              /// Firefox
            ev.dy = e.detail * -40;         /// -3 for Firefox == 120 for Chrome
        }
        var msg = {
            msg: "wheel",
            event: ev
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
	    if (!msg.time) msg.time = new Date().getTime();
        var prevParent=vwObject.mParent;
        var prevParentNode=null;
        var curParent=null;
        var curParentNode=null;
        if (prevParent==null){
            prevParentNode=this.mSpaceRoots[vwObject.mSpaceID].mScene;
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
                    var spaceRoot = this.mSpaceRoots[vwObject.mSpaceID];
                    if (vwObject.mParent) {
                        vwObject.mParent.mNode.removeChild(vwObject.mNode);
                        spaceRoot.mScene.addChild(vwObject.mNode);
                        vwObject.mParent=null;
                    }
                    curParent=null;
                    curParentNode=this.mSpaceRoots[vwObject.mSpaceID].mScene;
                }
            }else {
                if (vwObject.mParent) {                    
                    prevParentNode.removeChild(vwObject.mNode);
                    curParent=null;
                    curParentNode=this.mSpaceRoots[vwObject.mSpaceID].mScene;
                    curParentNode.addChild(vwObject.mNode);
                    vwObject.mParent=null;
                }
            }
            var prevParentTransformation=glgeTransformationToLocationList(this,prevParent);
            var curParentTransformation=glgeTransformationToLocationList(this,curParent);
            vwObject.mPrevLocation=Kata.LocationReparent(vwObject.mPrevLocation,prevParentNode,curParentNode);
            vwObject.mCurLocation=Kata.LocationReparent(vwObject.mCurLocation,prevParentNode,curParentNode);
        }
        var newLoc=Kata.LocationUpdate(msg,vwObject.mCurLocation,vwObject.mPrevLocation,msg.time||this.mCurTime);
        vwObject.mPrevLocation=vwObject.mCurLocation;
        vwObject.mCurLocation=newLoc;
        if (!vwObject.stationary(this.mCurTime)) {
            this.addObjectUpdate(vwObject);
        }
    };
    GLGEGraphics.prototype.methodTable["Move"]=function(msg) {
        var vwObject=this.mObjects[msg.id];
        this.moveTo(vwObject,msg);
        vwObject.update(this);
    };
    GLGEGraphics.prototype.methodTable["Animate"]=function(msg) {
        var vwObject = this.mObjects[msg.id];
        vwObject.animate(msg.animation);
    };
    GLGEGraphics.prototype.methodTable["Label"]=function(msg) {
        var vwObject = this.mObjects[msg.id];
        if (vwObject)
            vwObject.label(msg.label, msg.offset);
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
            this.mSpaceRoots[msg.space].mScene.removeChild(vwObject.mNode);
            delete this.mObjects[msg.id];
        }
    };
    GLGEGraphics.prototype.methodTable["MeshShaderUniform"]=function(msg) {
        //"Uniform "+msg.name+"="+msg.value;
    };
    GLGEGraphics.prototype.methodTable["Mesh"]=function(msg) {
        if (msg.mesh && msg.id in this.mObjects) {
            var vwObject = this.mObjects[msg.id];
            vwObject.createMesh(this, msg.mesh, msg.anim, msg.center?[-msg.center[0],-msg.center[1],-msg.center[2]]:null, msg.scale, msg.bounds);
            /// old cruft code, disabling
            //if (msg.up_axis == "Z_UP") {
            //    this.moveTo(vwObject, {
            //        // FIXME: needs to be permanent, so future setOrientations will be relative to this
            //        orient: [-0.7071067805519557, 0, 0, 0.7071067818211394]
            //    });
            //}
            vwObject.update(this);
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
            vwObject.createCamera(Kata.GraphicsSimulation.YFOV_DEGREES,
                                  Kata.GraphicsSimulation.CAMERA_NEAR,
                                  Kata.GraphicsSimulation.CAMERA_FAR);
            this.mCamera = vwObject.mCamera;    /// need to keep track of camera in case of canvas resize
        }
    };
    GLGEGraphics.prototype.methodTable["AttachCamera"]=function(msg) {
        var renderTarg;
        if (msg.id in this.mObjects && msg.target !== undefined) {
            var cam = this.mObjects[msg.id];
            var spaceView;
//            console.log("cam.mSpaceID:", cam.mSpaceID);
            if (cam.mSpaceID in this.mSpaceRoots) {
                spaceView = this.mSpaceRoots[cam.mSpaceID];
            } else {
                spaceView = new SpaceRoot(this, this.mClientElement);
                this.mSpaceRoots[cam.mSpaceID] = spaceView;
            }
            renderTarg = this.mRenderTargets[msg.target];
            if (!renderTarg) {
                renderTarg = new RenderTarget(
                    this,
                    this.mClientElement,
                    null);
                this.mRenderTargets[msg.target] = renderTarg;
            }
            
            if (cam.mCamera) {
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
    GLGEGraphics.prototype.methodTable["CaptureCanvas"]=function(msg) {
      try {
        var msg = {
            msg: "canvasCapture",
            img: this.mClientElement.toDataURL()
        };
      }
      catch (e) {
        var msg = {
            msg: "canvasCapture",
            img: ""
        };
      }
      this._inputCb(msg);
    };

    // Register as a GraphicsSimulation if possible.
    Kata.GraphicsSimulation.registerDriver("GLGE", GLGEGraphics);
}, "katajs/gfx/glgegfx.js");
