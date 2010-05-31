/*  Kata Javascript Graphics - O3D Interface
 *  o3dgfx.js
 *
 *  Copyright (c) 2010, Patrick Reiter Horn
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

o3djs.base.o3d = o3d;
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.util');
o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.dump');
o3djs.require('o3djs.scene');

function RenderTarget(o3dgfx,element,width,height) {
  this.mO3DGraphics = o3dgfx;
  this.mElement = element;
  this.mWidth = width;
  this.mHeight = height;
  this.mCamera = null;
  this.mViewInfo = null;
};

RenderTarget.prototype.updateProjection = function() {
  // Create a perspective projection matrix.
  if (this.mCamera) {
    this.mViewInfo.drawContext.projection = o3djs.math.matrix4.perspective(
      o3djs.math.degToRad(this.mCamera.mFOV), this.mWidth / this.mHeight,
      this.mCamera.mHither, this.mCamera.mYon);
  }
}


function LocationIdentityNow() {
    return LocationIdentity(newDate());
};
function LocationIdentity(time){
    return {
      mScale:[1,1,1],
      mScaleTime:time,
      mPos:[0,0,0],
      mPosTime:time,
      mOrient:[1,0,0,0],
      mOrientTime:time,
      mVel:[0,0,0],
      mRotAxis:[0,0,1],
      mRotVel:0
    };
};
function deltaTime(newTime,oldTime) {
    return (curtime.getTime()-atime.getTime())*.001;
}
function _helperLocationExtrapolate3vec(a,adel,deltaTime){
    return [a[0]+adel[0]*deltaTime,
            a[1]+adel[1]*deltaTime,
            a[2]+adel[2]*deltaTime];
}
function _helperQuatFromAxisAngle(aaxis,aangle) {
    var sinHalf=Math.sin(aangle/2.0);
    var cosHalf=Math.cos(aangle/2.0);
    return [sinHalf*aaxis[0],sinHalf*aaxis[1],sinHalf*aaxis[2],cosHalf];
}

/**
 * Multiplies two quaternions.
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The quaternion product a * b.
 */
function _helperLocationExtrapolateQuaternion(a,avel,aaxis,deltaTime){
    var aangle=avel*deltaTime;
    var b=_helperQuatFromAxisAngle(aaxis,aangle);
    var aX = a[0];
    var aY = a[1];
    var aZ = a[2];
    var aW = a[3];
    var bX = b[0];
    var bY = b[1];
    var bZ = b[2];
    var bW = b[3];

    return [
        aW * bX + aX * bW + aY * bZ - aZ * bY,
        aW * bY + aY * bW + aZ * bX - aX * bZ,
        aW * bZ + aZ * bW + aX * bY - aY * bX,
        aW * bW - aX * bX - aY * bY - aZ * bZ];
}
function _helperLocationInterpolate3vec(a,adel,atime,b,bdel,btime,curtime) {
    var secondsPassed=deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return _helperLocationExtrapolate3vec(a,adel,deltaTime);
    }
    var sampleDelta=deltaTime(atime,btime);
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }
    var interp=secondsPassed/sampleDelta;
    var ointerp=1.0-interp;
    return [interp*a[0]+ointerp*b[0],
            interp*a[1]+ointerp*b[1],
            interp*a[2]+ointerp*b[2]];
}
function _helperLocationInterpolateQuaternion(a,avel,aaxis,atime,b,bvel,baxis,btime,curtime) {
    var secondsPassed=deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return _helperLocationExtrapolateQuaternion(a,avel,aaxis,deltaTime);
    }
    var sampleDelta=deltaTime(atime,btime);
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }
    var interp=secondsPassed/sampleDelta;
    var ointerp=1.0-interp;
    var x=interp*a[0]+ointerp*b[0];
    var y=interp*a[1]+ointerp*b[1];
    var z=interp*a[2]+ointerp*b[2];
    var w=interp*a[3]+ointer*b[3];
    var len=Math.sqrt(w*w+x*x+y*y+z*z);
    if (len<1.0e-20)
        return [x,y,z,w];
    return [x/len,y/len,z/len,w/len];
}

///interpolates between 2 locations at a time probably between the two, otherwise the newer one is extrapolated
var LocationInterpolate=(function(){
    return function(location,prevLocation,time){
        return {
            mScale:_helperLocationInterpolate3vec(location.mScale,[0,0,0],location.mScaleTime,
                                   prevLocation.mScale,[0,0,0],prevLocation.mScaleTime,
                                   time),
            mScaleTime:time,
            mPos:_helperLocationInterpolate3vec(location.mPos,location.mVel,location.mPosTime,
                                 prevLocation.mPos,prevLocation.mVel,prevLocation.mPosTime,time),
            mPosTime:time,
            mOrient:_helperLocationInterpolateQuaternion(location.mOrient,location.mRotVel,location.mRotAxis,location.mOrientTime,
                                          prevLocation.mOrient,prevLocation.mRotVel,prevLocation.mRotAxis,prevLocation.mOrientTime,
                                          time),
            mOrientTime:time,
            mRotVel:location.mRotVel,
            mRotAxis:location.mRotAxis,
            mVel:location.mVel
        };
    };
})();
///Extrapolates a location to a future time so that it may be interpolated
var LocationExtrapolate=function() {
    return function(location,time) {
        return {
            mScale:location.mScale,
            mScaleTime:time,
            mPos:_helperLocationExtrapolate3vec(location.mPos,location.mVel,deltaTime(time,location.mPosTime)),
            mPosTime:time,
            mOrient:_helperLocationExtrapolateQuaternion(location.mOrient,location.mRotVel,location.mRotAxis,deltaTime(time,location.mOrientTime)),
            mOrientTime:time,
            mRotVel:location.mRotVel,
            mRotAxis:location.mRotAxis,
            mVel:location.mVel
        };
    }();
};
/**
 * Takes a current and prev location samples and 
 * returns a new location that has the previous location properties where the msg does not specify the values
 * and uses the messages values where they are specified
 *  then the currentLocation is updated with prevLocations values if the would otherwise be the same as curLocation
 * @param msg the network message being received
 * @param curLocation the currently known latest update
 * @param prevLocation the update before the current update
 * @returns a Location class with curLocation augmented with the msg fields that exist
 */ 
var LocationUpdate=function(msg,curLocation,prevLocation) {
    if (!prevLocation)
        prevLocation=curLocation;
    var retval={
      mScale:curLocation.mScale,
      mScaleTime:curLocation.mScaleTime,
      mPos:curLocation.mPos,  
      mPosTime:curLocation.mPosTime,
      mOrient:curLocation.mOrient,  
      mOrientTime:curLocation.mOrientTime,
      mVel:curLocation.mVel,
      mRotAxis:curLocation.mRotAxis,
      mRotVel:curLocation.mRotVel
    };
    if (msg.pos) {
        retval.mPos=msg.pos;
        retval.mPosTime=msg.time;
    }else {
        curLocation.mPos=prevLocation.mPos;
        curLocation.mPosTime=prevLocation.mPosTime;
    }
    if (msg.vel) {
        retval.mVel=msg.vel;
    }else {
        curLocation.mVel=prevLocation.mVel;
    }
    if (msg.orient) {
        retval.mOrient=msg.orient;
        retval.mOrientTime=msg.time;
    }else {
        curLocation.mOrient=prevLocation.mOrient;
        curLocation.mOrientTime=prevLocation.mOrientTime;
    }
    if (msg.rotvel&&msg.rotaxis) {
        retval.mRotAxis=msg.rotaxis;
        retval.mRotVel=msg.rotvel;
    }else {
        curLocation.mRotAxis=prevLocation.mRotAxis;
        curLocation.mRotVel=prevLocation.mRotVel;
    }
    if (msg.scale) {
        retval.mScale=msg.scale;
        retval.mScaleTime=msg.time;
    }else {
        curLocation.mScale=prevLocation.mScaleTime;
        curLocation.mScaleTime=prevLocation.mScaleTime;
    }
};
function VWObject(id,time,spaceid,element) {
    var pack=element.client.createPack();

    this.mID = id;
    this.mSpaceID = spaceid;
    this.mPack = pack;
    this.mNode = pack.createObject('o3d.Transform');
    this.mPrevScale = [1,1,1];
    this.mScale = [1,1,1];
    this.mOrient = [0,0,0,1];
    this.mPos = [0,0,0];
    this.mNode.mKataObject=this;
    this.update = this.updateDefault;
};

VWObject.prototype.createCamera = function(fov,hither,yon) {
    this.mHither = hither;
    this.mYon = yon;
    this.mFOV = fov;
    this.update = this.updateCamera;
}
VWObject.prototype.destroyCamera = function() {
    this.detachRenderTarget();
    delete this.mHither;
    delete this.mYon;
    delete this.mFOV;
    this.update = this.updateDefault;
}
VWObject.prototype.attachRenderTarget = function(renderTarg) {
    if (renderTarg.mCamera) {
        renderTarg.mCamera.detachRenderTarget();
    }
    this.detachRenderTarget();
    this.mRenderTarg = renderTarg;
    renderTarg.mCamera = this;
    renderTarg.mViewInfo.treeRoot = renderTarg.mO3DGraphics.mSpaceRoots[this.mSpaceID];
    renderTarg.mO3DGraphics.addObjectUpdate(this);
}
VWObject.prototype.detachRenderTarget = function() {
    if (this.mRenderTarg) {
        renderTarg.mO3DGraphics.removeObjectUpdate(this);
        this.mRenderTarg.mCamera = null;
        this.mRenderTarg.mViewInfo.treeRoot = this.mRenderTarg.mEmptyRoot;
        delete this.mRenderTarg;
    }
}

var updateTransformation=function(vwObject,date) {
    vwObject.mNode.identity();
    //FIXME need to interpolate
    vwObject.mNode.scale(vwObject.mScale[0],vwObject.mScale[1],vwObject.mScale[2]);
    vwObject.mNode.translate(vwObject.mPos[0],vwObject.mPos[1],vwObject.mPos[2]);
    vwObject.mNode.quaternionRotate(vwObject.mOrient);
    
};
/**
 * Constructor for O3DGraphics interface.
 *@constructor
 */
O3DGraphics=function(callbackFunction,parentElement) {
    var oldID = parentElement.id;
    parentElement.style.width="600px";
    parentElement.style.height="600px";
    var thus = this;
    this.callback=callbackFunction;
    this.parentEl=parentElement;
    this.initEvents=[];
    this.mObjects={};

    this.mObjectUpdates = {}; // map id -> function

    this.lightPosParam = null;

    // For dragging camera
    this.dragging = false;
    this.thisRot = o3djs.math.matrix4.identity();
    this.lastRot = o3djs.math.matrix4.identity();
    this.aball = o3djs.arcball.create(100, 100);

    this.send=function(obj) {
        this.initEvents.push(obj);
    };
    parentElement.id="o3d";
    o3djs.webgl.makeClients(function(clientElements){
        parentElement.id=oldID;
        thus.asyncInit(clientElements);
    });
};

O3DGraphics.prototype.addObjectUpdate = function(vwObj) {
    this.mObjectUpdates[vwObj.mID] = vwObj;
}

O3DGraphics.prototype.removeObjectUpdate = function(vwObj) {
    delete this.mObjectUpdates[vwObj.mID];
}

VWObject.prototype.sceneLoadedCallback = function(renderTarg, lightPosParam, pack, parent, exception) {
    if (exception) {
        console.log("loading failed: "+this.mMeshURI,exception);
        alert("Could not load: " + this.mMeshURI + "\n" + exception);
    } else {
        console.log("loading finished.");
        // Generate draw elements and setup material draw lists.
        o3djs.pack.preparePack(pack, renderTarg.mViewInfo);

        // FIXME: lightPosParam
        // Manually connect all the materials' lightWorldPos params to the context
        var materials = pack.getObjectsByClassName('o3d.Material');
        for (var m = 0; m < materials.length; ++m) {
            var material = materials[m];
            var param = material.getParam('lightWorldPos');
            if (param) {
                param.bind(lightPosParam);
            }
        }

        // Comment out the next line to dump lots of info.
        if (false) {
            o3djs.dump.dump('---dumping context---\n');
            //o3djs.dump.dumpParamObject(renderTarg.mElement);

            o3djs.dump.dump('---dumping root---\n');
            try {o3djs.dump.dumpTransformTree(renderTarg.mElement.client.root);}catch(e){}

            o3djs.dump.dump('---dumping render root---\n');
            try {o3djs.dump.dumpRenderNodeTree(renderTarg.mElement.client.renderGraphRoot);}catch(e){}

            o3djs.dump.dump('---dump g_pack shapes---\n');
            var shapes = pack.getObjectsByClassName('o3d.Shape');
            for (var t = 0; t < shapes.length; t++) {
                o3djs.dump.dumpShape(shapes[t]);
            }

            o3djs.dump.dump('---dump g_pack materials---\n');
            var materials = pack.getObjectsByClassName('o3d.Material');
            for (var t = 0; t < materials.length; t++) {
                o3djs.dump.dump (
                    '  ' + t + ' : ' + materials[t].className +
                        ' : "' + materials[t].name + '"\n');
                o3djs.dump.dumpParams(materials[t], '    ');
            }

            o3djs.dump.dump('---dump g_pack textures---\n');
            var textures = pack.getObjectsByClassName('o3d.Texture');
            for (var t = 0; t < textures.length; t++) {
                o3djs.dump.dumpTexture(textures[t]);
            }

            o3djs.dump.dump('---dump g_pack effects---\n');
            var effects = pack.getObjectsByClassName('o3d.Effect');
            for (var t = 0; t < effects.length; t++) {
                o3djs.dump.dump ('  ' + t + ' : ' + effects[t].className +
                                 ' : "' + effects[t].name + '"\n');
                o3djs.dump.dumpParams(effects[t], '    ');
            }
        }
    }
};

//this.loadScene(this.mRenderTargets[0], path, vwObj.mPack, vwObj.mNode);
VWObject.prototype.createMesh = function(renderTarg, lightPosParam, path) {
    // FIXME: clientElements[0]?
    if (path == null) {
        throw "loadScene with null path";
    }
    path += "/scene.json";
    console.log("Loading: " + path);
    this.mMeshURI = path;
    var thus = this;
    try {
        o3djs.scene.loadScene(renderTarg.mElement.client, this.mPack, this.mNode, path,
                              function(p, par, exc) {
                                  if (thus.mMeshURI == path) {
                                      thus.mMeshPack = p;
                                      thus.sceneLoadedCallback(renderTarg, lightPosParam, p, par, exc);
                                  }
                              });
    } catch (e) {
        console.log("loading failed : ",e);
    }
};

VWObject.prototype.destroyMesh = function() {
    delete this.mMeshURI;
    if (this.mMeshPack) {
        this.mMeshPack.destroy();
        delete this.mMeshPack;
    }
}

O3DGraphics.prototype.asyncInit=function (clientElements) {
    var thus=this;
    this.mUnsetParents={};
    this.mRenderTargets=[];//this contains info about each render target, be it a texture or a clientElement (client elements are mapped by #, textures by uuid)
    this.mSpaceRoots={};//this will contain scene graph roots for each space

    for (var i=0;i<clientElements.length;i++) {
        this.mRenderTargets[i]=new RenderTarget(
            this,
            clientElements[i],
            parseInt(clientElements[i].width),
            parseInt(clientElements[i].height));
        if(i==0) {
            var mainPack = clientElements[0].client.createPack();
            this.mRenderTargets[0].mViewInfo = o3djs.rendergraph.createBasicView(
                mainPack,
                clientElements[0].client.root,
                clientElements[0].client.renderGraphRoot);
            var paramObject = mainPack.createObject('ParamObject');
            this.lightPosParam = paramObject.createParam('lightWorldPos', 'ParamFloat3');
        }else {
            this.mRenderTargets[i].mViewInfo = o3djs.rendergraph.createExtraView(
                this.mRenderTargets[0].mViewInfo,
                clientElements[i].root,//FIXME: not sure if this should be the canonical view or the secondary views
                clientElements[i].renderGraphRoot);           
        }
        this.mRenderTargets[i].mEmptyRoot=clientElements[i].root;
        this.mRenderTargets[i].updateProjection();
    }

    this.send=function(obj) {
        return this.methodTable[obj.msg].call(this, obj);
    };
    this.destroy=function(){}
    for (var i=0;i<this.initEvents.length;++i) {
        this.send(this.initEvents[i]);
    }
    delete this.initEvents;
    var el = this.mRenderTargets[0].mElement;
    el.addEventListener('mousedown',
                        function (e){thus.startDragging(e);},
                        true);
    el.addEventListener('mousemove',
                        function(e){thus.drag(e);},
                        true);
    el.addEventListener('mouseup',
                        function(e){thus.stopDragging(e);},
                        true);
    el.addEventListener('wheel',
                        function(e){thus.scrollMe(e);},
                        true);

    var targ = this.mRenderTargets[0];
    targ.mElement.client.setRenderCallback(function() {
        thus.renderCallback();
    });

};

O3DGraphics.prototype.renderCallback = function() {
    this.mRenderTargets[0].updateProjection();
    for (var id in this.mObjectUpdates) {
        this.mObjectUpdates[id].update();
    }
}

O3DGraphics.prototype.methodTable={};

O3DGraphics.prototype.methodTable["Create"]=function(msg) {//this function creates a scene graph node
    var s = msg.spaceid;
    if (!s) {
        s=""
    }
    if (!(s in this.mSpaceRoots)) {
        this.mSpaceRoots[s]=this.mRenderTargets[0].mElement.client.createPack().createObject('o3d.Transform');
    }
    var spaceRoot=this.mSpaceRoots[msg.spaceid];
    var newObject;
    this.mObjects[msg.id]=newObject=new VWObject(msg.id,msg.time,msg.spaceid,this.mRenderTargets[0].mElement);
    newObject.mNode.parent=spaceRoot;

    if (msg.id in this.mUnsetParents) {
        var unset=this.mUnsetParents[msg.id];
        var unsetl=unset.length;
        for (var i=0;i<unsetl;++i) {
            unset[i].mNode.parent=newObject.mNode;
            delete unset[i].mUnsetParent;
        }
    }
    this.moveTo(newObject,msg,spaceRoot);
};
O3DGraphics.prototype.moveTo=function(vwObject,msg,spaceRoot) {
    if (msg.parent!==undefined) {
        if (vwObject.mUnsetParent) {
            delete this.mUnsetParents[vwObject.mUnsetParent][msg.id];
            delete vwObject.mUnsetParent;
        }
        if (msg.parent) {
            if (msg.parent in this.mObjects) {
                vwObject.mNode.parent=this.mObject[msg.parent].mNode;
            }else {
                if (!(msg.parent in this.mUnsetParents)) {
                    this.mUnsetParents[msg.parent]={};
                }
                this.mUnsetParents[msg.parent][msg.id]=newObject;
                vwObject.mUnsetParent=msg.parent;
                vwObject.mNode.parent=this.mSpaceRoots[vwObject.mSpaceID];
            }
        }else {
            vwObject.mNode.parent=this.mSpaceRoot[vwObject.mSpaceID];
            //set parent transform
        }
    }
    if (msg.pos) {
        vwObject.mPos=msg.pos;
        vwObject.mPosTime=msg.time;
    }
    if (msg.vel)
        vwObject.mVel=msg.vel;
    if (msg.orient) {
        vwObject.mOrient=msg.orient;
        vwObject.mOrientTime=msg.time;
    }
    if (msg.rotaxis)
        vwObject.mRotAxis=msg.rotaxis;
    if (msg.rotvel)
        vwObject.mRotVel=msg.rotvel;
    if (msg.scale) {
        vwObject.mScale=msg.scale;
        vwObject.mScaleTime=msg.time;
    }
    updateTransformation(vwObject,new Date());
    //FIXME actually translate element
};
O3DGraphics.prototype.methodTable["Move"]=function(msg) {
    var vwObject=this.mObjects[msg.id];
    this.moveTo(vwObject,msg);
};
O3DGraphics.prototype.methodTable["Destroy"]=function(msg) {
    if (msg.id in this.mObjects) {
        var vwObject=this.mObjects[msg.id];
        var children=vwObject.mNode.children;
        for (var i=0;i<children.length;++i) {
            var mat=children[i].getUpdatedWorldMatrix();
            if (!(msg.id in this.mUnsetParents)) {
                this.mUnsetParents[msg.id]={};
            }
            this.mUnsetParents[msg.id][children[i].mKataObject.mId]=children[i].mKataObject;
            children[i].mKataObject.mUnsetParent=msg.id;
            children[i].localTransformMatrix=mat;
            children[i].parent=this.mSpaceRoots[children[i].mKataObject.mSpaceId];
            children[i].getUpdatedWorldMatrix();
            //FIXME: update interpolation parameters with world coordinates
        }
        vwObject.mNode.parent=null;
        vwObject.mPack.destroy();
        delete this.mObjects[msg.id];
    }
};
O3DGraphics.prototype.methodTable["MeshShaderUniform"]=function(msg) {
    //"Uniform "+msg.name+"="+msg.value;
};
O3DGraphics.prototype.methodTable["Mesh"]=function(msg) {
    //q.innerHTML="Mesh "+msg.mesh;
    console.log(this.mRenderTargets[0].mElement);
    if (msg.mesh && msg.id in this.mObjects) {
        var vwObject=this.mObjects[msg.id];
        vwObject.createMesh(this.mRenderTargets[0], this.lightPosParam, msg.mesh, vwObject);
    }
};
O3DGraphics.prototype.methodTable["DestroyMesh"]=function(msg) {
    if (msg.id in this.mObjects) {
        var vwObject=this.mObjects[msg.id];
        vwObject.destroyMesh();
    }
};
O3DGraphics.prototype.methodTable["Light"]=function(msg) {
    //q.innerHTML="Light "+msg.type;
};
O3DGraphics.prototype.methodTable["DestroyLight"]=function(msg) {
    //destroyX(msg,"Light");
};

O3DGraphics.prototype.methodTable["Camera"]=function(msg) {
    if (msg.id in this.mObjects) {
        var vwObject=this.mObjects[msg.id];
        vwObject.createCamera(o3djs.math.degToRad(45),
                              0.1,
                              50000);
    }
};
O3DGraphics.prototype.methodTable["AttachCamera"]=function(msg) {
    var renderTarg;
    if (msg.target !== undefined) {
        renderTarg = this.mRenderTargets[msg.target];
    }
    if (msg.id in this.mObjects) {
        var cam = this.mObjects[msg.id];
        if (renderTarg) {
            cam.attachRenderTarget(renderTarg);
        }
    }
};
O3DGraphics.prototype.methodTable["DetachCamera"]=function(msg) {
    if (msg.id in this.mObjects) {
        var cam = this.mObjects[msg.id];
        cam.detachRenderTarget();
    }
};
O3DGraphics.prototype.methodTable["DestroyCamera"]=function(msg) {
    if (msg.id in this.mObjects) {
        var vwObject=this.mObjects[msg.id];
        vwObject.destroyCamera();
    }
};

O3DGraphics.prototype.methodTable["IFrame"]=function(msg) {
    /*UNIMPL*/
};
O3DGraphics.prototype.methodTable["DestroyIFrame"]=function(msg) {
    //destroyX(msg,"IFrame");
};


O3DGraphics.prototype.startDragging = function(e) {
  this.lastRot = this.thisRot;

  this.aball.click([e.x, e.y]);

  this.dragging = true;
}

O3DGraphics.prototype.drag = function(e) {
  if (this.dragging) {
    var rotationQuat = this.aball.drag([e.x, e.y]);
    var rot_mat = o3djs.quaternions.quaternionToRotation(rotationQuat);
    this.thisRot = o3djs.math.matrix4.mul(this.lastRot, rot_mat);

    var root = this.mRenderTargets[0].mElement.client.root;
    var m = root.localMatrix;
    o3djs.math.matrix4.setUpper3x3(m, this.thisRot);
    root.localMatrix = m;
    this.updateCamera();
  }
}

O3DGraphics.prototype.stopDragging = function(e) {
  this.dragging = false;
}

VWObject.prototype.updateDefault = function() {
  // Update scene graph of moving objects if necessary
}

VWObject.prototype.updateCamera = function() {
  var mat = o3djs.quaternions.quaternionToRotation(this.mOrient);
  o3djs.math.matrix4.setTranslation(mat, this.mPos);
  this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.matrix4.inverse(mat);
  this.updateDefault();
}

O3DGraphics.prototype.scrollMe = function(e) {
  if (e.deltaY) {
    var t = 1;
    if (e.deltaY > 0)
      t = 11 / 12;
    else
      t = 13 / 12;
    this.camera.eye = o3djs.math.lerpVector(this.camera.target, this.camera.eye, t);

    this.updateCamera();
  }
}

