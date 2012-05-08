/*  Kata Javascript Utilities
 *  Quaternion.js
 *
 *  Copyright (c) 2010, Ewen Cheslack-Postava
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


Kata.require([
], function() {
    Kata.Quaternion = function() {
        this.length = 4;
        if (arguments.length == 0) {
            this[0] = 0.0;
            this[1] = 0.0;
            this[2] = 0.0;
            this[3] = 1.0;
        }
        else if (arguments.length == 1) {
            this[0] = arguments[0][0];
            this[1] = arguments[0][1];
            this[2] = arguments[0][2];
            this[3] = arguments[0][3];
        }
        else if (arguments.length == 4) {
            this[0] = arguments[0];
            this[1] = arguments[1];
            this[2] = arguments[2];
            this[3] = arguments[3];
        }
        else {
            throw "Invalid Quaternion constructor arguments.";
        }
    };
    // FIXME this doesn't work...
    var SUPER = Array.prototype;
    Kata.extend(Kata.Quaternion, SUPER);

    Kata.Quaternion.fromAxisAngle = function(axis, angle) {
        var sinHalfAngle = Math.sin(angle*0.5);
        return new Kata.Quaternion(
            sinHalfAngle*axis[0],
            sinHalfAngle*axis[1],
            sinHalfAngle*axis[2],
            Math.cos(angle*0.5)
        );
    };

    Kata.Quaternion.fromLocationAngularVelocity=function(loc) {
        return Kata.Quaternion.fromAxisAngle(loc.rotaxis, loc.rotvel);
    };

    Kata.Quaternion.identity = function() {
        return new Kata.Quaternion();
    };

    Kata.Quaternion.zero = function() {
        return new Kata.Quaternion(0, 0, 0, 0);
    };

    Kata.Quaternion.prototype.array = function() {
        return [ this[0], this[1], this[2], this[3] ];
    };

    Kata.Quaternion.prototype.toAngleAxis = function() {
        var fSqrLength = this[0]*this[0] + this[1]*this[1] + this[2]*this[2];
        var tmpw=this[3];
        var eps = 1e-06;
        if (tmpw > 1.0 && tmpw < 1.0+eps)
            tmpw = 1.0;
        if (tmpw < -1.0 && tmpw > -1.0-eps)
            tmpw = -1.0;
        if (fSqrLength > 1e-08 && tmpw <= 1 && tmpw >= -1)
        {
            var returnAngleRadians = 2.0 * Math.acos(tmpw);
            var len = Math.sqrt(fSqrLength);
            var returnAxis = [ this[0]/len, this[1]/len, this[2]/len ];
            return { angle: returnAngleRadians, axis: returnAxis };
        }
        else
        {
            var returnAngleRadians = 0.0;
            var returnAxis = [1.0, 0.0, 0.0];
            return { angle: returnAngleRadians, axis: returnAxis };
        }
    };

    Kata.Quaternion.prototype.dot = function(other) {
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2] + this[3]*other[3];
    };

    Kata.Quaternion.prototype.sizeSquared = function() {
        return this.dot(this);
    };

    Kata.Quaternion.prototype.size = function() {
        return Math.sqrt(this.sizeSquared);
    };

    Kata.Quaternion.prototype.normal = function() {
        var len = this.size();
        if (len > 1e-08)
            return this.scale(1.0/len);
        return new Kata.Quaternion(this);
    };

    Kata.Quaternion.prototype.scale = function(s) {
        if (typeof(s) == "number")
            return new Kata.Quaternion( this[0]*s, this[1]*s, this[2]*s, this[3]*s );
        else
            throw "Don't know how to multiply Quaternion by given object.";
    };

    Kata.Quaternion.prototype.add = function(s) {
        if (typeof(s) == "number")
            return new Kata.Quaternion( this[0]+s, this[1]+s, this[2]+s, this[3]+s );
        else if (s && typeof(s.length) !== "undefined" && s.length == 4)
            return new Kata.Quaternion( this[0]+s[0], this[1]+s[1], this[2]+s[2], this[3]+s[3] );
        else
            throw "Don't know how to multiply Quaternion by given object.";
    };

    Kata.Quaternion.prototype.negate = function() {
        return new Kata.Quaternion(-this[0], -this[1], -this[2], -this[3]);
    };

    Kata.Quaternion._vec3_cross = function(a, b) {
        return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0] ];
    };

    Kata.Quaternion.prototype.multiply = function(other) {
        if (other.prototype === Kata.Quaternion) {
            return new Kata.Quaternion(
                this[3]*other[0] + this[0]*other[3] + this[1]*other[2] - this[2]*other[1],
                this[3]*other[1] + this[1]*other[3] + this[2]*other[0] - this[0]*other[2],
                this[3]*other[2] + this[2]*other[3] + this[0]*other[1] - this[1]*other[0],
                this[3]*other[3] - this[0]*other[0] - this[1]*other[1] - this[2]*other[2]
            );
        }
        else if (typeof(other.length) !== "undefined" && other.length === 3) {
            var quat_axis = [ this[0], this[1], this[2] ];
            var uv = Kata.Quaternion._vec3_cross(quat_axis, other);
            var uuv = Kata.Quaternion._vec3_cross(quat_axis, uv);
            uv = [uv[0]*2.0*this[3], uv[1]*2.0*this[3], uv[2]*2.0*this[3]];
            uuv = [uuv[0] * 2.0, uuv[1] * 2.0, uuv[2] * 2.0];
            return [other[0] + uv[0] + uuv[0],
                    other[1] + uv[1] + uuv[1],
                    other[2] + uv[2] + uuv[2]];
        }
        else
            throw "Don't know how to multiply given type by quaternion.";
    };

    Kata.Quaternion.prototype.inverse = function() {
        var q0 = this[0], q1 = this[1], q2 = this[2], q3 = this[3],
        dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
        invDot = dot ? 1.0/dot : 0;
        
        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
        return new Kata.Quaternion(q0*invDot,-q1*invDot,-q2*invDot,q3*invDot);
    };

    /** Raise the quaternion to a power (i.e. apply the rotation n times).
     *  \param n the exponent
     */
    Kata.Quaternion.prototype.exp = function(s) {
        // FIXME there's probably a much more efficient way to do this
        var angle_axis = this.toAngleAxis();
        return Kata.Quaternion.fromAxisAngle(angle_axis.axis, angle_axis.angle*s);
    };


}, 'katajs/core/Quaternion.js');
