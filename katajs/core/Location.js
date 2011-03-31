/*  Location.js Functions to bring together space and time to reveal the logical 3space position of an object
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

Kata.require([], function() {

/**
 * Returns the identity location updated at the current time
 * @return {!Location} an identity object with time set to newDate
 */
Kata.LocationIdentityNow=function() {
    return Kata.LocationIdentity(new Date());
};
/**
 * Returns the identity location updated passed-in time
 * @param {!Date} time the time which should be filled in to the location object 
 * @return {!Location} an identity object with time set to time
 */
Kata.LocationIdentity=function(time){
    return {
      scale:[0,0,0,1],
      scaleTime:time,
      pos:[0,0,0],
      posTime:time,
      orient:[0,0,0,1],
      orientTime:time,
      vel:[0,0,0],
      rotaxis:[0,0,1],
      rotvel:0
    };
};
/**
 * Computes the number of seconds between 2 times as a floating point number
 * @param {!Date} newTime the time farthest in the future to subtract
 * @param {!Date} oldTime the time farthest in the past to take the difference of
 * @return {number} number of seconds between the two times
 */
Kata.deltaTime=function(newTime,oldTime) {
    return (newTime/*.getTime()*/-oldTime/*.getTime()*/)*.001;
}
/**
 * Takes a coordinate, a velocity and a time and extrapolates linearly from the starting location
 * @param {Array} a the starting vector at deltaTime=0
 * @param {Array} adel the velocity on the 3vec a
 * @param {number} deltaTime the number of seconds that have elapsed since the coordinate was correct
 * @return {Array} the extrapolated vector
 */
Kata._helperLocationExtrapolate3vec=function(a,adel,deltaTime){
    return [a[0]+adel[0]*deltaTime,
            a[1]+adel[1]*deltaTime,
            a[2]+adel[2]*deltaTime];
};
/**
 * Takes an axis and an angle and makes a quaternion out of them with [x,y,z,w] as the coordinate layout
 * @param {Array} aaxis axis 
 * @param {Array} aangle the angle in radians
 * @return {Array} the quaternion
 */
Kata._helperQuatFromAxisAngle=function(aaxis,aangle) {
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
Kata.extrapolateQuaternion=function(a,avel,aaxis,deltaTime){
    var aangle=avel*deltaTime;
    var b=Kata._helperQuatFromAxisAngle(aaxis,aangle);
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
Kata._helperLocationInterpolate3vec=function(a,adel,atime,b,bdel,btime,curtime) {
    var secondsPassed=Kata.deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return Kata._helperLocationExtrapolate3vec(a,adel,secondsPassed);
    }
    var sampleDelta=Kata.deltaTime(atime,btime);
    if (sampleDelta==0) {
        return Kata._helperLocationExtrapolate3vec(a,adel,secondsPassed);
    }
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }
    b=Kata._helperLocationExtrapolate3vec(b,bdel,secondsPassed);//extrapolate first location into the future based on a sample and velocity
    var interp=secondsPassed/sampleDelta;
    var ointerp=1.0-interp;
    return [interp*a[0]+ointerp*b[0],
            interp*a[1]+ointerp*b[1],
            interp*a[2]+ointerp*b[2]];
};

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
Kata._helperLocationInterpolateNoVel4vec=function(a,atime,b,btime,curtime) {
    var secondsPassed=Kata.deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return a;
    }
    var sampleDelta=Kata.deltaTime(atime,btime);
    if (sampleDelta==0) {
        return a;
    }
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }
    
    var interp=secondsPassed/sampleDelta;
    var ointerp=1.0-interp;
    return [interp*a[0]+ointerp*b[0],
            interp*a[1]+ointerp*b[1],
            interp*a[2]+ointerp*b[2],
            interp*a[3]+ointerp*b[3]];
};

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
Kata._helperLocationInterpolateQuaternion=function(a,avel,aaxis,atime,b,bvel,baxis,btime,curtime) {
    var secondsPassed=Kata.deltaTime(curtime,atime);
    if (secondsPassed>0) {
        return Kata.extrapolateQuaternion(a,avel,aaxis,secondsPassed);
    }
    var sampleDelta=Kata.deltaTime(atime,btime);
    if (sampleDelta==0) {
        return Kata.extrapolateQuaternion(a,avel,aaxis,secondsPassed);
    }
    secondsPassed+=sampleDelta;
    if (secondsPassed<0) {
        return b;
    }

    b=Kata.extrapolateQuaternion(b,bvel,baxis,secondsPassed);
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
};

/**
 * interpolates between 2 locations at a time probably between the two, otherwise the newer one is extrapolated
 * @param {!Location} location the newest location update
 * @param {!Location} prevLoaction the second newest location update
 * @param {Date} time the time to extrapolate to
 * @returns {!Location} an param-by-param interpolation of the locations if the time is between the two times for that property, otherwise an extrapolation of the newest location update to the future
 */
Kata.LocationInterpolate=function(location,prevLocation,time) {
    return {
        scale:Kata._helperLocationInterpolateNoVel4vec(location.scale,location.scaleTime,
                                              prevLocation.scale,prevLocation.scaleTime,
                                              time),
        scaleTime:time,
        pos:Kata._helperLocationInterpolate3vec(location.pos,location.vel,location.posTime,
                                            prevLocation.pos,prevLocation.vel,prevLocation.posTime,time),
        posTime:time,
        orient:Kata._helperLocationInterpolateQuaternion(location.orient,location.rotvel,location.rotaxis,location.orientTime,
                                                     prevLocation.orient,prevLocation.rotvel,prevLocation.rotaxis,prevLocation.orientTime,
                                                     time),
        orientTime:time,
        rotvel:location.rotvel,
        rotaxis:location.rotaxis,
        vel:location.vel
    };
};


/**
 * interpolates between 2 locations where 3 times are passed in and used to separately interpolate each field
 * @param {!Location} location the newest location update
 * @param {!Location} prevLoaction the second newest location update
 * @param {Date} posTime the time to extrapolate to for positions
 * @param {Date} orientTime the time to extrapolate to for orientations
 * @param {Date} scaleTime the time to extrapolate to for scale
 * @returns {!Location} an param-by-param interpolation of the locations if the time is between the two times for that property, otherwise an extrapolation of the newest location update to the future
 */
Kata.LocationTriTimeInterpolate=function(location,prevLocation,posTime,orientTime,scaleTime) {
    return {
        scale:Kata._helperLocationInterpolateNoVel4vec(location.scale,location.scaleTime,
                                              prevLocation.scale,prevLocation.scaleTime,
                                              scaleTime),
        scaleTime:scaleTime,
        pos:Kata._helperLocationInterpolate3vec(location.pos,location.vel,location.posTime,
                                            prevLocation.pos,prevLocation.vel,prevLocation.posTime,posTime),
        posTime:posTime,
        orient:Kata._helperLocationInterpolateQuaternion(location.orient,location.rotvel,location.rotaxis,location.orientTime,
                                                     prevLocation.orient,prevLocation.rotvel,prevLocation.rotaxis,prevLocation.orientTime,
                                                     orientTime),
        orientTime:orientTime,
        rotvel:location.rotvel,
        rotaxis:location.rotaxis,
        vel:location.vel
    };
};


/**
 * Extrapolates a location to a future time so that it may be interpolated
 * @param {!Location} location the latest location sample
 * @param {Date} time the current time for which to extrapolate over
 * @returns {!Location} a Location class that has the current time set to time but the same velocity and rotation
 */
Kata.LocationExtrapolate=function(location,time) {
    return {
        scale:location.scale,
        scaleTime:time,
        pos:Kata._helperLocationExtrapolate3vec(location.pos,location.vel,Kata.deltaTime(time,location.posTime)),
        posTime:time,
        orient:Kata.extrapolateQuaternion(location.orient,location.rotvel,location.rotaxis,Kata.deltaTime(time,location.orientTime)),
        orientTime:time,
        rotvel:location.rotvel,
        rotaxis:location.rotaxis,
        vel:location.vel
    };
};
Kata.LocationCopy = function(destination, source) {
    if (source.scale!==undefined){
        destination.scaleTime=source.scaleTime!==undefined?source.scaleTime:source.time;
        destination.scale=source.scale.slice(0);
    }
    if (source.pos!==undefined){
        destination.posTime=source.posTime!==undefined?source.posTime:source.time;
        destination.pos=source.pos.slice(0);
    }
    if (destination.orient!==undefined) {            
        destination.orientTime=source.orientTime!==undefined?source.orientTime:source.time;
        destination.orient=source.orient.slice(0);
    }
    if (source.rotvel!==undefined && source.rotaxis!==undefined) {
        destination.rotvel=source.rotvel;
        destination.rotaxis=source.rotaxis.slice(0);
    }
    if (source.vel!==undefined){
        destination.vel=source.vel.slice(0);
    }        
};

Kata.LocationCopyUnifyTime= function(msg, destination) {
    if (msg.time!==undefined) {
        destination.time=msg.time;
        if (msg.scale!==undefined){
            destination.scale=msg.scale.slice();
        }
        if (msg.pos!==undefined){
                destination.pos=msg.pos.slice();
        }
        if (msg.orient!==undefined) {            
            destination.orient=msg.orient.slice();
        }
        if (msg.rotvel!==undefined && msg.rotaxis!==undefined) {
            destination.rotvel=msg.rotvel;
            destination.rotaxis=msg.rotaxis.slice();
        }
        if (msg.vel!==undefined){
            destination.vel=msg.vel.slice();
        }        
    }else{
        var t=msg.scaleTime;
        if (t===undefined||msg.posTime>=t)
            t=msg.posTime;
        if (t===undefined||msg.orientTime>=t)
            t=msg.orientTime;
        if (msg.scale!==undefined){
            destination.scale=msg.scale.slice(0);
        }
        if (msg.pos!==undefined){
            if (msg.vel&&msg.posTime) {
                destination.pos=Kata._helperLocationExtrapolate3vec(msg.pos,
                                                                    msg.vel,
                                                                    Kata.deltaTime(t,
                                                                              msg.posTime));                
            }else {
                destination.pos=msg.pos.slice();
            }
        }
        if (msg.orient!==undefined){
            if (msg.rotvel !== undefined && msg.rotaxis !== undefined && msg.orientTime !== undefined) {
                destination.orient
                    =Kata.extrapolateQuaternion(msg.orient,
                                                               msg.rotvel,
                                                               msg.rotaxis,
                                                               Kata.deltaTime(t,
                                                                         msg.orientTime));
            }else {
                destination.orient=msg.orient.slice();
            }
        }
        if (msg.rotvel !== undefined && msg.rotaxis !== undefined) {
            destination.rotvel=msg.rotvel;
            destination.rotaxis=msg.rotaxis.slice();
        }
        if (msg.vel!==undefined){
            destination.vel=msg.vel.slice();
        }
        destination.time=t;
    }
};

/**
 * returns a new location that has the default properties where the msg does not specify the values
 * and uses the messages values where they are specified
 * @param msg the network message being received
 * @returns {!Location} a Location class with curLocation augmented with the msg fields that exist
 */ 
Kata.LocationSet=function(msg) {
    if (msg.time==undefined)
        msg.time=new Date();
    if (msg.scale==undefined)
        msg.scale=[0,0,0,1];
    if (msg.vel==undefined)
        msg.vel=[0,0,0];
    if (msg.rotaxis==undefined)
        msg.rotaxis=[0,0,1];
    if (msg.rotvel==undefined)
        msg.rotvel=0;
    if (msg.orient==undefined)
        msg.orient=[0,0,0,1];
    return {
      scale:msg.scale,
      scaleTime:msg.time,
      pos:msg.pos,  
      posTime:msg.time,
      orient:msg.orient,  
      orientTime:msg.time,
      vel:msg.vel,
      rotaxis:msg.rotaxis,
      rotvel:msg.rotvel

    };
};
/**
 * Takes a current and prev location samples and 
 * returns a new location that has the previous location properties where the msg does not specify the values
 * and uses the messages values where they are specified
 * then the currentLocation is updated with prevLocations values if the would otherwise be the same as curLocation
 * also checks to make sure the time is not OLDER than the last update. If the time is the same assume that it 
 * is newer within the accuracy of the javascript timer. 
 * 
 * @param msg the network message being received
 * @param {!Location} curLocation the currently known latest update (modified with prevLocation items that have not changed in new update)
 * @param {!Location} prevLocation the update before the current update
 * @returns {!Location} a Location class with curLocation augmented with the msg fields that exist
 */ 
Kata.LocationUpdate=function(msg,curLocation,prevLocation, curDate) {
    if (!prevLocation)
        prevLocation=curLocation;
    var retval={
      scale:curLocation.scale,
      scaleTime:curLocation.scaleTime,
      pos:curLocation.pos,  
      posTime:curLocation.posTime,
      orient:curLocation.orient,  
      orientTime:curLocation.orientTime,
      vel:curLocation.vel,
      rotaxis:curLocation.rotaxis,
      rotvel:curLocation.rotvel
    };
    if (msg.pos && msg.time && msg.time >= curLocation.posTime) {
        retval.pos=msg.pos;
        retval.posTime=msg.time;
        //Kata.warn("ACCEPTING UPDATE "+JSON.stringify(msg));
    }else {
        //curLocation.pos=prevLocation.pos;
        //curLocation.posTime=prevLocation.posTime;
        if (msg.vel && msg.time && msg.time >= curLocation.posTime) {
            //curLocation.pos=Kata._helperLocationExtrapolate3vec(curLocation.pos,curLocation.vel,Kata.deltaTime(curDate,curLocation.posTime));
            //curLocation.posTime=curDate;

            retval.pos=Kata._helperLocationExtrapolate3vec(curLocation.pos,curLocation.vel,Kata.deltaTime(msg.time,curLocation.posTime));
            retval.posTime=msg.time;
        }else if (msg.pos && msg.time) {
            //Kata.error("DROPPING UPDATE "+JSON.stringify(msg)+ " because "+msg.time+" is not greater than "+curLocation.posTime.getTime());
        }
    }
    if (msg.vel && msg.time && msg.time >= curLocation.posTime) {
        retval.vel=msg.vel;
        //console.log("Setting velocity to "+retval.vel+" was "+curLocation.vel+" and before "+prevLocation.vel+" Pos "+retval.pos+" was "+curLocation.pos+" and before "+prevLocation.pos);
    }else {
        //console.log("Setting position to "+retval.vel+" was "+curLocation.vel+" and before "+prevLocation.vel+" Pos "+retval.pos+" was "+curLocation.pos+" and before "+prevLocation.pos);
        curLocation.vel=prevLocation.vel;
    }
    if (msg.orient && msg.time && msg.time >= curLocation.orientTime) {
        retval.orient=msg.orient;
        retval.orientTime=msg.time;
    }else {
        //curLocation.orient=prevLocation.orient;
        //curLocation.orientTime=prevLocation.orientTime;
        if (msg.rotvel !== undefined && msg.rotaxis !== undefined) {
            //curLocation.orient=Kata.extrapolateQuaternion(prevLocation.orient,prevLocation.rotvel,prevLocation.rotaxis,Kata.deltaTime(curDate,prevLocation.orientTime));
            //curLocation.orientTime=curDate;

            retval.orient=Kata.extrapolateQuaternion(curLocation.orient,curLocation.rotvel,curLocation.rotaxis,Kata.deltaTime(msg.time,curLocation.orientTime));
            retval.orientTime=msg.time;
        }
    }
    if (msg.rotvel !== undefined && msg.rotaxis !== undefined && msg.time !== undefined && msg.time >= curLocation.orientTime) {
        retval.rotaxis=msg.rotaxis;
        retval.rotvel=msg.rotvel;
    }else {
        retval.rotaxis=curLocation.rotaxis;
        retval.rotvel=curLocation.rotvel;
    }
    if (msg.scale && msg.time && msg.time >= curLocation.scaleTime) {
        retval.scale=msg.scale;
        retval.scaleTime=msg.time;
    }else {
        retval.scale=curLocation.scale;
        retval.scaleTime=curLocation.scaleTime;
    }
    return retval;
};


/**
 * Takes a current location and updates it with all fields and timestamps that have changed
 * @param msg the network message being received
 * @param {!Location} curLocation the currently known latest update (modified with prevLocation items that have not changed in new update)
 */ 
Kata.LocationReset=function(msg,curLocation) {
    if (msg.scale!==undefined) {
        curLocation.scale=msg.scale;
        curLocation.scaleTime=msg.time;
    }
    if (msg.pos!==undefined) {
        curLocation.pos=msg.pos;
        curLocation.posTime=msg.time;
    }
    if (msg.vel!==undefined) {
        curLocation.vel=msg.vel;
    }
    if (msg.rotvel!==undefined && msg.rotaxis !==undefined) {
        curLocation.rotaxis=msg.rotaxis;
    }
    if (msg.orient!==undefined) {
        curLocation.orient=msg.orient;
        curLocation.orientTime=msg.time;
    }
};


/**
 * Multiplies two quaternions.
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The quaternion product a * b.
 */
Kata.QuaternionMulQuaternion=function(a, b) {
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
Kata.QuaternionToRotation=function (q) {
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
Kata.Vec3Cross=function(a,b) {
    return [a[1]*b[2]-a[2]*b[1],
            a[2]*b[0]-a[0]*b[2],
            a[0]*b[1]-a[1]*b[0]];
};
Kata.Vec3Add=function(a,b) {
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
};
Kata.Vec3Sub=function(a,b) {
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
};
Kata.Vec3Scale=function(a,b) {
    return [a[0]*b,a[1]*b,a[2]*b];
};
Kata.Vec3Rotate=function(a,v0,v1,v2) {
    return [a[0]*v0[0]+a[1]*v1[0]+a[2]*v2[0],
            a[0]*v0[1]+a[1]*v1[1]+a[2]*v2[1],
            a[0]*v0[2]+a[1]*v1[2]+a[2]*v2[2]];
};
/**
 * LocationCompose takes in a location and a prev and cur position for a parent node
 * and turns it into a single location that represents the current transformation at 
 * the time snapshots listed in loc
 * @param {!Location} loc the location to be combined with its parents
 * @param {!Location} prevParentLoc the parent's previous location
 * @param {!Location} curParentLoc the parent's current location
 * @returns{!Location} loc, combined with the appropriate interpolation of cur and prevParentLoc
 */
Kata.LocationCompose=function(loc, prevParentLoc, curParentLoc) {
    var parentLoc=Kata.LocationTriTimeInterpolate(curParentLoc,prevParentLoc,loc.posTime,loc.orientTime,loc.scaleTime);
    var rotation=Kata.QuaternionToRotation(parentLoc.orient);
    //First lets get velocity right--we're acting like a lever with a vector of loc.pos
    var topLevelVelocity=Kata.Vec3Add(Kata.Vec3Add(Kata.Vec3Scale(Kata.Vec3Cross(parentLoc.rotaxis,
                                                             Kata.Vec3Add(Kata.Vec3Scale(loc.pos,parentLoc.scale[3]),parentLoc.scale)),
                                                   parentLoc.rotvel),
                                         parentLoc.vel),
                                 Kata.Vec3Rotate(loc.vel,rotation[0],rotation[1],rotation[2]));
    var topLevelAxis=Kata.Vec3Rotate(loc.rotaxis,rotation[0],rotation[1],rotation[2]);
    var topLevelPos=Kata.Vec3Add(Vec3Rotate(loc.pos,rotation[0],rotation[1],rotation[2]),
                            parentLoc.pos);
    
    var topLevelOrient=Kata.QuaternionMulQuaternion(parentLoc.orient,loc.orient);
    var topLevelScale=[loc.scale[0],loc.scale[1],loc.scale[2],loc.scale[3]*parentloc.scale[3]];
    return {pos:topLevelPos,
            orient:topLevelOrient,
            scale:topLevelScale,
            rotaxis:topLevelAxis,
            rotvel:loc.rotvel,
            vel:topLevelVelocity,
            posTime:loc.posTime,
            orientTime:loc.orientTime,
            scaleTime:loc.scaleTime};
};
Kata.QuaternionInverse=function(q) {
  var q0 = q[0];
  var q1 = q[1];
  var q2 = q[2];
  var q3 = q[3];

  var d = 1 / (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
  return [-q0 * d, -q1 * d, -q2 * d, q3 * d];
};

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
Kata.LocationInverseCompose=function(loc, prevParentLoc, curParentLoc) {
    var parentLoc=Kata.LocationTriTimeInterpolate(curParentLoc,prevParentLoc,loc.posTime,loc.orientTime,loc.scaleTime);
    var inverseRotation=Kata.QuaternionInverse(parentLoc.orient);
    var rotation=Kata.QuaternionToRotation(inverseRotation);
    //First lets get velocity right--we're acting like a lever with a vector of loc.pos
    var innerVelocity=Kata.Vec3Rotate(Kata.Vec3Add(Kata.Vec3Sub(Kata.Vec3Scale(Kata.Vec3Cross(parentLoc.rotaxis,
                                                                     loc.pos),
                                                           -parentLoc.rotvel),
                                                 parentLoc.vel),
                                         loc.vel),rotation[0],rotation[1],rotation[2]);
    var innerAxis=Kata.Vec3Rotate(loc.rotaxis,rotation[0],rotation[1],rotation[2]);
    var innerPos=Kata.Vec3Rotate(Kata.Vec3Sub(loc.pos,parentLoc.pos),rotation[0],rotation[1],rotation[2]);
    //now adjust by offset and scale
    innerVelocity=Kata.Vec3Scale(innerVelocity,parentLoc.scale[3]);
    innerPos=Kata.Vec3Scale(Kata.Vec3Sub(innerPos,parentLoc.scale),1./parentLoc.scale[3]);
    
    var innerOrient=Kata.QuaternionMulQuaternion(loc.orient,inverseRotation);
    var innerScale=Kata.Vec4Scale(loc.scale,1./parentLoc.scale[3]);
    return {pos:innerPos,
            orient:innerOrient,
            scale:innerScale,
            rotaxis:innerAxis,
            rotvel:loc.rotvel,
            vel:innerVelocity,
            posTime:loc.posTime,
            orientTime:loc.orientTime,
            scaleTime:loc.scaleTime};
};
/**
 * takes the loc that is based off of the oldNode and places it as a child of newNode
 * @param {!Location} loc the location of the object relative to oldNode
 * @param {Array} oldNodes the previous array of pairs of [prev,cur] Location classes that represent the object with lowest element being farthest from the root of the heirarchy of transforms
 * @param {Array} newNodes the current array of pairs of [prev,cur] Location classes that represent the object with the first element being farthest from the root of the heirarchy of transforms
 * @returns {!Location} a Location class that has been composed with oldNode and then the inverse of newNode
 */ 
Kata.LocationReparent=function(loc,oldNode,newNode){
    var i;
    var oldNodeLength=oldNode.length;
    for (i=0;i<oldNodeLength;i++) {
        loc =Kata.LocationCompose(loc,oldNode[i][0],oldNode[i][1]);
    }
    for (i=newNode.length-1;i>=0;i--) {
        loc =Kata.LocationInverseCompose(loc,newNode[i][0],newNode[i][1]);
    }
    return loc;
};

}, 'katajs/core/Location.js');
