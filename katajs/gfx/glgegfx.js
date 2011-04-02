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
    this.doubleBuffer=3;
    this.mAnimatingObjects={};
    this.windowVisible=true;
    this.canvasVisible=true;
    this.mDoCaptureCanvas=0;//+1 for each request
    var thus=this;
    {
        var canvas, gl;
        canvas = document.createElement('canvas');
        if (!GLGEGraphics.GLOBAL_KEYBOARD_GRAB) {
            canvas.setAttribute('tabindex', '0');
        }
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
            canvas.focus();
            var resizeHandler = function() {
                var width = Math.max(1, canvas.clientWidth);
                var height = Math.max(1, canvas.clientHeight);
                canvas.width = width;
                canvas.height = height;
                GLGEGraphics.canvasAspect = width/height;
                if (thus.mCamera) thus.mCamera.setAspect(GLGEGraphics.canvasAspect);
                canvas.sizeInitialized_ = true;
                thus.displayInfo = {width: canvas.width, height: canvas.height};
                thus.newEvent();

                for (var spaceRoot in thus.mSpaceRoots) {
                    var msg={};
                    msg.spaceid=spaceRoot;
                    thus.reloadBackground(thus.mSpaceRoots[spaceRoot]);
                }
            };
            this.renderer=new GLGE.Renderer(canvas);
            this.renderer.cullFaces=true;
                //this.keys=new GLGE.KeyInput();
            
            window.addEventListener('resize', resizeHandler, false);
            setTimeout(resizeHandler, 0);                
        }
        this.mClientElement=canvas;
    }
    
    this.mCurTime=new Date();
    this.mObjectUpdates = {}; // map id -> function
    this.mSpaceRoots={};
    this.mRenderTargets={};
    this.mUnsetParents={};
    this.mObjects={};
    this._keyDownMap = {};
    this._enabledEvents = {};
    this._lastMouseDown = null;
    this._mouseMoveSinceLastRender = false;
    function render(){
        thus.render();
	}
        
    
    function initialTextureLoadHack(){
        var anyAnim=false;
        for (animObject in thus.mAnimatingObjects) {
            anyAnim=true;
            break;
        }
        if (!anyAnim){
            this.newEvent();
        }
    }
    //setInterval(initialTextureLoadHack,533);
    setInterval(render, 16);
    if (GLGEGraphics.GLOBAL_KEYBOARD_GRAB) {
        document.addEventListener('keydown',
                                  function (e){thus._keyDown(e);},
                                  true);
    }
    // keyup handler is global, so that if you lose focus while the key is
    // pressed, you still get the event.
    document.addEventListener('keyup',
                              function(e){thus._keyUp(e);},
                              true);
    canvas.addEventListener('keydown',
                            function (e){thus._keyDown(e);},
                            true);
    
    window.addEventListener('focus',
                            function (e){thus.windowVisible=true;},
                            false);
    window.addEventListener('blur',
                            function (e){thus.windowVisible=false;},
                            false);
    canvas.addEventListener('focus',
                            function (e){thus.canvasVisible=true;},
                            false);
    canvas.addEventListener('blur',
                            function (e){thus.canvasVisible=false;},
                            false);
    canvas.addEventListener('mousedown',
                            function (e){thus._mouseDown(e);},
                            true);
    canvas.addEventListener('mouseup',
                            function(e){thus._mouseUp(e);},
                            true);
    canvas.addEventListener('mousemove',
                            function(e){thus._mouseMove(e);},
                            true);
    canvas.addEventListener('mousewheel',                           /// Chrome
                            function(e){thus._scrollWheel(e);},
                            true);
    canvas.addEventListener('DOMMouseScroll',                       /// FF
                            function(e){thus._scrollWheel(e);},
                            true);
    canvas.addEventListener('click',
                            function(e){thus.mClientElement.focus();},
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
    ['katajs/gfx/WebGLCompat.js',
     'katajs/gfx/layer0.js',
     'katajs/gfx/layer1.js',
     'katajs/gfx/layer2.js',
     'katajs/gfx/layer2_no_sunbeams.js',
     'externals/GLGE/src/core/glge.js',
     'externals/GLGE/src/core/glge_event.js',
     'externals/GLGE/src/core/glge_animatable.js',
     'externals/GLGE/src/core/glge_document.js',
     'externals/GLGE/src/core/glge_math.js',
     'externals/GLGE/src/core/glge_messages.js',
     'externals/GLGE/src/core/glge_placeable.js',
     'externals/GLGE/src/core/glge_quicknote.js',
     'externals/GLGE/src/core/glge_jsonloader.js',
     'externals/GLGE/src/core/glge_group.js',
     'externals/GLGE/src/scene/glge_scene.js',
     'externals/GLGE/src/scene/glge_light.js',
     'externals/GLGE/src/scene/glge_camera.js',
     'externals/GLGE/src/renderable/glge_object.js',
     'externals/GLGE/src/renders/glge_renderer.js',
     'externals/GLGE/src/extra/glge_input.js',
     'externals/GLGE/src/extra/glge_particles.js',
     'externals/GLGE/src/extra/glge_filter2d.js',
     'externals/GLGE/src/extra/glge_xmlparser.js',
     'externals/GLGE/src/extra/glge_wavefront.js',
     'externals/GLGE/src/extra/glge_collada.js',
     'externals/GLGE/src/geometry/glge_mesh.js',
     'externals/GLGE/src/material/glge_texturecube.js',
     'externals/GLGE/src/material/glge_texture.js',
     'externals/GLGE/src/material/glge_texturevideo.js',
     'externals/GLGE/src/material/glge_texturecanvas.js',
     'externals/GLGE/src/material/glge_material.js',
     'externals/GLGE/src/material/glge_texturecamera.js',
     'externals/GLGE/src/material/glge_multimaterial.js',
     'externals/GLGE/src/material/glge_materiallayer.js',
     'externals/GLGE/src/renderable/glge_text.js',
     'externals/GLGE/src/renderable/glge_lod.js',
     'externals/GLGE/src/animation/glge_actionchannel.js',
     'externals/GLGE/src/animation/glge_animationvector.js',
     'externals/GLGE/src/animation/glge_animationcurve.js',
     'externals/GLGE/src/animation/glge_animationpoints.js',
     'externals/GLGE/src/animation/glge_action.js']], function(){
    GLGEGraphics.prototype.newEvent=function (){
        this.doubleBuffer=3;
    };
    GLGEGraphics.prototype.render=function () {
        var thus=this;
        thus._mouseMoveSinceLastRender = false;
        thus.mCurTime=new Date();
        var now = parseInt(thus.mCurTime.getTime());
        //mouselook();
        //checkkeys();
        var anyUpdates=false;
        for (var id in thus.mObjectUpdates) {        
            thus.mObjectUpdates[id].update(thus);
            thus.newEvent(); 
            anyUpdates=true;
        }
        var didRender=false;
        if (!thus.doubleBuffer)
            for (animObject in thus.mAnimatingObjects) {
                if (thus.windowVisible){
                    thus.newEvent();
                }
                break;
            }
        if (thus.doubleBuffer >0) {
            thus.doubleBuffer-=1;
            thus.renderer.render();            
            didRender=true;
        }
        if (didRender){
            var scene=this.renderer.getScene();            
            if (scene) {
                var filter=scene.getFilter2d();
                if (filter) {
                    var lights=scene.getLights();
                    var pos=[0,0,0,1];
                    for (var i=0;i<lights.length;++i) {
                        if (i==0||lights[i].getCastShadows())
                            pos=GLGE.mulMat4Vec4(lights[i].getModelMatrix(),GLGE.Vec4(0,0,0,1));
                        
                    }
	                var lightloc=GLGE.mulMat4Vec4(scene.camera.getProjectionMatrix(),
                                                  GLGE.mulMat4Vec4(scene.camera.getViewMatrix(),
                                                                   pos));

	                lightloc=[(lightloc[0]/lightloc[3]+1)/2,
                                  (lightloc[1]/lightloc[3]+1)/2,
                                  (lightloc[2]/lightloc[3]+1)/2];
	                filter.setUniform("3fv","lightpos",new Float32Array(lightloc));
	                var invProjView=GLGE.mulMat4(GLGE.inverseMat4(scene.camera.getViewMatrix()),GLGE.inverseMat4(scene.camera.getProjectionMatrix()));
	                filter.setUniform("Matrix4fv","invProjView",new Float32Array(GLGE.transposeMat4(invProjView)));
                }
            }
        }
	    if (Kata.userRenderCallback) {
		    Kata.userRenderCallback(thus.mCurTime);
        }
        if (this.mDoCaptureCanvas&&!anyUpdates) {
            this.methodTable["CaptureCanvas"].call(this,{});
            this.mDoCaptureCanvas-=1;
        }
    };
    /** Static initialization method. */
    GLGEGraphics.initialize = function(scenefile, cb) {
        g_GLGE_doc = new GLGE.Document();
        g_GLGE_doc.onLoad = cb;
        g_GLGE_doc.load(scenefile);
    };

    function RenderTarget(graphicsSystem, canvas,textureCanvas) {
        this.mGraphicsSystem=graphicsSystem;
        this.mCanvas=canvas;
        this.mTextureCanvas=textureCanvas;        
        this.mTextureCamera = null;
        this.mCamera=null;
        this.mSpaceRoot=null;//not attached
        this.mOriginalMaterials=null;
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
    function getGroupBoundingVolume (thus, currentMatrix){
        var localMatrix=thus.getLocalMatrix();
        if (currentMatrix) {
            localMatrix=GLGE.mulMat4(currentMatrix,localMatrix);
        }
	    var boundingVolume=null;
	    for(var i=0; i<thus.children.length;i++){
		    //if(thus.children[i].getBoundingVolume){
			    if(!boundingVolume) {
				    boundingVolume=computeBoundingVolume(thus.children[i],localMatrix);
			    }else{
				    boundingVolume.addBoundingVolume(computeBoundingVolume(thus.children[i],localMatrix));
			    }
		    //}
	    }
	    if(!boundingVolume) boundingVolume=new GLGE.BoundingVolume(0,0,0,0,0,0);
	    return boundingVolume;
    };

    function getObjectBoundingVolume (thus, currentMatrix){
        var localMatrix=thus.getLocalMatrix();
        if (currentMatrix) {
            localMatrix=GLGE.mulMat4(currentMatrix,localMatrix);
        }	
	    var matrix=thus.getModelMatrix();
		var multimaterials=thus.multimaterials;
		var boundingVolume=null;
		for(var i=0;i<multimaterials.length;i++){
			if(multimaterials[i].lods[0].mesh){
				if(!boundingVolume){
					boundingVolume=getMeshBoundingVolume(multimaterials[i].lods[0].mesh,localMatrix);
				}else{
					boundingVolume.addBoundingVolume(getMeshBoundingVolume(multimaterials[i].lods[0].mesh,localMatrix));
				}
			}
		}
		if(!boundingVolume) boundingVolume=new GLGE.BoundingVolume(0,0,0,0,0,0);
        return boundingVolume;
    };

    function getMeshBoundingVolume(thus, currentMatrix) {
        function mulMat4Vec3(mat1,vec2){
	        return GLGE.Vec3(mat1[0]*vec2[0]+mat1[1]*vec2[1]+mat1[2]*vec2[2]+mat1[3],
			                 mat1[4]*vec2[0]+mat1[5]*vec2[1]+mat1[6]*vec2[2]+mat1[7],
			                 mat1[8]*vec2[0]+mat1[9]*vec2[1]+mat1[10]*vec2[2]+mat1[11]);
        };

		var minX,maxX,minY,maxY,minZ,maxZ;
		for(var i=0;i<thus.buffers.length;i++){
			if(thus.buffers[i].name=="position") {
                var positions=thus.buffers[i].data;
		        
                if (currentMatrix) {
                    if (positions.length>=3) {               
                        var loc=mulMat4Vec3(currentMatrix,positions.slice(0,3));
			            minX=maxX=loc[0];
			            minY=maxY=loc[1];
			            minZ=maxZ=loc[2];
                    }else {
                        minX=minY=minZ=maxX=maxY=maxZ=0;
                    }
		            for(var j=3;j+2<positions.length;j=j+3){
                        var loc=mulMat4Vec3(currentMatrix,positions.slice(j,j+3));
				        minX=Math.min(minX,loc[0]);
				        maxX=Math.max(maxX,loc[0]);
				        minY=Math.min(minY,loc[1]);
				        maxY=Math.max(maxY,loc[1]);
				        minZ=Math.min(minZ,loc[2]);
				        maxZ=Math.max(maxZ,loc[2]);
		            }
                    
                }else {            
                    if (positions.length>=3) {               
			            minX=maxX=positions[0];
			            minY=maxY=positions[1];
			            minZ=maxZ=positions[2];
                    }else {
                        minX=minY=minZ=maxX=maxY=maxZ=0;
                    }
		            for(var j=3;j+3<positions.length;i=j+3){
				        minX=Math.min(minX,positions[i]);
				        maxX=Math.max(maxX,positions[i]);
				        minY=Math.min(minY,positions[i+1]);
				        maxY=Math.max(maxY,positions[i+1]);
				        minZ=Math.min(minZ,positions[i+2]);
				        maxZ=Math.max(maxZ,positions[i+2]);
			            
		            }
                }
            }
        }
		return new GLGE.BoundingVolume(minX,maxX,minY,maxY,minZ,maxZ);
	}


    function computeBoundingVolume(glge_object, currentMatrix){
        switch (glge_object.getBoundingVolume){
        case GLGE.Group.prototype.getBoundingVolume:
            return getGroupBoundingVolume(glge_object,currentMatrix);
        case GLGE.Mesh.prototype.getBoundingVolume:
            return getMeshBoundingVolume(glge_object,currentMatrix);
        case GLGE.Object.prototype.getBoundingVolume:
        default:
            return getObjectBoundingVolume(glge_object,currentMatrix);
        }
        
    }
    function VWObject(id,time,spaceid,spaceroot) {
        //var pack=spaceroot.mElement.client.createPack();
        
        this.mID = id;
        this.mSpaceID = spaceid;
        //this.mPack = pack;
        this.mNode = new GLGE.Group(id);
        this.mMesh = null;
        this.mBounds=[0,0,0,1];
        this.mLabel = null;
        this.mCurLocation=Kata.LocationIdentity(new Date(0));
        this.mPrevLocation=Kata.LocationIdentity(new Date(0));
        this.mNode.mKataObject=this;
        this.update = this.updateTransformation;
        this.mParent = null;
        spaceroot.mScene.addChild(this.mNode);

        this.mLoaded = false;
    };
    VWObject.prototype.getMeshAspectRatio = function () {
        if (!this.bv) return [0,0,0];
        var retval=[this.bv.limits[1]-this.bv.limits[0],
                    this.bv.limits[3]-this.bv.limits[2],
                    this.bv.limits[5]-this.bv.limits[4]];
        retval[0]/=this.bv.radius*2;
        retval[1]/=this.bv.radius*2;
        retval[2]/=this.bv.radius*2;
        return retval;
    };
    VWObject.prototype.queryMeshAspectRatio = function (gfx) {
        gfx._inputCb({msg:"MeshAspectRatio",id:this.mID,aspect:this.getMeshAspectRatio()});
    };
    /// note: animation ignored
    VWObject.prototype.createMesh = function(gfx, path, animation, bounds) {
        if (path == null) {
            throw "loadScene with null path";
        }
        if (path.lastIndexOf(".dae")==-1) {
            path += ".dae";            
        }
        this.mMeshURI = path;
        var thus = this;
        var clda = new GLGE.Collada();
        this.mLoading=true;
        if (this.mID in gfx.mAnimatingObjects)
            delete gfx.mAnimatingObjects[thus.mID];
        var loadedCallback;
        loadedCallback=function(){
	    clda.setScaleX(1);
	    clda.setScaleY(1);
	    clda.setScaleZ(1);
            var bv=computeBoundingVolume(clda);//clda.getBoundingVolume(true);
            var maxv=bv.radius;
            var colladaUnitRescale=1/maxv;
            
            //console.log("Scaling by "+colladaUnitRescale+" instead of "+scale);
            //console.log("Offsetting by -["+thus.bv.center+"] instead of "+offset);
            clda.setScaleX(maxv?thus.mBounds[3]*colladaUnitRescale:1);
            clda.setScaleY(maxv?thus.mBounds[3]*colladaUnitRescale:1);
            clda.setScaleZ(maxv?thus.mBounds[3]*colladaUnitRescale:1);
            clda.setLocX(thus.mBounds[0]-(bv.center[0]*colladaUnitRescale)*thus.mBounds[3]);
            clda.setLocY(thus.mBounds[1]-(bv.center[1]*colladaUnitRescale)*thus.mBounds[3]);
            clda.setLocZ(thus.mBounds[2]-(bv.center[2]*colladaUnitRescale)*thus.mBounds[3]);

            gfx._inputCb({msg:"loaded",id:thus.mID});
            clda.removeEventListener("loaded",loadedCallback);

            thus.mLoaded = true;
            gfx.newEvent();
            // If somebody set an animation *while* we were loading, honor that request now
            if (thus.mCurAnimation) {
                // Clear out first to make sure we actually run it
                var anim = thus.mCurAnimation;
                thus.mCurAnimation = "";
                thus.animate(anim);
            }
            function hasAnimations(node) {
                if (node.getAnimation()){
                    return true;
                }
                var child;
                var i;
                if (node.children)
                    for (i=0;i<node.children.length;++i){
                        child=node.children[i];
                        if (hasAnimations(child))
                            return true;
                    }
                return false;
            }
            if (thus.mMesh==clda) {
                thus.bv=bv;
                delete thus.mLoading;
		thus.updateTransformation(gfx);
                if (hasAnimations(clda)) {
                    gfx.mAnimatingObjects[thus.mID]=thus.mNode;
                    setTimeout(function(){gfx.newEvent();},8000);
                    setTimeout(function(){gfx.newEvent();},4000);
                }
                if (thus.mQueryAspectCount){
                    for (var i=0;i<thus.mQueryAspectCount;++i) {
                        thus.queryMeshAspectRatio(gfx);
                    }
                    delete thus.mQueryAspectCount;                    
                }
            }else if (thus.mQueryAspectCount && thus.mQueryAspectCount > 1){
                thus.queryMeshAspectRatio(gfx);
                thus.mQueryAspectCount--;//update it once before the load so tha
            }
        };
        var downloadedCallback=function(){
            gfx.newEvent();
            gfx._inputCb({msg:"downloadComplete",id:thus.mID});
            clda.removeEventListener("downloadComplete",downloadedCallback);
        };
        clda.addEventListener("loaded",loadedCallback);
        clda.addEventListener("downloadComplete",downloadedCallback);
        clda.setDocument(this.mMeshURI);
    
        
        clda.setScaleX(bounds[3]);
        clda.setScaleY(bounds[3]);
        clda.setScaleZ(bounds[3]);
        /// danx0r: removing this hack, it's now dealt with in glge etc
        /*
        clda.setRotMatrix(GLGE.Mat4([1, 0 , 0,  0,
					                 0, 0, 1, 0,
					                 0, -1, 0, 0,
					                 0, 0, 0, 1]));
        */
        clda.setLocX(bounds[0]);
        clda.setLocY(bounds[1]);
        clda.setLocZ(bounds[2]);
        this.mBounds=bounds;
        this.mNode.addCollada(clda);
        this.mMesh = clda;
	this.updateTransformation(gfx);
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
        //if (!this.mCamera) {
        var colladaUnitRescale=this.bv?1/this.bv.radius:1.0;
        if (this.mMesh) {
            if (this.bv) {
		this.mMesh.setScale(l.scale[3]*colladaUnitRescale,l.scale[3]*colladaUnitRescale,l.scale[3]*colladaUnitRescale);
                var locx=(l.scale[0]-(this.bv.center[0]*colladaUnitRescale)*l.scale[3]);
                var locy=(l.scale[1]-(this.bv.center[1]*colladaUnitRescale)*l.scale[3]);
                var locz=(l.scale[2]-(this.bv.center[2]*colladaUnitRescale)*l.scale[3]);
                this.mMesh.setLocX(locx);
                this.mMesh.setLocY(locy);
                this.mMesh.setLocZ(locz);
            }else {

		this.mMesh.setScale(l.scale[3],l.scale[3],l.scale[3]);
                this.mMesh.setLocX(l.scale[0]);
                this.mMesh.setLocY(l.scale[1]);
                this.mMesh.setLocZ(l.scale[2]);
            }
        }
        this.mBounds=l.scale;        
        //}
        this.mNode.setQuat(l.orient[0],l.orient[1],l.orient[2],l.orient[3]);
        if (this.stationary(graphics.mCurTime)) {
            graphics.removeObjectUpdate(this);        
        }
        return l;
    };
    VWObject.prototype.updateCamera = function(graphics) {
        var location=this.updateTransformation(graphics, true);
    };
    VWObject.prototype.animate = function(anim_name) {
        var mesh = this.mMesh;
        if (!mesh) {
            Kata.warn("Couldn't handle animate request.");
            return;            
        }

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
    VWObject.prototype.setHighlight = function(enable) {
        function visitAllMaterials(obj, func) {
            var multimat = obj.multimaterials;
            if (multimat) {
                for (var i = 0; i < multimat.length; i++) {
                    func(multimat[i]);
                }
            }
            var children = obj.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    visitAllMaterials(children[i], func);
                }
            }
        }
        if (enable) {
            var copyMaterial = false;
            if (!this.mOriginalMaterials) {
                copyMaterial = true;
                this.mOriginalMaterials = true;
            }
            visitAllMaterials(this.mMesh, function(obj)
            {
                var newMaterial;
                if (copyMaterial) {
                    var materialHighlight = function(){};
                    materialHighlight.prototype = obj.getMaterial();
                    newMaterial = new materialHighlight();
                    newMaterial.mOriginalMaterial = obj.getMaterial();
                } else {
                    newMaterial = obj.getMaterial();
                }
                newMaterial.setEmit(1.0);
                newMaterial.setColor("#ff0000");
                newMaterial.setAmbient(1.0);
                obj.setMaterial(newMaterial);
            });
        } else {
            if (this.mOriginalMaterials) {
                this.mOriginalMaterials = false;
                visitAllMaterials(this.mMesh, function(obj)
                {
                    var oldMaterial = obj.getMaterial().mOriginalMaterial;
                    if (oldMaterial) {
                        obj.setMaterial(oldMaterial);
                    }
                });
            }
        }
    };

    var mainSpace;
    function SpaceRoot(glgegfx, element, spaceID) {
        this.mElement = element;
        //this.mPack = this.mElement.client.createPack();
//        this.mScene = new GLGE.Scene(spaceID);
        if (!mainSpace) {
            mainSpace=spaceID;
        }
        if (mainSpace==spaceID)
            this.mScene = g_GLGE_doc.getElement("mainscene");
        else
            this.mScene = new GLGE.Scene(spaceID);
        this.mScene.mSpaceID = spaceID;
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
        if (obj.msg!="Custom"){
            this.methodTable[obj.msg].call(this, obj);
            this.newEvent();
        }
    };
    GLGEGraphics.prototype.setInputCallback=function(cb) {
        this._inputCb = cb;
    };
    
    function cloneEvent(e) {
        var ret = {};
        for (var key in e) {
            if (key != "charCode" && key.toUpperCase() != key) {
                if (typeof(e[key]) == "number" || typeof(e[key]) == "string") {
                    ret[key] = e[key];
                }
            }
        }
        return ret;
    }

    GLGEGraphics.prototype._extractMouseEventInfo = function(e, msgname){
        var ev = {
            msg: msgname || e.type,
            event: cloneEvent(e),
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            camerapos: null,
            cameradir: null,
            dir: null,
            spaceid: null,
            clientX: e.clientX,
            clientY: e.clientY,
            width: 0,
            height: 0
        };
        var el = this.mClientElement;
        ev.width = el.width;
        ev.height = el.height;
        // In Firefox we need to use clientX.
        while (el != null) {
            ev.x += el.scrollLeft || 0;
            ev.y += el.scrollTop || 0;
            ev.x -= el.offsetLeft || 0;
            ev.y -= el.offsetTop || 0;
            if (el == document.body && !el.offsetParent) {
                el = document.documentElement;
            } else {
                el = el.offsetParent;
            }
        }
        // offsetX only works in Chrome.
        // Also doesn't work for mouseup events outside the canvas.
        var scene = this.renderer && this.renderer.getScene();
        if (scene) {
            var ray = scene.makeRay(ev.x, ev.y);
            if (ray) {
                ev.camerapos = ray.origin;
                ev.dir = ray.coord;
            }
            if (scene.camera && scene.camera.matrix && scene.camera.pMatrix) {
		        var invViewProj=GLGE.mulMat4(GLGE.inverseMat4(scene.camera.matrix),GLGE.inverseMat4(scene.camera.pMatrix));
		        var origin =GLGE.mulMat4Vec4(invViewProj,[0,0,-1,1]);
		        origin=[origin[0]/origin[3],origin[1]/origin[3],origin[2]/origin[3]];
		        var coord =GLGE.mulMat4Vec4(invViewProj,[0,0,1,1]);
		        coord=[-(coord[0]/coord[3]-origin[0]),-(coord[1]/coord[3]-origin[1]),-(coord[2]/coord[3]-origin[2])];
		        coord=GLGE.toUnitVec3(coord);
		        ev.cameradir=coord;
            }
            ev.spaceid = scene.mSpaceID;
        }
        return ev;
    };

    GLGEGraphics.prototype._rayTrace = function(pos, dir, result) {
        var scene = this.renderer.getScene();
        var pickresult = scene.ray(pos, dir);
        var obj = pickresult && pickresult.object;
        while (obj && !obj.mKataObject) {
            obj = obj.parent;
        }
        var objid = obj && obj.mKataObject && obj.mKataObject.mID;
        if (!objid) objid = null;
		// object,distance,coord,normal,texture;
        result.spaceid = scene.mSpaceID;
        result.id = objid;
        result.pos = pickresult && pickresult.coord;
        result.normal = pickresult && pickresult.normal;
        return result.id && true || false;
    };

    GLGEGraphics.prototype._mouseDown = function(e){
        var ev = this._extractMouseEventInfo(e);
        this._buttonState |= (1<<ev.button);
        this._lastMouseDown = ev;
        if (ev.button==2) {
            document.body.style.cursor="crosshair";
        }
        this._inputCb(ev);

        var thus = this;
        var mousemove = function(e){
            thus._mouseMove(e);
        };
        var mouseup = function(e){
            thus._mouseUp(e);
            document.removeEventListener('mouseup', mouseup, true);
            document.removeEventListener('mousemove', mousemove, true);
        };
        // capture mouse motion and release.
        document.addEventListener('mouseup', mouseup, true);
        document.addEventListener('mousemove', mousemove, true);

        if (this._enabledEvents["pick"]) {
            ev = this._extractMouseEventInfo(e, "pick");
            this._rayTrace(ev.camerapos, ev.dir, ev);
            this._inputCb(ev);
        }
        // Prevent selecting.
        window.focus();
        e.target.focus();
        e.preventDefault && e.preventDefault();
    };
    
    var DRAG_THRESHOLD = Kata.GraphicsSimulation.DRAG_THRESHOLD;
    GLGEGraphics.prototype._mouseUp = function(e){
        var ev = this._extractMouseEventInfo(e);
        this._buttonState &= (~(1<<ev.button));
        if (ev.button == 2) {
            document.body.style.cursor = "default";
        }
        this._inputCb(ev);
        // In HTML, the click event fires after mouseup
        var downev = this._lastMouseDown;
        if (downev) {
            var deltax = ev.x - downev.x;
            var deltay = ev.y - downev.y;
            if ((downev.dragging ||
                     deltax < -DRAG_THRESHOLD || deltax > DRAG_THRESHOLD ||
                     deltay < -DRAG_THRESHOLD || deltay > DRAG_THRESHOLD)) {
                ev = this._extractMouseEventInfo(e, "drop");
                ev.dx = deltax;
                ev.dy = deltay;
                this._inputCb(ev);
            } else {
                ev = this._extractMouseEventInfo(e, "click");
                this._inputCb(ev);
            }
        }
    };
    
    /*
     * for now, we only send mouse moves if left button depressed
     * otherwise we flood with messages.  Note right button is controlled by OS so we ignore
     */
    GLGEGraphics.prototype._mouseMove = function(e){
        var ev = this._extractMouseEventInfo(e);
        if (this._mouseMoveSinceLastRender) {
            return;
        }
        this._mouseMoveSinceLastRender = true;
        if (this._enabledEvents["mousemove"]) {
            this._inputCb(ev);
        }
        if (this._buttonState) {
            var downev = this._lastMouseDown;
            if (downev) {
                var deltax = ev.x - downev.x;
                var deltay = ev.y - downev.y;
                if ((downev.dragging ||
                     deltax < -DRAG_THRESHOLD || deltax > DRAG_THRESHOLD ||
                     deltay < -DRAG_THRESHOLD || deltay > DRAG_THRESHOLD)) {
                    downev.dragging = true;
                    if (this._enabledEvents["drag"]) {
                        ev = this._extractMouseEventInfo(e, "drag");
                        ev.dx = deltax;
                        ev.dy = deltay;
                        ev.button = downev.button;
                        this._inputCb(ev);
                    }
                }
            }
        }
    };

    GLGEGraphics.prototype._keyDown = function(e){
        if (Kata.suppressCanvasKeyInput) return;
        var msg = {
            msg: "keydown",
            event: cloneEvent(e),
            repeat: !!this._keyDownMap[e.keyCode],
            keyCode: e.keyCode,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey
        };
        this._keyDownMap[e.keyCode]=-1;
        this._inputCb(msg);
        if (e.keyCode != 9 && !GLGEGraphics.GLOBAL_KEYBOARD_GRAB) {
            // don't prevent tab -- refocusing
            e.preventDefault && e.preventDefault();
        }
    };

    GLGEGraphics.prototype._keyUp = function(e) {
        if (!this._keyDownMap[e.keyCode]) {
            return;
        }
        var msg = {
            msg: "keyup",
            event: cloneEvent(e),
            keyCode: e.keyCode,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey
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
        if (this.canvasVisible) {//only feed the scroll wheel if focused

            var msg = {
                msg: "wheel",
                event: cloneEvent(e),
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                dy: 0,
                dx: 0
            };
            if (e.wheelDeltaX || e.wheelDeltaY) {         /// Chrome
                msg.dy = e.wheelDeltaY || 0;
                msg.dx = -e.wheelDeltaX || 0;
            }
            else if (e.wheelDelta) {
                msg.dy = e.wheelDelta;
            }
            else if (e.detail){                              /// Firefox
                if (e.axis == 1) {
                    msg.dx = e.detail * 40;         /// -3 for Firefox == 120 for Chrome
                } else {
                    msg.dy = e.detail * -40;
                }
            }
            this._inputCb(msg);
            e.preventDefault();
        // Prevent scrolling containing page as well.
        }
    };
    GLGEGraphics.prototype.createOrReturnSpaceRoot=function(s) {
    
        if (!s)
            s="";
        if (!(s in this.mSpaceRoots)) {
            var dl =new SpaceRoot(this, this.mClientElement, s);
            this.mSpaceRoots[s] = dl;
            
            var rootsEmpty=true;
            for (var i in this.mSpaceRoots) {
                rootsEmpty=false;
                break;
            }
        }
        return this.mSpaceRoots[s];
    };

    GLGEGraphics.prototype.methodTable["Create"]=function(msg) {//this function creates a scene graph node
        var spaceRoot=this.createOrReturnSpaceRoot(msg.spaceid);
        var newObject;
        if (!(msg.id in this.mObjects)) {
            this.mObjects[msg.id]=newObject=new VWObject(msg.id,msg.time,msg.spaceid,spaceRoot);            
        }else newObject = this.mObjects[msg.id];
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
        if (vwObject) {
            this.moveTo(vwObject,msg);
            vwObject.update(this);            
        }else {
            this.methodTable["Create"].call(this,msg);
        }
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
        if (msg.id in this.mAnimatingObjects)
            delete this.mAnimatingObjects[msg.id];

        if (msg.id in this.mObjects) {
            var vwObject=this.mObjects[msg.id];
            var children=vwObject.mNode.getChildren();
            for (var i=0;i<children.length;++i) {
                if (!(msg.id in this.mUnsetParents)) {
                    this.mUnsetParents[msg.id]={};
                }
                var kataObject=children[i].mKataObject;
                if (kataObject) {
                    
                    this.mUnsetParents[msg.id][kataObject.mID]=kataObject;
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
            vwObject.createMesh(this, msg.mesh, msg.anim, msg.scale);
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
    GLGEGraphics.prototype.methodTable["QueryMeshAspectRatio"]=function(msg){
        var vwObject=this.mObjects[msg.id];
        if (vwObject.mLoading){
            if (vwObject.mQueryAspectCount){
                vwObject.mQueryAspectCount++;
            }else vwObject.mQueryAspectCount=1;
        }else {
            vwObject.queryMeshAspectRatio(this);
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
    GLGEGraphics.prototype.reloadBackground=function(spaceRoot) {
        var filter=spaceRoot.mFilter;
        var filterTextures=spaceRoot.mFilterTextures;
        var filterTextureNames=spaceRoot.mFilterTextureNames;
        filterTextures=(spaceRoot.mFilterTextures);
        filterTextureNames=(spaceRoot.mFilterTextureNames);
        filter= new GLGE.Filter2d();
        spaceRoot.mScene.setFilter2d(filter);
        if (spaceRoot.mSunBeams) {
            filter.addPass(layer0_glsl,1024,1024);
            filter.addPass(layer1_glsl,1024,1024);
            filter.addPass(layer2_glsl);
        }else {
            filter.addPass(layer0_glsl,1024,1024);
            filter.addPass(layer2_no_sunbeams_glsl);                
        }
        var i;
        var memoizedTextures={};
        for (i=0;i<filterTextureNames.length;++i) {
            filter.addTexture(filterTextures[i]);
        }
        if(!spaceRoot.mFilter) {
            spaceRoot.mFilter=null;
            spaceRoot.mScene.setFilter2d(null);
            spaceRoot.mScene.setBackgroundColor("#222");
        }else {
            spaceRoot.mFilter=filter;
            spaceRoot.mScene.setBackgroundColor("#f0f");           
        }
        
    };
    GLGEGraphics.prototype.methodTable["Background"]=function(msg) {
        var spaceRoot=this.createOrReturnSpaceRoot(msg.spaceid);
        var filter=spaceRoot.mFilter;
        var filterTextures=spaceRoot.mFilterTextures;
        var filterTextureNames=spaceRoot.mFilterTextureNames;
        if ((!filter)||spaceRoot.mSunBeams!=msg.sunbeams){
            spaceRoot.mSunBeams=msg.sunbeams;
            filterTextures=(spaceRoot.mFilterTextures=[]);
            filterTextureNames=(spaceRoot.mFilterTextureNames=[]);
            filter= new GLGE.Filter2d();
            spaceRoot.mScene.setFilter2d(filter);
            if (msg.sunbeams) {
                filter.addPass(layer0_glsl,1024,1024);
                filter.addPass(layer1_glsl,1024,1024);
                filter.addPass(layer2_glsl);
            }else {
                filter.addPass(layer0_glsl,1024,1024);
                filter.addPass(layer2_no_sunbeams_glsl);                
            }
        }
        var allSame=(filterTextureNames.length==msg.curtextures.length*2);
        filterTextureNames.length=msg.curtextures.length*2;
        for (var i=0;i<msg.curtextures.length*2;++i){
            var texName=msg.curtextures[(i>>1)];
            if (msg.prevtextures&&i%2!=0) {
                texName=msg.prevTextures[(i>>1)];
            }
            if (filterTextureNames[i]!=texName){
                allSame=false;
                filterTextureNames[i]=texName;
            }
        }

        if (!allSame) {
            var i;
            for (i=0;i<filterTextures.length;++i) {
                filter.removeTexture(filterTextures[i]);
            }
            filterTextures.length=0;
            var memoizedTextures={};
            for (i=0;i<filterTextureNames.length;++i) {
                if (filterTextureNames[i] in memoizedTextures){
                    filterTextures[i]=memoizedTextures[filterTextureNames[i]];
                }else {
                    filterTextures[i]=new GLGE.Texture();
                    filterTextures[i].setSrc(filterTextureNames[i]);
                    memoizedTextures[filterTextureNames[i]]=filterTextures[i];
                    filter.addTexture(filterTextures[i]);
                }
            }
        }
        if(((!msg.curtextures)||(msg.curtextures&&msg.curtextures.length==0))&&((!msg.prevtextures)||msg.prevtextures.length==0)) {
            spaceRoot.mFilter=null;
            spaceRoot.mScene.setFilter2d(null);
            spaceRoot.mScene.setBackgroundColor("#222");
        }else {
            spaceRoot.mScene.setBackgroundColor("#f0f");           
            spaceRoot.mFilter=filter;
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

    GLGEGraphics.prototype.methodTable["Enable"]=function(msg) {
        if (msg.type) {
            this._enabledEvents[msg.type] = true;
        }
    };
    GLGEGraphics.prototype.methodTable["Disable"]=function(msg) {
        if (this._enabledEvents[msg.type]) {
            delete this._enabledEvents[msg.type];
        }
    };
    
        
    GLGEGraphics.prototype.methodTable["Highlight"]=function(msg) {
        var obj = this.mObjects[msg.id];
        if (obj) {
            if (msg.enable) {
                obj.setHighlight(true);
            } else {
                obj.setHighlight(false);
            }
        }
    };

    GLGEGraphics.prototype.methodTable["Shadows"]=function(msg) {
        var obj = this.mObjects[msg.id];
        if (obj) {
            var spaceRoot=this.createOrReturnSpaceRoot(msg.spaceid);
            var lights=spaceRoot.mScene.getLights();
            var index=0;
            if (msg.index!==undefined){                
                index=msg.index;
                if (msg.index<0)
                    index+=lights.length;
            }
            if (lights.length) {                
                if (msg.enable) {
                    for (var i=0;i<lights.length;++i){
                        var ligh=lights[(i+index)%lights.length];
                        if (ligh.id.indexOf("shadowlight")!=-1){
                            ligh.enableLight();
                        }
                        if (ligh.id.indexOf("mainlight")!=-1){
                            ligh.disableLight();
                        }else 
                        if (ligh.getType()==GLGE.L_SPOT) {
                            ligh.setCastShadows(true);
                            break;                            
                        }
                    }
                } else {
                    for (var j=0;j<lights.length;++j){
                        var ligh=lights[j];
                        if (ligh.id.indexOf("shadowlight")!=-1){
                            ligh.disableLight();
                        }
                        if (ligh.id.indexOf("mainlight")!=-1){
                            ligh.enableLight();
                        }
                    }
                    if (msg.index!==undefined)
                        lights[index%lights.length].setCastShadows(false);
                    else for (var j=0;j<lights.length;++j){
                        lights[j].setCastShadows(false);
                    }
                }
            }            
        }
    };

    GLGEGraphics.prototype.methodTable["IFrame"]=function(msg) {
        /*UNIMPL*/
    };
    GLGEGraphics.prototype.methodTable["DestroyIFrame"]=function(msg) {
        //destroyX(msg,"IFrame");
    };
    GLGEGraphics.prototype.methodTable["CaptureCanvas"]=function(msg) {
      if (msg.still) {
          this.mDoCaptureCanvas+=1;
      } else{          
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
      }

    };

    // Register as a GraphicsSimulation if possible.
    Kata.GraphicsSimulation.registerDriver("GLGE", GLGEGraphics);
}, "katajs/gfx/glgegfx.js");
