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

Kata.include("katajs/oh/RemotePresence.js");

Kata.defer(function() {

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
     Kata.Presence = function (script, space, id, pos, vel, acc, bounds, vis) {
         // Note the second parameter is the RemotePresence's parent,
         // which in this special case is just the Presence itself
         SUPER.constructor.call(this, this, space, id, pos, vel, acc, bounds, vis);

         this.mScript = script;

         this.mQuery = null;
         this.mQueryHander = null;
     };
     Kata.extend(Kata.Presence, SUPER);

     /** Short hand for sending a message to the owning HostedObject.
      *  Note that the channel this is sent via is shared by all
      *  Presences and the Script itself.
      */
     Kata.Presence.prototype._sendHostedObjectMessage = function (data) {
         return this.mScript._sendHostedObjectMessage(data);
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

     Kata.Presence.prototype.setPosition = function(val) {
         this._setLocation(val, undefined, undefined, undefined, undefined);
     };
     Kata.Presence.prototype.setVelocity = function(val) {
         this._setLocation(undefined, val, undefined, undefined, undefined);
     };
     Kata.Presence.prototype.setAcceleration = function(val) {
         this._setLocation(undefined, undefined, val, undefined, undefined);
     };
     Kata.Presence.prototype.setBounds = function(val) {
         this._setLocation(undefined, undefined, undefined, val, undefined);
     };
     Kata.Presence.prototype.setVisual = function(val) {
         this._setLocation(undefined, undefined, undefined, undefined, val);
     };

     Kata.Presence.prototype._setLocation = function(pos, vel, acc, bounds, vis) {
         this._sendHostedObjectMessage(
             new Kata.ScriptProtocol.FromScript.Location(this.mSpace, this.mID, pos, vel, acc, bounds, vis)
         );
     };

     /** Notify the presence of an event on a remote presence, either
      * added or removed from a result set.  The Presence remains
      * valid (since the user might still want to communicate with the
      * object), but will not be kept alive by the system any longer.
      */
     Kata.Presence.prototype.remotePresence = function(remote, added) {
         if (this.mQueryHandler)
             this.mQueryHandler(remote, added);
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
         Kata.notImplemented();
     };

     Kata.Presence.prototype.ODP = {};
     /** Bind an ODP port for this presence.  The full identifier for
      * the port will be (PID,port), where PID is the PresenceID of
      * this Presence (which uniquely identifies the space and
      * object).
      * @param port the port to attempt to bind.
      * @returns {Kata.ODP.Port} an ODP port that can be used to send
      * ODP messages, or null on failure to bind
      */
     Kata.Presence.prototype.ODP.bind = function(port) {
         Kata.notImplemeneted();
         return null;
     };
     /** Bind a default ODP listener.  This can be used to catch any
      * ODP messages which are not explicitly being listened for.
      * @param cb callback to invoke when no other handler for an ODP
      * handler can be found.
      */
     Kata.Presence.prototype.ODP.setDefaultHandler = function(cb) {
         Kata.notImplemented();
     };


     // Space -> Presence

     /** Parses and handles events originating from the Space (via the
      * ObjectHost, then via the Script). This function mostly
      * parses/pattern matches, and dispatches to other functions to
      * do the real work.
      * @param data the .
      */
     Kata.Presence.prototype.handleSpaceEvent = function(data) {
         Kata.notImplemented();
     };

     /** Handle a disconnection event.
      */
     Kata.Presence.prototype._handleDisconnect = function(data) {
         Kata.notImplemented();
     };

     /** Handle a location update event received from the space.  This
      * may be an update to our own location or to other objects.
      * Note that location encompasses position, velocity, possibly
      * acceleration, and bounding region.
      */
     Kata.Presence.prototype._handleLocEvent = function(data) {
         Kata.notImplemented();
     };

     /** Handle an update to the visual representation of objects
      * (both this object and others).
      */
     Kata.Presence.prototype._handleVisualEvent = function(data) {
         Kata.notImplemented();
     };

     /** Handle an update to result set of the current interest query. */
     Kata.Presence.prototype._handleQueryEvent = function(data) {
         Kata.notImplemented();
     };

     /** Handle an received ODP message. */
     Kata.Presence.prototype._handleODPEvent = function(data) {
         Kata.notImplemented();
     };     
});
