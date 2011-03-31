/*  Kata Javascript Network Layer
 *  Presence.js
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
    'katajs/oh/RemotePresence.js',
    'katajs/oh/sst/SSTImpl.js'
], function() {

     var SUPER=Kata.RemotePresence.prototype;
     /** Presences live in the same thread as the script and maintain
      * the most up-to-date knowledge about the space. It maintains
      * the object's best information both about itself (and handles
      * resolving inconsistencies when requests to the space are not
      * successful), and about others via ProxyObjects.
      *
      * Communication will look as follows:
      *
      *     ObjectHost
      *        ^  v
      *    HostedObject
      *  ------^--v-------  (thread boundary)
      *      Presence
      *        ^  v
      *       Script
      *
      * A large part of Presence's job is handling (de)serialization
      * to get information across the thread boundary, and it gets a
      * lot of help from the Kata.ScriptEvent functions for creating
      * messages that can cross that boundary.  Note, however, that
      * Presence isn't simply a dumb wrapper. For example, Presence
      * also maintains the current unique allocation of ODP ports --
      * the ObjectHost doesn't care about the unique allocation and it
      * is more convenient to allow synchronous allocation via the
      * Presence which lives in the same thread as the Script itself.
      *
      * Much of the "read" part of the API is in the RemotePresence
      * superclass; Presence has a strict superset of the
      * RemotePresence functionality.
      *
      * Note: This constructor should only be invoked by the script
      * itself in response to a NewPresence message.  This should be
      * handled automatically by the base script class.
      *
      * @constructor
      * @param {Kata.Script} script Script for the object this presence is
      * for
      * @param {Kata.SpaceID} space Space for this presence
      * @param {Kata.PresenceID} id Unique identifier of this object in
      * the space.
      */
     Kata.Presence = function (script, space, id, location, vis) {
         // Note the second parameter is the RemotePresence's parent,
         // which in this special case is just the Presence itself
         SUPER.constructor.call(this, this, space, id, location, vis);

         this.mScript = script;

         this.mQuery = null;
         this.mQueryHander = null;

         // Tracks the last requested location so we can avoid sending
         // more requests than necessary.
         this.mRequestedLocation = this.mLocation;

         // Tracks location updates that arrived before their prox
         // update. This can happen since loc subscriptions and prox
         // updates are on different streams.
         this.mOrphanLocUpdates = {};

         // Set up SST
         // FIXME SST requiring a full endpoint here is unnecessary, it only uses the objid for indexing
         var sst_ep = this.sstEndpoint(0);
         var bdl = Kata.SST.getBaseDatagramLayer(sst_ep);
         if (!bdl) {
             // FIXME we're not doing anything with the dispatcher to
             // use it, so this path isn't working. We need to trap
             // received ODP messages and try to dispatch them for SST
             this.ODPRouter = new this.ObjectMessageRouter(this);
             this.ODPDispatcher = new Kata.SST.ObjectMessageDispatcher();
             // And the BaseDatagramLayer...
             this.ODPBaseDatagramLayer = Kata.SST.createBaseDatagramLayer(
                 sst_ep, this.ODPRouter, this.ODPDispatcher
             );
         }
         else {
             this.ODPBaseDatagramLayer = bdl;
         }
     };
     Kata.extend(Kata.Presence, SUPER);

    Kata.Presence.prototype.bindODPPort = function(port) {
        return this.mScript.bindODPPort(this.mSpace, this.mID, port);
    };

    // ObjectMessageRouter for SST support
    Kata.Presence.prototype.ObjectMessageRouter = function(parent) {
        this.mParent = parent;
    };
    Kata.Presence.prototype.ObjectMessageRouter.prototype.route = function(msg) {
        this.mParent._sendPreparedODPMessage(msg);
    };

    Kata.Presence.prototype._sendPreparedODPMessage = function(msg) {
        return this.mScript._sendPreparedODPMessage(this.mSpace, msg);
    };



     /** Short hand for sending a message to the owning HostedObject.
      *  Note that the channel this is sent via is shared by all
      *  Presences and the Script itself.
      */
     Kata.Presence.prototype._sendHostedObjectMessage = function (data) {
         return this.mScript._sendHostedObjectMessage(data);
     };

    /** Request that this presence be disconnected from the
     *  space. This effectively disables this presence, removing it
     *  from other objects views and disabling its ability to send
     *  messages through the space.
     */
    Kata.Presence.prototype.disconnect = function() {
        this.mScript._disconnect(this);
    };

     /** Get the current interest query's value. */
     Kata.Presence.prototype.query = function() {
         return this.mQuery;
     };

     /** Request the interest query parameters be updated. */
     Kata.Presence.prototype.setQuery = function(sa) {
         this.mQuery = sa;
         this._sendHostedObjectMessage(
             new Kata.ScriptProtocol.FromScript.Query(this.mSpace, this.mID, sa)
         );
     };

     /** Set the query handler.  Should support calls of handler(presence, entered). */
     Kata.Presence.prototype.setQueryHandler = function(cb) {
         this.mQueryHandler = cb;
     };


    // Helpers for requested location
    Kata.Presence.prototype._requestedPosition = function(time) {
        var now_loc = Kata.LocationExtrapolate(this.mRequestedLocation, time);
        return now_loc.pos.concat();
    };
    Kata.Presence.prototype._requestedVelocity = function() {
        return this.mRequestedLocation.vel.concat();
    };
    Kata.Presence.prototype._requestedOrientation = function(time) {
        var now_loc = Kata.LocationExtrapolate(this.mRequestedLocation, time);
        return now_loc.orient.concat();
    };
    Kata.Presence.prototype._requestedAngularSpeed = function() {
        return this.mRequestedLocation.rotvel;
    };
    Kata.Presence.prototype._requestedRotationalAxis = function() {
        return this.mRequestedLocation.rotaxis.concat();
    };
    Kata.Presence.prototype._requestedRotationalVelocity = function() {
        return Kata.Quaternion.fromLocationAngularVelocity(this.mRequestedLocation);
    };
    Kata.Presence.prototype._requestedScale = function() {
        return this.mRequestedLocation.scale.concat();
    };
    /** Get the current estimate of this object's position. */
    Kata.Presence.prototype._requestedLocation = function() {
        var retval = {};
        for (var i in this.mRequestedLocation) {
            retval[i] = this.mRequestedLocation[i];
        }
        return retval;
    };


    Kata.Presence.prototype.predictedPosition = function(time) {
        return this._requestedPosition(time);
    };
    Kata.Presence.prototype.predictedVelocity = function() {
        return this._requestedVelocity();
    };
    Kata.Presence.prototype.predictedOrientation = function(time) {
        return this._requestedOrientation(time);
    };
    Kata.Presence.prototype.predictedAngularSpeed = function() {
        return this._requestedAngularSpeed();
    };
    Kata.Presence.prototype.predictedRotationalAxis = function() {
        return this._requestesdRotationalAxis();
    };
    Kata.Presence.prototype.predictedRotationalVelocity = function() {
        return this._requestesdRotationalVelocity();
    };
    Kata.Presence.prototype.predictedScale = function() {
        return this._requestedScale();
    };
    Kata.Presence.prototype.predictedLocation = function() {
        return this._requestedLocation();
    };

     Kata.Presence.prototype.setPosition = function(val){
         var now = Kata.now(this.mSpace);

         // If we've requested an identical value, ignore
         var reqpos = this._requestedPosition(now);
         if (reqpos[0] == val[0] &&
             reqpos[1] == val[1] &&
             reqpos[2] == val[2])
             return;

         var update = {
             pos:val.concat(),
             vel:this._requestedVelocity(),
             time:Kata.now(this.mSpace)
         };
         var msg = new Kata.ScriptProtocol.FromScript.Location(
             this.mSpace, this.mID, update
         );
         this.mRequestedLocation = Kata.LocationUpdate(update, this.mRequestedLocation, null, now);
         this._sendHostedObjectMessage(msg);
     };
     Kata.Presence.prototype.setVelocity = function(val) {
         var now = Kata.now(this.mSpace);

         // If we've requested an identical value, ignore
         var reqvel = this._requestedVelocity();
         if (reqvel[0] == val[0] &&
             reqvel[1] == val[1] &&
             reqvel[2] == val[2])
             return;

         var update = {
             pos:this._requestedPosition(now),
             vel:val.concat(),
             time:now
         };
         var msg = new Kata.ScriptProtocol.FromScript.Location(
             this.mSpace, this.mID, update
         );
         this.mRequestedLocation = Kata.LocationUpdate(update, this.mRequestedLocation, null, now);
         this._sendHostedObjectMessage(msg);
     };
     Kata.Presence.prototype.setOrientation = function(val) {
         var now = Kata.now(this.mSpace);

         var reqpos = this._requestedOrientation(now);
         if (reqpos[0] == val[0] &&
             reqpos[1] == val[1] &&
             reqpos[2] == val[2] &&
             reqpos[3] == val[3])
             return;

         var update = {
             orient:val.concat(),
             rotaxis:this._requestedRotationalAxis(), rotvel:this._requestedAngularSpeed(),
             time:Kata.now(this.mSpace)
         };
         var msg = new Kata.ScriptProtocol.FromScript.Location(
             this.mSpace, this.mID, update
         );
         this.mRequestedLocation = Kata.LocationUpdate(update, this.mRequestedLocation, null, now);
         this._sendHostedObjectMessage(msg);
     };
    /** Set angular velocity of the object using a quaternion. */
    Kata.Presence.prototype.setAngularVelocity = function(ang_vel) {
        if (! "toAngleAxis" in ang_vel) ang_vel = new Kata.Quaternion(ang_vel);
        var aa = ang_vel.toAngleAxis();
        var angvel = aa.angle;
        var axis = aa.axis;

        var now = Kata.now(this.mSpace);

        var reqvel = this._requestedAngularSpeed();
        var reqaxis = this._requestedRotationalAxis();
        if (reqvel == angvel &&
            reqaxis[0] == axis[0] &&
            reqaxis[1] == axis[1] &&
            reqaxis[2] == axis[2])
            return;

        var update = {
            orient:this._requestedOrientation(now),
            rotaxis:axis.concat(), rotvel:angvel,
            time:now
        };
        var msg = new Kata.ScriptProtocol.FromScript.Location(
            this.mSpace, this.mID, update
        );
        this.mRequestedLocation = Kata.LocationUpdate(update, this.mRequestedLocation, null, now);
        this._sendHostedObjectMessage(msg);
    };
     Kata.Presence.prototype.setLocation = function(location) {
         var now = Kata.now(this.mSpace);
         if (location.time===undefined) {
             location.time=Kata.now(this.mSpace);
         }
         var msg = new Kata.ScriptProtocol.FromScript.Location(this.mSpace, this.mID, location);
         this.mRequestedLocation = Kata.LocationUpdate(location, this.mRequestedLocation, null, now);
         this._sendHostedObjectMessage(msg);
     };
     Kata.Presence.prototype.setBounds = function(val) {
         var msg = new Kata.ScriptProtocol.FromScript.Location(this.mSpace, this.mID, {bounds:val.concat(), time:Kata.now(this.mSpace)});
         this._sendHostedObjectMessage(msg);
     };
     Kata.Presence.prototype.setScale = function(val) {
         var time=Kata.now(this.mSpace);
         var update = {
             scale:val.concat(),
             time:time
         };
         var msg = new Kata.ScriptProtocol.FromScript.Location(this.mSpace, this.mID, {scale:val.concat(), time:time});
         this.mRequestedLocation = Kata.LocationUpdate(update, this.mRequestedLocation, null, time);
         this._sendHostedObjectMessage(msg);
     };
     Kata.Presence.prototype.setVisual = function(val) {
         var msg = new Kata.ScriptProtocol.FromScript.Visual(this.mSpace, this.mID, val);
         this._sendHostedObjectMessage(msg);
     };

     /** Notify the presence of an event on a remote presence, either
      * added or removed from a result set.  The Presence remains
      * valid (since the user might still want to communicate with the
      * object), but will not be kept alive by the system any longer.
      */
     Kata.Presence.prototype.remotePresence = function(remote, added) {
         if (this.mQueryHandler)
             this.mQueryHandler(remote, added);

         var presid = remote.presenceID();
         var loc_msgs = this.mOrphanLocUpdates[presid];
         if (added && loc_msgs !== undefined) {
             for(var li = 0; li < loc_msgs.length; li++)
                 remote._updateLoc(loc_msgs[li].loc, loc_msgs[li].visual);
             delete this.mOrphanLocUpdates[presid];
         }
     };

     Kata.Presence.prototype.subscribe = function(observed) {
         this.mParent._sendHostedObjectMessage(
             new Kata.ScriptProtocol.FromScript.Subscription(this.mSpace, this.mID, observed, true)
         );
     };

     Kata.Presence.prototype.unsubscribe = function(observed) {
         this.mParent._sendHostedObjectMessage(
             new Kata.ScriptProtocol.FromScript.Subscription(this.mSpace, this.mID, observed, false)
         );
     };

     // Space Listening Events (public API used by Scripts to register
     // to listen for particular types of events).

     /** Adds a callback to be invoked when the Presence becomes
      * disconnected from the space.
      */
     Kata.Presence.prototype.onDisconnected = function(cb) {
         Kata.notImplemented("Presence.onDisconnected");
     };

     // Space -> Presence

     /** Parses and handles events originating from the Space (via the
      * ObjectHost, then via the Script). This function mostly
      * parses/pattern matches, and dispatches to other functions to
      * do the real work.
      * @param data the .
      */
     Kata.Presence.prototype.handleSpaceEvent = function(data) {
         Kata.notImplemented("Presence.handleSpaceEvent");
     };

     /** Handle a disconnection event.
      */
     Kata.Presence.prototype._handleDisconnect = function(data) {
         Kata.notImplemented("Presence._handleDisconnect");
     };

     /** Handle a location update event received from the space.  This
      * may be an update to our own location or to other objects.
      * Note that location encompasses position, velocity, orientation
      * possibly angular velocity, and bounding region.
      * @returns {Kata.RemotePresence} the remote presence that the loc event was meant for
      */
     Kata.Presence.prototype._handleLocEvent = function(msg, remotePresences) {
         var now = Kata.now(this.mSpace);

         if (this.id() === msg.observed) {
//             Kata.warn("Self loc update: " + this.id());
             this._updateLoc(msg.loc, msg.visual);
             return this;
         }
         else {
             var key = Kata.Script.remotePresenceKey(msg.space,msg.observed);
             var remote = remotePresences[key];
//             Kata.warn("Remote presence loc update: " + key);
             if (remote) {
                 remote._updateLoc(msg.loc, msg.visual);
             }
             else {
                 // Stash changes to pick up with later prox
                 // update. Note that we preserve all updates because
                 // they may contain partial information. We could be
                 // more careful and save memory, but these lists of updates
                 // should never get too large
                 var presid = new Kata.PresenceID(msg.space,msg.observed);
                 if (!this.mOrphanLocUpdates[presid])
                     this.mOrphanLocUpdates[presid] = [];
                 this.mOrphanLocUpdates[presid].push(msg);
                 // Extra long timeout should be safe but not keep too
                 // much data around
                 setTimeout(Kata.bind(this._clearOrphanLocUpdates, this, presid), 60000);
             }

             return remote;
         }
     };

     Kata.Presence.prototype._clearOrphanLocUpdates = function(presid) {
         delete this.mOrphanLocUpdates[presid];
     };

     /** Handle an update to the visual representation of objects
      * (both this object and others).
      */
     Kata.Presence.prototype._handleVisualEvent = function(data) {
         Kata.notImplemented("Presence._handleVisualEvent");
     };

     /** Handle an update to result set of the current interest query. */
     Kata.Presence.prototype._handleQueryEvent = function(data) {
         Kata.notImplemented("Presence._handleQueryEvent");
     };

}, 'katajs/oh/Presence.js');
