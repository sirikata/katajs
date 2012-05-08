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
"use strict";

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

function SpaceDrawList(o3dgfx, element) {
    this.mElement = element;
    this.mPack = this.mElement.client.createPack();
    this.mRootNode = this.mPack.createObject('o3d.Transform');
    this.mDefaultRenderView = new RenderTarget(o3dgfx, this, null);
    this.mDefaultRenderView.createBasicView([0,0,0,0], [0,0,0,0]);
    this.initializeDrawList(this.mDefaultRenderView.mViewInfo);
/*
    this.mPack = element.client.createPack();
    this.mPerformanceDrawList = this.mPack.createObject('DrawList');
    this.mZOrderedDrawList = this.mPack.createObject('DrawList');
*/
}
SpaceDrawList.prototype.initializeDrawList = function(viewInfo) {
    this.mPack = viewInfo.pack;
    this.mPerformanceDrawList = viewInfo.performanceDrawList;
    this.mZOrderedDrawList = viewInfo.zOrderedDrawList;
    var paramObject = this.mPack.createObject('ParamObject');
    this.mLightPosParam = paramObject.createParam('lightWorldPos', 'ParamFloat3');
};


/**
 * @constructor
 * @param {!O3DGraphics} o3dgfx The render system for which the render target is created
 * @param {!o3d.node} spaceRoot 
 * Creates a render target for a view info to be stored within
 */

function RenderTarget(o3dgfx,spaceRoot,cam) {
  this.mO3DGraphics = o3dgfx;
  this.mSpaceRoot = spaceRoot;
  console.log("spaceRoot.mElement:", spaceRoot.mElement);
  this.mElement = spaceRoot.mElement;
  this.mWidth = 0 + this.mElement.width;
  this.mHeight = 0 + this.mElement.height;
  this.mCamera = null;
/**
 * The ViewInfo associated with the o3d createView made for this render target
 * @type {!o3d.rendergraph.ViewInfo}
 */
  this.mViewInfo = null;
};

RenderTarget.prototype.createBasicView = function(color, viewRect) {
    var spaceDrawList = this.mSpaceRoot;

    var rootNode = spaceDrawList.mPack.createObject('o3d.Transform'); // = this.mSpaceRoot.mRootNode;
    this.mViewInfo = o3djs.rendergraph.createBasicView(
        this.mSpaceRoot.mPack,
        rootNode,
        this.mElement.client.renderGraphRoot,
        color,
        0,
        viewRect);
    return this.mViewInfo;
};


RenderTarget.prototype.createExtraView = function(color, viewRect) {
    var spaceDrawList = this.mSpaceRoot;
    var rootNode = spaceDrawList.mPack.createObject('o3d.Transform');
    this.mSpaceRoot.mRootNode.parent = rootNode;
    this.mViewInfo = o3djs.rendergraph.createView(
        spaceDrawList.mPack,
        rootNode,
        this.mElement.client.renderGraphRoot,
        color,
        1,
        viewRect,
        spaceDrawList.mPerformanceDrawList,
        spaceDrawList.mZOrderedDrawList);
    return spaceDrawList;
};

/**
 * Updates the perspective matrix on a render target in case width/height/fov or hither/yon changed
 */
RenderTarget.prototype.updateProjection = function() {
  // Create a perspective projection matrix.
  if (this.mCamera) {
    this.mViewInfo.drawContext.projection = o3djs.math.matrix4.perspective(
      this.mCamera.mFOV * this.mHeight / this.mWidth,
      this.mWidth / this.mHeight,
      this.mCamera.mHither, this.mCamera.mYon);
  }
}
/*
function SpaceDrawList(o3dgfx, element) {
    this.mElement = element;
    this.mPack = this.mElement.client.createPack();
    this.mRootNode = this.mPack.createObject('o3d.Transform');
    this.mDefaultRenderView = new RenderTarget(o3dgfx, this);
    this.mDefaultRenderView.createBasicView([0,0,1,1], [0,0,1,1]);
    this.initializeDrawList(this.mDefaultRenderView.mViewInfo);
}
SpaceDrawList.prototype.initializeDrawList = function(viewInfo) {
    this.mPack = viewInfo.pack;
    this.mPerformanceDrawList = viewInfo.performanceDrawList;
    this.mZOrderedDrawList = viewInfo.zOrderedDrawList;
    var paramObject = this.mPack.createObject('ParamObject');
    this.mLightPosParam = paramObject.createParam('lightWorldPos', 'ParamFloat3');
}

function RenderTarget(o3dgfx,spaceRoot) {
  this.mO3DGraphics = o3dgfx;
  this.mSpaceRoot = spaceRoot;
  console.log(spaceRoot.mElement);
  this.mElement = spaceRoot.mElement;
  this.mWidth = 0 + this.mElement.width;
  this.mHeight = 0 + this.mElement.height;
  this.mCamera = null;
  this.mViewInfo = null;
};

RenderTarget.prototype.createBasicView = function(color, viewRect) {

    var rootNode = this.mSpaceRoot.mPack.createObject('o3d.Transform');
    rootNode.parent = this.mSpaceRoot.mRootNode;
    this.mViewInfo = o3djs.rendergraph.createBasicView(
        this.mSpaceRoot.mPack,
        rootNode,
        this.mElement.client.renderGraphRoot,
        color,
        0,
        viewRect);
    return this.mViewInfo;
}

RenderTarget.prototype.createExtraView = function(color, viewRect) {
    var rootnode = this.mSpaceRoot.mPack.createObject('o3d.Transform');
    rootnode.parent = this.mSpaceRoot.mRootNode;
    this.mViewInfo = o3djs.rendergraph.createView(
        this.mSpaceRoot.mPack,
        rootnode,
        this.mElement.client.renderGraphRoot,
        color,
        1,
        viewRect,
        this.mSpaceRoot.mPerformanceDrawList,
        this.mSpaceRoot.mZOrderedDrawList);
    return this.mViewInfo;
};
 */


function kata3d_RotationToQuaternion(m) {
    /* Shoemake SIGGRAPH 1987 algorithm */
    var fTrace = m[0][0]+m[1][1]+m[2][2];
    if (fTrace == 3.0 ) 
    {
        return [0,0,0,1];//optional: identify identity as a common case
    }
    if ( fTrace > 0.0 )
    {
        // |w| > 1/2, may as well choose w > 1/2
        var fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        var ifRoot=0.5/fRoot;// 1/(4w)
        return [(m[2][1]-m[1][2])*ifRoot,
                (m[0][2]-m[2][0])*ifRoot,
                (m[1][0]-m[0][1])*ifRoot,
                0.5*fRoot];  
                
    }
    else
    {
        // |w| <= 1/2
        var s_iNext=[ 1, 2, 0 ];
        var i = 0;
        if ( m[1][1] > m[0][0] )
            i = 1;
        if ( m[2][2] > m[i][i] )
            i = 2;
        var j = s_iNext[i];
        var k = s_iNext[j];
        var fRoot = sqrt(m[i][i]-m[j][j]-m[k][k] + 1.0);
        var ifRoot=0.5/fRoot;
        var q=[0,0,0,(m[k][j]-m[j][k])*ifRoot];
        q[i] = 0.5*fRoot;
        q[j] = (m[j][i]+m[i][j])*ifRoot;
        q[k] = (m[k][i]+m[i][k])*ifRoot;
        return q;
    }
}

Kata.LocationFromO3DTransformation=function(transformation,time) {
    var mat=transformation.localMatrix;
    
    return Kata.LocationSet({time:time,pos:o3djs.math.matrix4.getTranslation(mat),orient:kata3d_RotationToQuaternion(mat)});
};
function VWObject(id,time,spaceid,spaceroot) {
    var pack=spaceroot.mElement.client.createPack();

    this.mID = id;
    this.mSpaceID = spaceid;
    this.mPack = pack;
    this.mNode = pack.createObject('o3d.Transform');
    this.mCurLocation=Kata.LocationIdentityNow();
    this.mPrevLocation=Kata.LocationIdentityNow(new Date(0));
    this.mNode.mKataObject=this;
    this.update = this.updateTransformation;
    this.mSpaceRoot = spaceroot;
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
    this.update = this.updateTransformation;
}
VWObject.prototype.attachRenderTarget = function(renderTarg) {
    if (renderTarg.mCamera) {
        renderTarg.mCamera.detachRenderTarget();
    }
    this.detachRenderTarget();
    this.mRenderTarg = renderTarg;
    renderTarg.mCamera = this;
    this.mRenderTarg.mSpaceRoot = renderTarg.mO3DGraphics.mSpaceRoots[this.mSpaceID];
    renderTarg.mSpaceRoot.mRootNode.parent = renderTarg.mViewInfo.treeRoot;
    this.update(renderTarg.mO3DGraphics);
};

VWObject.prototype.stationary = function (curTime) {
    var v=this.mCurLocation.vel;
    var a=this.mCurLocation.rotvel;
    var t=curTime;//.getTime();
    return v[0]==0&&v[1]==0&&v[2]==0&&a==0&&t-this.mCurLocation.scaleTime/*.getTime()*/>=0&&t-this.mCurLocation.posTime/*.getTime()*/>=0&&t-this.mCurLocation.orientTime/*.getTime()*/>=0;
};
VWObject.prototype.detachRenderTarget = function(curTime) {
    if (this.mRenderTarg) {
        var graphics=this.mRenderTarg.mO3DGraphics;
        this.mRenderTarg.mCamera = null;
        this.mRenderTarg.mSpaceRoot.mRootNode.parent= null;
        this.mRenderTarg.mSpaceRoot = null;
        delete this.mRenderTarg;
        this.update(graphics);
    }
};

VWObject.prototype.updateTransformation = function(graphics) {
    var l=Kata.LocationInterpolate(this.mCurLocation,this.mPrevLocation,graphics.mCurTime);
    this.mNode.identity();
	// FIXME: dbm: interpolate doesn't seem to work for pos, orient; tho scale does
//    this.mNode.translate(l.pos[0],l.pos[1],l.pos[2]);
	var pos = this.mCurLocation.pos;
    this.mNode.translate(l.pos[0],l.pos[1],l.pos[2]);
    this.mNode.scale(l.scale[3],l.scale[3],l.scale[3]);
    if (l.scale[0]!=0||l.scale[1]!=0||l.scale[2]!=0)
        console.log("O3D does not handle offset on scale node");
    this.mNode.quaternionRotate(l.orient);
    if (this.stationary(graphics.mCurTime)) {
        //console.log("Stationary ",this.mID,l,l.pos[0],l.pos[1],l.pos[2]);
        graphics.removeObjectUpdate(this);        
    }

    return l;
};
/**
 * Constructor for O3DGraphics interface.
 *@constructor
 */
var O3DGraphics=function(callbackFunction,parentElement) {
    var oldID = parentElement.id;
    var thus = this;
    this.callback=callbackFunction;
    this.parentEl=parentElement;
    this.initEvents=[];
    this.mObjects={};
    this.mClientElement = null;

    this.mObjectUpdates = {}; // map id -> function

    // For dragging camera
    this.dragging = false;
    this.thisRot = o3djs.math.matrix4.identity();
    this.lastRot = o3djs.math.matrix4.identity();
    this.aball = o3djs.arcball.create(100, 100);
    this.mCurTime=new Date();
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
};

O3DGraphics.prototype.removeObjectUpdate = function(vwObj) {
    delete this.mObjectUpdates[vwObj.mID];
};

VWObject.prototype.sceneLoadedCallback = function(o3d, renderTarg, pack, parent, exception) {
    if (exception) {
        console.log("loading failed: "+this.mMeshURI,exception);
        alert("Could not load: " + this.mMeshURI + "\n" + exception);
    } else {
        console.log("loading finished.");
        o3d._inputCb({msg:"loaded",id:this.mID});
        // Generate draw elements and setup material draw lists.
        o3djs.pack.preparePack(pack, renderTarg.mViewInfo);

        var bbox = o3djs.util.getBoundingBoxOfTree(parent);
        var diag = o3djs.math.length(o3djs.math.subVector(bbox.maxExtent,
                                                          bbox.minExtent));
        console.log("Bounding Box of "+this.mMeshURI, bbox, diag);
        // FIXME: lightPosParam
        // Manually connect all the materials' lightWorldPos params to the context
        var materials = pack.getObjectsByClassName('o3d.Material');
        for (var m = 0; m < materials.length; ++m) {
            var material = materials[m];
            var param = material.getParam('lightWorldPos');
            if (param) {
                param.bind(renderTarg.mSpaceRoot.mLightPosParam);
            }
        }
    }
};

VWObject.prototype.createMesh = function(o3d, path, animation) {
    if (path == null) {
        throw "loadScene with null path";
    }
    path += "/scene.json";
    console.log("Loading: " + path);
    this.mMeshURI = path;
    var thus = this;
    var renderTarg = this.mSpaceRoot.mDefaultRenderView;
    if (animation) {
        var secondCounter = this.mPack.createObject('SecondCounter');
        secondCounter.countMode = o3d.Counter.CYCLE;
        secondCounter.start = animation.beg;
        secondCounter.end = animation.end;
        animParams = {opt_animSource: secondCounter.getParam('count')};
    }
    else {
        animParams = null;
    }
    try {
        o3djs.scene.loadScene(
            this.mSpaceRoot.mElement.client,
            this.mPack, this.mNode, path,
            function(p, par, exc) {
                if (thus.mMeshURI == path) {
                    thus.mMeshPack = p;
                    thus.sceneLoadedCallback(o3d,
                        renderTarg, 
                        p, par, exc);
                }
            },
            animParams
            );
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
};

O3DGraphics.prototype.asyncInit=function (clientElements) {
    var thus=this;
    this.mUnsetParents={};
    this.mClientElement = clientElements[0];
    this.mRenderTargets={};//this contains info about each render target, be it a texture or a clientElement (client elements are mapped by #, textures by uuid)
    this.mSpaceRoots={};//this will contain scene graph roots for each space
    this.mViewWidth=1.0/clientElements.length;
    this._buttonState="up"
    this.send=function(obj) {
        if (obj.msg in this.methodTable) {
            return this.methodTable[obj.msg].call(this, obj);
        } else {
            Kata.warn("Invalid gfx method "+obj.msg);
            Kata.log(obj);
            return false;
        }
    };
    this.destroy=function(){}
    for (var i=0;i<this.initEvents.length;++i) {
        this.send(this.initEvents[i]);
    }
    delete this.initEvents;
    var el = this.mClientElement;
    el.addEventListener('mousedown',
                        function (e){thus._mouseDown(e);},
                        true);
    el.addEventListener('mouseup',
                        function(e){thus._mouseUp(e);},
                        true);
    el.addEventListener('mousemove',
                        function(e){thus._mouseMove(e);},
                        true);

    /*
    el.addEventListener('wheel',
                        function(e){thus._scrollWheel(e);},
                        true);
    */

    // many events not supported in eventListener, need to get them direct from o3d:

    o3djs.event.addEventListener(this.mClientElement, 'wheel', function(e){
        var ev = {};
        ev.type = e.type;
        ev.dy = e.deltaY;
        var msg = {
            msg: "wheel",
            event: ev
        };
        thus._inputCb(msg);
    });
    o3djs.event.addEventListener(this.mClientElement, 'keydown', function(e){
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
        thus._inputCb(msg);
    });
    o3djs.event.addEventListener(this.mClientElement, 'keyup', function(e){
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
        thus._inputCb(msg);
    });
    this.mClientElement.client.setRenderCallback(function() {
        thus.renderCallback();
    });

};

O3DGraphics.prototype.setInputCallback = function(cb) {
        this._inputCb = cb;
    }


O3DGraphics.prototype.renderCallback = function() {
    this.mCurTime=new Date();
    for (var i in this.mRenderTargets) {
        this.mRenderTargets[i].updateProjection();
    }
    for (var id in this.mObjectUpdates) {        
        this.mObjectUpdates[id].update(this);
        
    }
	if (Kata.userRenderCallback) {
		Kata.userRenderCallback(this.mCurTime);
	}
};

O3DGraphics.prototype.methodTable={};

O3DGraphics.prototype.methodTable["Create"]=function(msg) {//this function creates a scene graph node
    var s = msg.spaceid;
    if (!s) {
        s="";
    }
    if (!(s in this.mSpaceRoots)) {
        this.mSpaceRoots[s] = new SpaceDrawList(this, this.mClientElement);
    }
    var spaceRoot=this.mSpaceRoots[s];
    var newObject;
    this.mObjects[msg.id]=newObject=new VWObject(msg.id,msg.time,msg.spaceid,spaceRoot);
    newObject.mNode.parent=spaceRoot.mRootNode;
    if (msg.id in this.mUnsetParents) {
        var unset=this.mUnsetParents[msg.id];
        var unsetl=unset.length;
        for (var i=0;i<unsetl;++i) {
            unset[i].mNode.parent=newObject.mNode;
            delete unset[i].mUnsetParent;
        }
    }
    this.moveTo(newObject,msg,spaceRoot.mRootNode);
    newObject.updateTransformation(this);
};
O3DGraphics.prototype.moveTo=function(vwObject,msg,spaceRootNode) {
	if (!msg.time) msg.time = new Date().getTime();
    var prevParent=vwObject.mNode.parent;
    if (msg.parent!==undefined) {
        if (vwObject.mUnsetParent) {
            delete this.mUnsetParents[vwObject.mUnsetParent][msg.id];
            delete vwObject.mUnsetParent;
        }
        if (msg.parent) {
            if (msg.parent in this.mObjects) {
                vwObject.mNode.parent=this.mObjects[msg.parent].mNode;
            }else {
                if (!(msg.parent in this.mUnsetParents)) {
                    this.mUnsetParents[msg.parent]={};
                }
                this.mUnsetParents[msg.parent][msg.id]=newObject;
                vwObject.mUnsetParent=msg.parent;
                vwObject.mNode.parent=spaceRootNode;
            }
        }else {
            vwObject.mNode.parent=spaceRootNode;
        }
        function o3dTransformationToLocationList(gfx,node){
            var retval=[];
            while(node!=null) {
                var loc;
                if (node.mKataObject) {
                    loc=[node.mKataObject.mPrevLocation,node.mKataObject.mPrevLocation];
                }else {
                    var cloc=Kata.LocationFromO3DTransformation(node,new Date());
                    loc=[cloc,cloc];
                }
                retval[retval.length]=loc;
                node=node.parent;
            }
            return retval;
        }
        var prevParentNode=o3dTransformationToLocationList(this,prevParent);
        var curParentNode=o3dTransformationToLocationList(this,vwObject.mNode.parent);
        vwObject.mPrevLocation=Kata.LocationReparent(vwObject.mPrevLocation,prevParentNode,curParentNode);
        vwObject.mCurLocation=Kata.LocationReparent(vwObject.mCurLocation,prevParentNode,curParentNode);
    }
    var newLoc=Kata.LocationUpdate(msg,vwObject.mCurLocation,vwObject.mPrevLocation,this.mCurTime);
    vwObject.mPrevLocation=vwObject.mCurLocation;
    vwObject.mCurLocation=newLoc;
    if (!vwObject.stationary(this.mCurTime)) {
        this.addObjectUpdate(vwObject);
    }
	//FIXME: why are things working even without this code?
/*
    if (msg.pos) {
        vwObject.pos=msg.pos;
        vwObject.posTime=msg.time;
    }
    if (msg.vel)
        vwObject.vel=msg.vel;
    if (msg.orient) {
        vwObject.orient=msg.orient;
        vwObject.orientTime=msg.time;
    }
    if (msg.rotaxis)
        vwObject.rotaxis=msg.rotaxis;
    if (msg.rotvel)
        vwObject.rotvel=msg.rotvel;
    if (msg.scale) {
        vwObject.scale=msg.scale;
        vwObject.scaleTime=msg.time;
    }
*/
    //FIXME actually translate element
};
O3DGraphics.prototype.methodTable["Move"]=function(msg) {
    var vwObject=this.mObjects[msg.id];
    this.moveTo(vwObject,msg);
    vwObject.update(this);
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
            if (children[i].mKataObject) {
                this.mUnsetParents[msg.id][children[i].mKataObject.mId]=children[i].mKataObject;
                children[i].mKataObject.mUnsetParent=msg.id;
                children[i].parent=this.mSpaceRoots[children[i].mKataObject.mSpaceId].mRootNode;
            }
            children[i].localTransformMatrix=mat;
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
    if (msg.mesh && msg.id in this.mObjects) {
        var vwObject=this.mObjects[msg.id];
        vwObject.createMesh(this, msg.mesh, msg.anim);
        if (msg.up_axis == "Z_UP") {
            this.moveTo(vwObject, {
                // FIXME: needs to be permanent, so future setOrientations will be relative to this
                orient: [-0.7071067805519557, 0, 0, 0.7071067818211394]
            });
        }
        vwObject.update(this);
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
        vwObject.createCamera(o3djs.math.degToRad(Kata.GraphicsSimulation.YFOV_DEGREES),
                              Kata.GraphicsSimulation.CAMERA_NEAR,
                              Kata.GraphicsSimulation.CAMERA_FAR);
    }
};
O3DGraphics.prototype.methodTable["AttachCamera"]=function(msg) {
    var renderTarg;
    if (msg.id in this.mObjects && msg.target !== undefined) {
        var cam = this.mObjects[msg.id];
        var spaceView;
        console.log("cam.mSpaceID:", cam.mSpaceID);
        if (cam.mSpaceID in this.mSpaceRoots) {
            spaceView = this.mSpaceRoots[cam.mSpaceID];
        } else {
            spaceView = new SpaceDrawList(this, this.mClientElement);
            this.mSpaceRoots[cam.mSpaceID] = spaceView;
        }

        renderTarg = this.mRenderTargets[msg.target];
        if (!renderTarg) {
            renderTarg = new RenderTarget(
                this,
                spaceView,
                cam);
            this.mRenderTargets[msg.target] = renderTarg;
        }

        renderTarg.createExtraView(
            [0.7, 0.7, 0.2*msg.target, 1],
            [this.mViewWidth*(0+msg.target), 0, this.mViewWidth, 1]
        );
        renderTarg.updateProjection();
        if (renderTarg) {
            cam.attachRenderTarget(renderTarg);
        }
    }
};
O3DGraphics.prototype.methodTable["DetachCamera"]=function(msg) {
    if (msg.id in this.mObjects) {
        var cam = this.mObjects[msg.id];
        cam.detachRenderTarget(this.mCurTime);
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

O3DGraphics.prototype._extractMouseEventInfo = function(e){
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

O3DGraphics.prototype._mouseDown = function(e){
    if (e.button<2) this._buttonState="down";
    var ev = this._extractMouseEventInfo(e);
    var msg = {
        msg: "mousedown",
        event: ev
    };
    this._inputCb(msg);
};

O3DGraphics.prototype._mouseUp = function(e){
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
O3DGraphics.prototype._mouseMove = function(e){
    if (this._buttonState == "down") {
        var ev = this._extractMouseEventInfo(e);
        var msg = {
            msg: "mousemove",
            event: ev
        };
        this._inputCb(msg);
    }
};

O3DGraphics.prototype._scrollWheel = function(e){
    /// FIXME: figure out what event attributes to copy
    var msg = {
        msg: "wheel",
        event: e
    };
    this._inputCb(msg);
};

VWObject.prototype.updateCamera = function(graphics) {
  var location=this.updateTransformation(graphics);
  
  var mat = o3djs.quaternions.quaternionToRotation(location.orient);
  //console.log(mat);
  o3djs.math.matrix4.setTranslation(mat, location.pos);
  this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.inverse(mat);
/*
  this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.matrix4.lookAt([0, 1, 5],  // eye
                                            [0, 0, 0],  // target
                                            [0, 1, 0]); // up
*/
};

// Register as a GraphicsSimulation if possible.
Kata.require([
    'katajs/gfx/WebGLCompat.js',
    'katajs/oh/GraphicsSimulation.js'
], function() {
    Kata.GraphicsSimulation.registerDriver("o3d", O3DGraphics);
}, "katajs/gfx/o3dgfx.js");
