/*  KataJS
 *  Loc.js
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

Kata.require([
], function() {

     if (typeof(Kata.Loopback) == "undefined") { Kata.Loopback = {}; }

     Kata.Loopback.Loc = function() {
         this.mObjects = {};
         this.mListeners = [];
     };

     // Listeners should be callable as listener(uuid, loc), where some may be undefined
     Kata.Loopback.Loc.prototype.addListener = function(listener) {
         this.mListeners.append(listener);
     };

     Kata.Loopback.Loc.prototype._notify = function() {
         for(listener in this.mListeners) {
             listener.apply(undefined, arguments);
         }
     };

     Kata.Loopback.Loc.prototype.add = function(uuid, loc, visual) {
         if (this.mObjects[uuid])
             Kata.warn("Loopback.Loc trying to add an existing object." + uuid);

         this.mObjects[uuid] = {
             loc : loc,
             visual : visual
         };
     };

     Kata.Loopback.Loc.prototype._checkExists = function(uuid) {
         if (!this.mObjects[uuid])
             return false;
         return true;
     };

     Kata.Loopback.Loc.prototype.remove = function(uuid) {
         if (!this._checkExists(uuid)) {
             Kata.warn("Loopback.Loc trying to remove unknown object." + uuid);
             return;
         }
         delete this.mObjects[uuid];
     };

     Kata.Loopback.Loc.prototype.update = function(uuid, loc, visual) {
         if (!this._checkExists(uuid)) {
             Kata.warn("Trying to update location for non-existant object: " + uuid);
             return;
         }
         if(loc)
             Kata.LocationReset(loc,this.mObjects[uuid].loc);
         if (visual) 
             this.mObjects[uuid].visual = visual;
         this._notify(uuid, loc, visual);
     };

     Kata.Loopback.Loc.prototype.updatePosition = function(uuid, pos, time) {
         this.update(uuid, {pos:pos,time:time});
     };

     Kata.Loopback.Loc.prototype.updateVelocity = function(uuid, vel) {
         this.update(uuid, {vel:vel});
     };

     Kata.Loopback.Loc.prototype.updateOrientation = function(uuid, orient, time) {
         this.update(uuid, {orient:orient,time:time});
     };

     Kata.Loopback.Loc.prototype.updateAngularVelocity = function(uuid, angvel, angaxis) {
         this.update(uuid, {angvel:angvel,angaxis:angaxis});
     };

     Kata.Loopback.Loc.prototype.updateBounds = function(uuid, scale, time) {
         this.update(uuid, {scale:scale,time:time});
     };

     Kata.Loopback.Loc.prototype.updateVisual = function(uuid, visual) {
         this.update(uuid, {}, visual);
     };

     Kata.Loopback.Loc.prototype.lookup = function(uuid) {
         return this.mObjects[uuid];
     };
}, 'katajs/space/loop/Loc.js');
