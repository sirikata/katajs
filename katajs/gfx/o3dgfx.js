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
}


/**
 * @constructor
 * @param {!O3DGraphics} o3dgfx The render system for which the render target is created
 * @param {!o3d.node} spaceRoot 
 * Creates a render target for a view info to be stored within
 */

function RenderTarget(o3dgfx,spaceRoot,cam) {
  this.mO3DGraphics = o3dgfx;
  this.mSpaceRoot = spaceRoot;
  console.log(spaceRoot.mElement);
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
      this.mCamera.mFOV, this.mWidth / this.mHeight,
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

/**
 * Returns the identity location updated at the current time
 * @return {!Location} an identity object with time set to newDate
 */
function LocationIdentityNow() {
    return LocationIdentity(new Date());
};
/**
 * Returns the identity location updated passed-in time
 * @param {!Date} time the time which should be filled in to the location object 
 * @return {!Location} an identity object with time set to time
 */
function LocationIdentity(time){
    return {
      mScale:[1,1,1],
      mScaleTime:time,
      mPos:[0,0,0],
      mPosTime:time,
      mOrient:[0,0,0,1],
      mOrientTime:time,
      mVel:[0,0,0],
      mRotAxis:[0,0,1],
      mRotVel:0
    };
};
/**
 * Computes the number of seconds between 2 times as a floating point number
 * @param {!Date} newTime the time farthest in the future to subtract
 * @param {!Date} oldTime the time farthest in the past to take the difference of
 * @return {number} number of seconds between the two times
 */
function deltaTime(newTime,oldTime) {
    return (newTime/*.getTime()*/-oldTime/*.getTime()*/)*.001;
}
/**
 * Takes a coordinate, a velocity and a time and extrapolates linearly from the starting location
 * @param {Array} a the starting vector at deltaTime=0
 * @param {Array} adel the velocity on the 3vec a
 * @param {number} deltaTime the number of seconds that have elapsed since the coordinate was correct
 * @return {Array} the extrapolated vector
 */
function _helperLocationExtrapolate3vec(a,adel,deltaTime){
    return [a[0]+adel[0]*deltaTime,
            a[1]+adel[1]*deltaTime,
            a[2]+adel[2]*deltaTime];
}
/**
 * Takes an axis and an angle and makes a quaternion out of them with [x,y,z,w] as the coordinate layout
 * @param {Array} aaxis axis 
 * @param {Array} aangle the angle in radians
 * @return {Array} the quaternion
 */
function _helperQuatFromAxisAngle(aaxis,aangle) {
    var sinHalf=Math.sin(aangle/2.0);
    var cosHalf=Math.cos(aangle/2.0);
    return [sinHalf*aaxis[0],sinHalf*aaxis[1],sinHalf*aaxis[2],cosHalf];
}

/**
 * Extrapolates the quaternion using the velocity and axis deltaTime seconds into the future
 * @param {Array} a starting quaternion
 * @param {number} avel the rotational speed in radians per second rotating around aaxis
 * @param {Array} aaxis the rotational axis around which a rotates
 * @param {number} deltaTime the number of seconds since the starting quaternion was measured
 * @return {Array} The quaternion extrapolated deltaTime seconds from a
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

/**
 * If the time is after the first, newer 3vec (a), it extrapolates the 3vec 
 * If the time is before the second, older 3vec (b) it uses the second, older 3vec
 * otherwise it does a weighted interpolation of the 3vecs
 * @param {Array} a the ending quaternion to interpolate 
 * @param {number} avel the velocity a will move
 * @param {Date} atime the sample time at which the final 3vec was measured to be at a
 * @param {Array} b starting, older 3vec to interpolate
 * @param {number} bvel the velocity b moved at
 * @param {Date} btime the sample time at which the 3vec was measured to be at b
 * @param {Date} curTime the current date to interpolate at
 * @return {Array} The quaternion interpolated between a and b at curtime
 */
function _helperLocationInterpolate3vec(a,adel,atime,b,bdel,btime,curtime) {
    var secondsPassed=deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return _helperLocationExtrapolate3vec(a,adel,secondsPassed);
    }
    var sampleDelta=deltaTime(atime,btime);
    if (sampleDelta==0) {
        return _helperLocationExtrapolate3vec(a,adel,secondsPassed);
    }
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }
    b=_helperLocationExtrapolate3vec(b,bdel,secondsPassed);//extrapolate first location into the future based on a sample and velocity
    var interp=secondsPassed/sampleDelta;
    var ointerp=1.0-interp;
    return [interp*a[0]+ointerp*b[0],
            interp*a[1]+ointerp*b[1],
            interp*a[2]+ointerp*b[2]];
}
/**
 * If the time is after the first, newer quaternion (a), it extrapolates the quaternion 
 * If the time is before the second, older quaternion (b) it uses the second quaternion
 * otherwise it does a weighted interpolation of the quaternions
 * @param {Array} a the ending quaternion to interpolate 
 * @param {number} avel the rotational speed in radians per second a rotates around aaxis
 * @param {Array} aaxis the rotational axis around which a rotates
 * @param {Array} atime the sample time at which the final quaternion was measured to be at a
 * @param {Date} b starting quaternion to interpolate
 * @param {number} bvel the rotational speed in radians per second b rotates around baxis
 * @param {Array} baxis the rotational axis around which b rotates
 * @param {Date} btime the sample time at which the beginning quaternion was measured to be at b
 * @param {Date} curTime the current date to interpolate at
 * @return {Array} The quaternion interpolated between a and b at curtime
 */
function _helperLocationInterpolateQuaternion(a,avel,aaxis,atime,b,bvel,baxis,btime,curtime) {
    var secondsPassed=deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return _helperLocationExtrapolateQuaternion(a,avel,aaxis,secondsPassed);
    }
    var sampleDelta=deltaTime(atime,btime);
    if (sampleDelta==0) {
        return _helperLocationExtrapolateQuaternion(a,avel,aaxis,secondsPassed);
    }
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }

    b=_helperLocationExtrapolateQuaternion(b,bvel,baxis,secondsPassed);
    var interp=secondsPassed/sampleDelta;
    var ointerp=1.0-interp;
    var x=interp*a[0]+ointerp*b[0];
    var y=interp*a[1]+ointerp*b[1];
    var z=interp*a[2]+ointerp*b[2];
    var w=interp*a[3]+ointerp*b[3];
    var len=Math.sqrt(w*w+x*x+y*y+z*z);
    if (len<1.0e-20)
        return [x,y,z,w];
    return [x/len,y/len,z/len,w/len];
}

/**
 * interpolates between 2 locations at a time probably between the two, otherwise the newer one is extrapolated
 * @param {!Location} location the newest location update
 * @param {!Location} prevLoaction the second newest location update
 * @param {Date} time the time to extrapolate to
 * @returns {!Location} an param-by-param interpolation of the locations if the time is between the two times for that property, otherwise an extrapolation of the newest location update to the future
 */
function LocationInterpolate(location,prevLocation,time) {
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
}


/**
 * interpolates between 2 locations where 3 times are passed in and used to separately interpolate each field
 * @param {!Location} location the newest location update
 * @param {!Location} prevLoaction the second newest location update
 * @param {Date} posTime the time to extrapolate to for positions
 * @param {Date} orientTime the time to extrapolate to for orientations
 * @param {Date} scaleTime the time to extrapolate to for scale
 * @returns {!Location} an param-by-param interpolation of the locations if the time is between the two times for that property, otherwise an extrapolation of the newest location update to the future
 */
function LocationTriTimeInterpolate(location,prevLocation,posTime,orientTime,scaleTime) {
    return {
        mScale:_helperLocationInterpolate3vec(location.mScale,[0,0,0],location.mScaleTime,
                                              prevLocation.mScale,[0,0,0],prevLocation.mScaleTime,
                                              scaleTime),
        mScaleTime:scaleTime,
        mPos:_helperLocationInterpolate3vec(location.mPos,location.mVel,location.mPosTime,
                                            prevLocation.mPos,prevLocation.mVel,prevLocation.mPosTime,posTime),
        mPosTime:posTime,
        mOrient:_helperLocationInterpolateQuaternion(location.mOrient,location.mRotVel,location.mRotAxis,location.mOrientTime,
                                                     prevLocation.mOrient,prevLocation.mRotVel,prevLocation.mRotAxis,prevLocation.mOrientTime,
                                                     orientTime),
        mOrientTime:orientTime,
        mRotVel:location.mRotVel,
        mRotAxis:location.mRotAxis,
        mVel:location.mVel
    };
}


/**
 * Extrapolates a location to a future time so that it may be interpolated
 * @param {!Location} location the latest location sample
 * @param {Date} time the current time for which to extrapolate over
 * @returns {!Location} a Location class that has the current time set to time but the same velocity and rotation
 */
function LocationExtrapolate(location,time) {
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
}



/**
 * returns a new location that has the default properties where the msg does not specify the values
 * and uses the messages values where they are specified
 * @param msg the network message being received
 * @returns {!Location} a Location class with curLocation augmented with the msg fields that exist
 */ 
function LocationSet(msg) {
    if (msg.time==undefined)
        msg.time=new Date();
    if (msg.scale==undefined)
        msg.scale=[1,1,1];
    if (msg.vel==undefined)
        msg.vel=[0,0,0];
    if (msg.rotaxis==undefined)
        msg.rotaxis=[0,0,1];
    if (msg.rotvel==undefined)
        msg.rotvel=0;
    if (msg.orient==undefined)
        msg.orient=[0,0,0,1];
    return {
      mScale:msg.scale,
      mScaleTime:msg.time,
      mPos:msg.pos,  
      mPosTime:msg.time,
      mOrient:msg.orient,  
      mOrientTime:msg.time,
      mVel:msg.vel,
      mRotAxis:msg.rotaxis,
      mRotVel:msg.rotvel

    };
}
/**
 * Takes a current and prev location samples and 
 * returns a new location that has the previous location properties where the msg does not specify the values
 * and uses the messages values where they are specified
 *  then the currentLocation is updated with prevLocations values if the would otherwise be the same as curLocation
 * @param msg the network message being received
 * @param {!Location} curLocation the currently known latest update (modified with prevLocation items that have not changed in new update)
 * @param {!Location} prevLocation the update before the current update
 * @returns {!Location} a Location class with curLocation augmented with the msg fields that exist
 */ 
var LocationUpdate=function(msg,curLocation,prevLocation, curDate) {
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
        if (msg.vel) {
            curLocation.mPos=_helperLocationExtrapolate3vec(prevLocation.mPos,prevLocation.mVel,deltaTime(curDate,prevLocation.mPosTime));
            curLocation.mPosTime=curDate;

            retval.mPos=_helperLocationExtrapolate3vec(curLocation.mPos,curLocation.mVel,deltaTime(msg.time,curLocation.mPosTime));
            retval.mPosTime=msg.time;
        }
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
        if (msg.rotvel&&msg.rotaxis) {
            curLocation.mOrient=_helperLocationExtrapolateQuaternion(prevLocation.mOrient,prevLocation.mRotVel,prevLocation.mRotAxis,deltaTime(curDate,prevLocation.mOrientTime));
            curLocation.mOrientTime=curDate;

            retval.mOrient=_helperLocationExtrapolateQuaternion(curLocation.mOrient,curLocation.mRotVel,curLocation.mRotAxis,deltaTime(msg.time,curLocation.mOrientTime));
            retval.mOrientTime=msg.time;
        }
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
        curLocation.mScale=prevLocation.mScale;
        curLocation.mScaleTime=prevLocation.mScaleTime;
    }
    return retval;
};
/**
 * Multiplies two quaternions.
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The quaternion product a * b.
 */
function QuaternionMulQuaternion(a, b) {
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
};

/**
 * Computes a 4-by-4 rotation matrix (with trivial translation component)
 * given a quaternion.  We assume the convention that to rotate a vector v by
 * a quaternion r means to express that vector as a quaternion q by letting
 * q = [v[0], v[1], v[2], 0] and then obtain the rotated vector by evaluating
 * the expression (r * q) / r.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.math.Matrix4} A 4-by-4 rotation matrix.
 */
function katajs_QuaternionToRotation (q) {
  var qX = q[0];
  var qY = q[1];
  var qZ = q[2];
  var qW = q[3];

  var qWqW = qW * qW;
  var qWqX = qW * qX;
  var qWqY = qW * qY;
  var qWqZ = qW * qZ;
  var qXqW = qX * qW;
  var qXqX = qX * qX;
  var qXqY = qX * qY;
  var qXqZ = qX * qZ;
  var qYqW = qY * qW;
  var qYqX = qY * qX;
  var qYqY = qY * qY;
  var qYqZ = qY * qZ;
  var qZqW = qZ * qW;
  var qZqX = qZ * qX;
  var qZqY = qZ * qY;
  var qZqZ = qZ * qZ;

  var d = qWqW + qXqX + qYqY + qZqZ;

  return [
    [(qWqW + qXqX - qYqY - qZqZ) / d,
     2 * (qWqZ + qXqY) / d,
     2 * (qXqZ - qWqY) / d, 0],
    [2 * (qXqY - qWqZ) / d,
     (qWqW - qXqX + qYqY - qZqZ) / d,
     2 * (qWqX + qYqZ) / d, 0],
    [2 * (qWqY + qXqZ) / d,
     2 * (qYqZ - qWqX) / d,
     (qWqW - qXqX - qYqY + qZqZ) / d, 0],
    [0, 0, 0, 1]];
};
function Vec3Cross(a,b) {
    return [a[1]*b[2]-a[2]*b[1],
            a[2]*b[0]-a[0]*b[2],
            a[0]*b[1]-a[1]*b[0]];
}
function Vec3Add(a,b) {
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
}
function Vec3Sub(a,b) {
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
}
function Vec3Scale(a,b) {
    return [a[0]*b,a[1]*b,a[2]*b];
}
function Vec3Rotate(a,v0,v1,v2) {
    return [a[0]*v0[0]+a[1]*v1[0]+a[2]*v2[0],
            a[0]*v0[1]+a[1]*v1[1]+a[2]*v2[1],
            a[0]*v0[2]+a[1]*v1[2]+a[2]*v2[2]];
}
/**
 * LocationCompose takes in a location and a prev and cur position for a parent node
 * and turns it into a single location that represents the current transformation at 
 * the time snapshots listed in loc
 * @param {!Location} loc the location to be combined with its parents
 * @param {!Location} prevParentLoc the parent's previous location
 * @param {!Location} curParentLoc the parent's current location
 * @returns{!Location} loc, combined with the appropriate interpolation of cur and prevParentLoc
 */
function LocationCompose(loc, prevParentLoc, curParentLoc) {
    var parentLoc=LocationTriTimeInterpolate(curParentLoc,prevParentLoc,loc.mPosTime,loc.mOrientTime,loc.mScaleTime);
    var rotation=katajs_QuaternionToRotation(parentLoc.mOrient);
    //First lets get velocity right--we're acting like a lever with a vector of loc.mPos
    var topLevelVelocity=Vec3Add(Vec3Add(Vec3Scale(Vec3Cross(parentLoc.mRotAxis,
                                                             loc.mPos),
                                                   parentLoc.mRotVel),
                                         parentLoc.mVel),
                                 Vec3Rotate(loc.mVel,rotation[0],rotation[1],rotation[2]));
    var topLevelAxis=Vec3Rotate(loc.mRotAxis,rotation[0],rotation[1],rotation[2]);
    var topLevelPos=Vec3Add(Vec3Rotate(loc.mPos,rotation[0],rotation[1],rotation[2]),
                            parentLoc.mPos);
    
    var topLevelOrient=QuaternionMulQuaternion(parentLoc.mOrient,loc.mOrient);
    var topLevelScale=loc.mScale;//FIXME what's right to do here--is it a rigid body or not!
    return {mPos:topLevelPos,
            mOrient:topLevelOrient,
            mScale:topLevelScale,
            mRotAxis:topLevelAxis,
            mRotVel:loc.mRotVel,
            mVel:topLevelVelocity,
            mPosTime:loc.mPosTime,
            mOrientTime:loc.mOrientTime,
            mScaleTime:loc.mScaleTime};
}
function katajs_QuaternionInverse(q) {
  var q0 = q[0];
  var q1 = q[1];
  var q2 = q[2];
  var q3 = q[3];

  var d = 1 / (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
  return [-q0 * d, -q1 * d, -q2 * d, q3 * d];
}

/**
 * LocationInverseCompose takes in a location and a prev and cur position for a parent node
 * and turns it into a single location that represents the current transformation at 
 * the time snapshots listed in loc as a child transformation of the ParentLocs 
 * so that it would remain at the same position that it was as a child of prev and 
 * curParentLoc at its respective timestamps
 * @param {!Location} loc the location to be combined with its parents
 * @param {!Location} prevParentLoc the parent's previous location
 * @param {!Location} curParentLoc the parent's current location
 * @returns{!Location} loc, combined with the appropriate interpolation of cur and prevParentLoc
 */
function LocationInverseCompose(loc, prevParentLoc, curParentLoc) {
    var parentLoc=LocationTriTimeInterpolate(curParentLoc,prevParentLoc,loc.mPosTime,loc.mOrientTime,loc.mScaleTime);
    var inverseRotation=katajs_QuaternionInverse(parentLoc.mOrient);
    var rotation=katajs_QuaternionToRotation(inverseRotation);
    //First lets get velocity right--we're acting like a lever with a vector of loc.mPos
    var innerVelocity=Vec3Rotate(Vec3Add(Vec3Sub(Vec3Scale(Vec3Cross(parentLoc.mRotAxis,
                                                                     loc.mPos),
                                                           -parentLoc.mRotVel),
                                                 parentLoc.mVel),
                                         loc.mVel),rotation[0],rotation[1],rotation[2]);
    var innerAxis=Vec3Rotate(loc.mRotAxis,rotation[0],rotation[1],rotation[2]);
    var innerPos=Vec3Rotate(Vec3Sub(loc.mPos,parentLoc.mPos),rotation[0],rotation[1],rotation[2]);
    
    var innerOrient=QuaternionMulQuaternion(loc.mOrient,inverseRotation);
    var innerScale=loc.mScale;//FIXME what's right to do here--is it a rigid body or not!
    return {mPos:innerPos,
            mOrient:innerOrient,
            mScale:innerScale,
            mRotAxis:innerAxis,
            mRotVel:loc.mRotVel,
            mVel:innerVelocity,
            mPosTime:loc.mPosTime,
            mOrientTime:loc.mOrientTime,
            mScaleTime:loc.mScaleTime};
}
/**
 * takes the loc that is based off of the oldNode and places it as a child of newNode
 * @param {!Location} loc the location of the object relative to oldNode
 * @param {Array} oldNodes the previous array of pairs of [prev,cur] Location classes that represent the object with lowest element being farthest from the root of the heirarchy of transforms
 * @param {Array} newNodes the current array of pairs of [prev,cur] Location classes that represent the object with the first element being farthest from the root of the heirarchy of transforms
 * @returns {!Location} a Location class that has been composed with oldNode and then the inverse of newNode
 */ 
function LocationReparent(loc,oldNode,newNode){
    var i;
    var oldNodeLength=oldNode.length;
    for (i=0;i<oldNodeLength;i++) {
        loc =LocationCompose(loc,oldNode[i][0],oldNode[i][1]);
    }
    for (i=newNode.length-1;i>=0;i--) {
        loc =LocationInverseCompose(loc,newNode[i][0],newNode[i][1]);
    }
    return loc;
}

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

function LocationFromO3DTransformation(transformation,time) {
    var mat=transformation.localMatrix;
    
    return LocationSet({time:time,pos:o3djs.math.matrix4.getTranslation(mat),orient:kata3d_RotationToQuaternion(mat)});
}
function VWObject(id,time,spaceid,spaceroot) {
    var pack=spaceroot.mElement.client.createPack();

    this.mID = id;
    this.mSpaceID = spaceid;
    this.mPack = pack;
    this.mNode = pack.createObject('o3d.Transform');
    this.mCurLocation=LocationIdentityNow();
    this.mPrevLocation=LocationIdentityNow(new Date(0));
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
    var v=this.mCurLocation.mVel;
    var a=this.mCurLocation.mAngVel;
    var t=curTime;//.getTime();
    return v[0]==0&&v[1]==0&&v[2]==0&&a==0&&t-this.mCurLocation.mScaleTime/*.getTime()*/>=0&&t-this.mCurLocation.mPosTime/*.getTime()*/>=0&&t-this.mCurLocation.mOrientTime/*.getTime()*/>=0;
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
    var l=LocationInterpolate(this.mCurLocation,this.mPrevLocation,graphics.mCurTime);
    this.mNode.identity();
    //FIXME need to interpolate
    this.mNode.translate(l.mPos[0],l.mPos[1],l.mPos[2]);
    this.mNode.scale(l.mScale[0],l.mScale[1],l.mScale[2]);
    this.mNode.quaternionRotate(l.mOrient);
    if (this.stationary(graphics.mCurTime)) {
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

    this.lightPosParam = null;

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

VWObject.prototype.sceneLoadedCallback = function(renderTarg, lightPosParam, pack, parent, exception) {
    if (exception) {
        console.log("loading failed: "+this.mMeshURI,exception);
        alert("Could not load: " + this.mMeshURI + "\n" + exception);
    } else {
        console.log("loading finished.");
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
                param.bind(lightPosParam);
            }
        }
    }
};

VWObject.prototype.createMesh = function(lightPosParam, path) {
    if (path == null) {
        throw "loadScene with null path";
    }
    path += "/scene.json";
    console.log("Loading: " + path);
    this.mMeshURI = path;
    var thus = this;
    var renderTarg = this.mSpaceRoot.mDefaultRenderView;
    try {
        o3djs.scene.loadScene(
            this.mSpaceRoot.mElement.client,
            this.mPack, this.mNode, path,
            function(p, par, exc) {
                if (thus.mMeshURI == path) {
                    thus.mMeshPack = p;
                    thus.sceneLoadedCallback(
                        renderTarg, lightPosParam,
                        p, par, exc);
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
};

O3DGraphics.prototype.asyncInit=function (clientElements) {
    var thus=this;
    this.mUnsetParents={};
    this.mClientElement = clientElements[0];
    this.mRenderTargets={};//this contains info about each render target, be it a texture or a clientElement (client elements are mapped by #, textures by uuid)
    this.mSpaceRoots={};//this will contain scene graph roots for each space
    this.mViewWidth=1.0/clientElements.length;

    this.send=function(obj) {
        return this.methodTable[obj.msg].call(this, obj);
    };
    this.destroy=function(){}
    for (var i=0;i<this.initEvents.length;++i) {
        this.send(this.initEvents[i]);
    }
    delete this.initEvents;
    var el = this.mClientElement;
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

    this.mClientElement.client.setRenderCallback(function() {
        thus.renderCallback();
    });

};

O3DGraphics.prototype.renderCallback = function() {
    this.mCurTime=new Date();
    for (var i in this.mRenderTargets) {
        this.mRenderTargets[i].updateProjection();
    }
    for (var id in this.mObjectUpdates) {        
        this.mObjectUpdates[id].update(this);
        
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
    var spaceRoot=this.mSpaceRoots[msg.spaceid];
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
    this.moveTo(newObject,msg,spaceRoot.mRootNode);
    newObject.updateTransformation(this);
};
O3DGraphics.prototype.moveTo=function(vwObject,msg,spaceRootNode) {
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
                vwObject.mNode.parent=spaceRoot;
            }
        }else {
            vwObject.mNode.parent=spaceRoot;
        }
        function o3dTransformationToLocationList(gfx,node){
            var retval=[];
            while(node!=null) {
                var loc;
                if (node.mKataObject) {
                    loc=[node.mKataObject.mPrevLocation,node.mKataObject.mPrevLocation];
                }else {
                    var cloc=LocationFromO3DTransformation(node,new Date());
                    loc=[cloc,cloc];
                }
                retval[retval.length]=loc;
                node=node.parent;
            }
            return retval;
        }
        var prevParentNode=o3dTransformationToLocationList(this,prevParent);
        var curParentNode=o3dTransformationToLocationList(this,vwObject.mNode.parent);
        vwObject.mPrevLocation=LocationReparent(vwObject.mPrevLocation,prevParentNode,curParentNode);
        vwObject.mCurLocation=LocationReparent(vwObject.mCurLocation,prevParentNode,curParentNode);
    }
    var newLoc=LocationUpdate(msg,vwObject.mCurLocation,vwObject.mPrevLocation,this.mCurTime);
    vwObject.mPrevLocation=vwObject.mCurLocation;
    vwObject.mCurLocation=newLoc;
    if (!vwObject.stationary(this.mCurTime)) {
        this.addObjectUpdate(vwObject);
    }
/*
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
*/
    //FIXME actually translate element
};
O3DGraphics.prototype.methodTable["Move"]=function(msg) {
    var vwObject=this.mObjects[msg.id];
    this.moveTo(vwObject,msg);
    vwObject.updateTransformation(this);
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
            children[i].parent=this.mSpaceRoots[children[i].mKataObject.mSpaceId].mRootNode;
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
        vwObject.createMesh(this.lightPosParam, msg.mesh);
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
    if (msg.id in this.mObjects && msg.target !== undefined) {
        var cam = this.mObjects[msg.id];
        var spaceView;
        console.log(cam.mSpaceID);
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


O3DGraphics.prototype.startDragging = function(e) {
  this.lastRot = this.thisRot;

  this.aball.click([e.x, e.y]);

  this.dragging = true;
};

O3DGraphics.prototype.drag = function(e) {
  if (this.dragging) {
    var rotationQuat = this.aball.drag([e.x, e.y]);
    var rot_mat = o3djs.quaternions.quaternionToRotation(rotationQuat);
    this.thisRot = o3djs.math.matrix4.mul(this.lastRot, rot_mat);

    var root = this.mRenderTargets[0].mSpaceRoot.mRootNode;
    var m = root.localMatrix;
    o3djs.math.matrix4.setUpper3x3(m, this.thisRot);
    root.localMatrix = m;
    this.mRenderTargets[0].mCamera.updateCamera(this);
  }
};

O3DGraphics.prototype.stopDragging = function(e) {
  this.dragging = false;
};

VWObject.prototype.updateCamera = function(graphics) {
  var location=this.updateTransformation(graphics);
  
  var mat = o3djs.quaternions.quaternionToRotation(location.mOrient);
  //console.log(mat);
  o3djs.math.matrix4.setTranslation(mat, location.mPos);
  this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.inverse(mat);
/*
  this.mRenderTarg.mViewInfo.drawContext.view = o3djs.math.matrix4.lookAt([0, 1, 5],  // eye
                                            [0, 0, 0],  // target
                                            [0, 1, 0]); // up
*/
};

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
};

// Register as a GraphicsSimulation if possible.
Kata.defer(function() {
               Kata.GraphicsSimulation.registerDriver("o3d", O3DGraphics);
           });
