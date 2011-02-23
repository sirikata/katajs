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
    'externals/protojs/protobuf.js',
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

         this.mScaleSeqNo = undefined;
         this.mPosSeqNo = undefined;
         this.mOrientSeqNo = undefined;

         this.mLocation = location;

         if (vis) {
             this.rMesh = vis.mesh;
             this.rAnim = vis.anim;
             this.rUpAxis = vis.up_axis;
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

     /** Another name to for id(), to be compatible with PresenceID.
      */
     Kata.RemotePresence.prototype.object = function() {
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

    Kata.RemotePresence.prototype.sstEndpoint = function(port) {
        return new Kata.SST.EndPoint(this.object(), port);
    };

    /** Get the owning Presence for this RemotePresence. */
    Kata.RemotePresence.prototype.owner = function() {
        return this.mParent;
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
         if (time===undefined)
             console.log("inaccurate read of position");
         var now_loc = Kata.LocationExtrapolate(this.mLocation, time);
         return now_loc.pos.concat();
     };
     /** Get the current estimate of this object's velocity. */
     Kata.RemotePresence.prototype.velocity = function() {
         return this.mLocation.vel.concat();
     };
     /** Get the current estimate of this object's orientation. */
     Kata.RemotePresence.prototype.orientation = function(time) {
         if (time===undefined)
             console.log("inaccurate read of orientation");
         var now_loc = Kata.LocationExtrapolate(this.mLocation, time);
         return now_loc.orient.concat();
     };
     /** Get the current estimate of this object's angular speed. */
     Kata.RemotePresence.prototype.angularSpeed = function() {
         return this.mLocation.rotvel;
     };
     /** Get the current estimate of this object's rotational axis. */
     Kata.RemotePresence.prototype.rotationalAxis = function() {
         return this.mLocation.rotaxis.concat();
     };
     /** Get the current estimate of this object's rotational velocity. */
     Kata.RemotePresence.prototype.rotationalVelocity = function() {
         return Kata.Quaternion.fromLocationAngularVelocity(this.mLocation);
     };
     /** Get the current estimate of this object's scale. */
     Kata.RemotePresence.prototype.scale = function() {
         return this.mLocation.scale.concat();
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

    // Predicted location information
    Kata.RemotePresence.prototype.predictedPosition = function(time) {
        return this.position(time);
    };
    Kata.RemotePresence.prototype.predictedVelocity = function() {
        return this.velocity();
    };
    Kata.RemotePresence.prototype.predictedOrientation = function(time) {
        return this.orientation(time);
    };
    Kata.RemotePresence.prototype.predictedAngularSpeed = function() {
        return this.angularSpeed();
    };
    Kata.RemotePresence.prototype.predictedRotationalAxis = function() {
        return this.rotationalAxis();
    };
    Kata.RemotePresence.prototype.predictedRotationalVelocity = function() {
        return this.rotationalVelocity();
    };

    Kata.RemotePresence.prototype.predictedScale = function() {
        return this.scale();
    };
    /** Gets the current best estimate of this object's positon. This
     * may include updates applied locally but not verified from the
     * server yet.
     */
    Kata.RemotePresence.prototype.predictedLocation = function() {
        // For RemotePresences we currently don't apply any prediction.
        return this.location();
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
         if (loc) {
             if (loc.seqno) {
                 // FIXME: These are PROTO.INT64 objects which have no operator<
                 // Currently it always gets in the first branch of these if statements.
                 if (this.mScaleSeqNo==undefined
                     || loc.seqno==undefined
                     || !PROTO.I64.prototype.unsigned_less.call(this.mScaleSeqNo,
                                                          loc.seqno)) {

                     if (loc.seqno != undefined)
                         this.mScaleSeqNo = loc.seqno;
                 }else {
                     delete loc.scale;
                 }
                 if (this.mPosSeqNo==undefined
                     || loc.seqno==undefined
                     || !PROTO.I64.prototype.unsigned_less.call(this.mPosSeqNo,
                                                          loc.seqno)) {

                     if (loc.seqno != undefined)
                         this.mPosSeqNo = loc.seqno;
                 }else {
                     delete loc.pos;
                     delete loc.vel;
                 }
                 if (this.mOrientSeqNo==undefined
                     || loc.seqno==undefined
                     || !PROTO.I64.prototype.unsigned_less.call(this.mOrientSeqNo,
                                                          loc.seqno)) {

                     if (loc.seqno != undefined)
                         this.mOrientSeqNo = loc.seqno;
                 }else {
                     delete loc.orient;
                     delete loc.rotvel;
                     delete loc.rotaxis;
                 }
             }
             this.mLocation = Kata.LocationUpdate(loc,this.mLocation,undefined,Kata.now(this.mSpace));
         }

         if (visual) {
             this.mVisual = visual;
         }
     };
}, 'katajs/oh/RemotePresence.js');
