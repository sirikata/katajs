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

(function() {

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
     Kata.RemotePresence = function (parent, space, id, pos, vel, acc, bounds, vis) {
         this.mParent = parent; // Parent Presence

         this.mSpace = space;
         this.mID = id;

         this.rPosition = pos;
         this.rVelocity = vel;
         this.rAcceleration = acc;
         this.rBounds = bounds;

         this.mVisual = vis;

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


     /** Method that should only be used by the Script base class to
      * update internal state.  Presence should override this to deal
      * with conflicts between outstanding requests and old loc
      * updates.
      */
     Kata.RemotePresence.prototype._updateLoc = function (pos, vel, acc, bounds, visual) {
         if (pos) this.rPosition = pos;
         if (vel != null) this.rVelocity = vel;
         if (acc) this.rAcceleration = acc;
         if (bounds) this.rBounds = bounds;
         if (visual) this.mVisual = visual;
     };
})();
