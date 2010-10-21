/*  Kata Javascript Network Layer
 *  RemotePresence.js
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
    'katajs/core/Time.js',
    'katajs/oh/odp/Endpoint.js'
], function() {

     /** A RemotePresence represents another object in the world you
      * can interact with.  It will keep a shadow copy of basic
      * information like location and mesh as well as allow you to
      * send messages to the object.
      *
      * @param {Kata.Presence} parent 
      * @param {Kata.URL} space
      * @param {Kata.PresenceID} id
      * @param {Location} location
      * @param bounds <-- unknown representaiton
      * @param {Kata.URL} vis
      * @constructor
      */
     Kata.RemotePresence = function (parent, space, id, location, vis) {
         this.mParent = parent; // Parent Presence

         this.mSpace = space;
         this.mID = id;

         this.mLocation = location;

         if (vis) {
             this.rMesh = vis.mesh;
             this.rAnim = vis.anim;
             this.rUpAxis = vis.up_axis;
             this.rCenter = vis.center;
         }

         // Indicates whether we're tracking this object, i.e. if a subscription was submitted.
         this.mTracking = false;
     };


     /** Get the unique ID associated with this RemotePresence.
      *  @returns {Kata.PresenceID} RemotePresenceID for this RemotePresence (combination of SpaceID and ObjectID)
      */
     Kata.RemotePresence.prototype.id = function() {
         return this.mID;
     };

     /** Get the space this presence resides in.
      *  @returns {Kata.URL} space URL
      */
     Kata.RemotePresence.prototype.space = function() {
         return this.mSpace;
     };

    Kata.RemotePresence.prototype.presenceID = function() {
        return new Kata.PresenceID(this.mSpace, this.mID);
    };
     
    /** Get an ODP endpoint for this object on the specified port. */
    Kata.RemotePresence.prototype.endpoint = function(port) {
        return new Kata.ODP.Endpoint(this.mSpace, this.mID, port);
    };
     
     /** Enable tracking for this RemotePresence, i.e. subscribe it
      * for updates.
      */
     Kata.RemotePresence.prototype.track = function() {
         if (this.mTracking)
             return;

         this.mParent.subscribe(this.mID);
         this.mTracking = true;
     };
     /** Disable tracking for this RemotePresence, i.e. unsubscribe it
      * from updates.
      */
     Kata.RemotePresence.prototype.untrack = function() {
         if (!this.mTracking)
             return;

         this.mParent.unsubscribe(this.mID);
         this.mTracking = false;
     };

     /** Get the current estimate of this object's position. */
     Kata.RemotePresence.prototype.position = function(time) {
         if (time===undefined) console.log("inaccurate read of position");
         return this.mLocation.pos.concat();//FIXME drh do interpolation?
     };
     /** Get the current estimate of this object's velocity. */
     Kata.RemotePresence.prototype.velocity = function() {
         return this.mLocation.vel.concat();//FIXME drh do interpolation?
     };
     /** Get the current estimate of this object's orientation. */
     Kata.RemotePresence.prototype.orientation = function(time) {
         if (time===undefined) console.log("inaccurate read of orientation");
         return this.mLocation.orient.concat();//FIXME drh do interpolation?
     };
     /** Get the current estimate of this object's angular speed. */
     Kata.RemotePresence.prototype.angularSpeed = function() {
         return this.mLocation.angvel.concat();//FIXME drh do interpolation?
     };
     /** Get the current estimate of this object's rotational axis. */
     Kata.RemotePresence.prototype.rotationalAxis = function() {
         return this.mLocation.rotaxis.concat();//FIXME drh do interpolation?
     };
     /** Get the current estimate of this object's position. */
     Kata.RemotePresence.prototype.location = function() {
         var retval={
             };
         for (var i in this.mLocation) {
             retval[i]=this.mLocation[i];
         }
         return retval;
     };
     /** Get the current estimate of this object's bounds. */
     Kata.RemotePresence.prototype.bounds = function() {
         return this.mLocation.scale.concat();//FIXME drh do interpolation?
     };
     /** Get the current estimate of this object's visual representation (e.g. mesh). */
     Kata.RemotePresence.prototype.visual = function() {
         return this.mVisual;
     };

     /** Method that should only be used by the Script base class to
      * update internal state.  Presence should override this to deal
      * with conflicts between outstanding requests and old loc
      * updates.
      */
     Kata.RemotePresence.prototype._updateLoc = function (loc, visual) {
         if (loc)
             this.mLocation = Kata.LocationUpdate(loc,this.mLocation,undefined,Kata.now(this.mSpace));

         if (visual) {
             this.mVisual = visual;
         }
     };
}, 'katajs/oh/RemotePresence.js');
