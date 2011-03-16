/*  KataJS
 *  LoopbackSpaceConnection.js
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


// See note about how connections work. Generally connection classes
// shouldn't include anything from a space implementation (and
// generally can't since the space implementation is not available.

Kata.require([
    'katajs/oh/SpaceConnection.js',
    'katajs/oh/SessionManager.js',
    'katajs/space/loop/Space.js'
], function() {

     var SUPER = Kata.SpaceConnection.prototype;
     /** Kata.LoopbackSpaceConnection is an implementation of
      * Kata.SpaceConnection which connects to a local space server,
      * i.e. one running in a WebWorker in the same browser.
      *
      * @constructor
      * @param {Kata.SessionManager} parent the parent
      * SessionManager that owns this connection
      * @param {Kata.URL} spaceurl URL of the space to connect to
      */
     Kata.LoopbackSpaceConnection = function (parent, spaceurl) {
         SUPER.constructor.call(this, parent);

         // LoopbackSpaceConnection uses an unusual mechanism for
         // connections. Since they are local, there's no network
         // connection we can create to connect to the space.  Instead,
         // the space registers itself in a global variable (within
         // Kata.LoopbackSpace). We just lookup that object and make async
         // calls to it.
         this.mSpace = Kata.LoopbackSpace.spaces[Kata.URL.host(spaceurl)];
         this.mSpaceURL = spaceurl;
         if (!this.mSpace)
             Kata.error("Couldn't find loopback space: " + spaceurl.toString());

         this.mObjectID = {}; // local -> space
         this.mLocalID = {}; // space -> local
     };
     Kata.extend(Kata.LoopbackSpaceConnection, Kata.SpaceConnection.prototype);

     Kata.LoopbackSpaceConnection.prototype.connectObject = function(id, auth, loc, vis) {
         var location=Kata.LocationIdentity(new Date());
         for (var key in loc) {
             location[key]=loc[key];
         }
         // FIXME use full loc information
         this.mSpace.connectObject(
             id,
             {
                 connected : Kata.bind(this.connectResponse, this),
                 message : Kata.bind(this.receiveODPMessage, this),
                 prox : Kata.bind(this.proxEvent, this),
                 presenceLocUpdate : Kata.bind(this.presenceLocUpdate, this),
                 scale: loc.scale, // FIXME
                 visual: vis
             },
             location
         );
     };

     Kata.LoopbackSpaceConnection.prototype.connectResponse = function(id, object, loc, visual) {
         this.mObjectID[id] = object;
         this.mLocalID[object] = id;
         if (object) // FIXME real presence_id below
             this.mParent.connectionResponse(id, true, {space : this.mSpaceURL, object : object}, {loc:loc, visual:visual});
         else
             this.mParent.connectionResponse(id, false);
     };

    Kata.LoopbackSpaceConnection.prototype.disconnectObject = function(id) {
        this.mSpace.disconnectObject(id);
    };

     Kata.LoopbackSpaceConnection.prototype.sendODPMessage = function(src_obj, src_port, dst_obj, dst_port, payload) {
         this.mSpace.sendODPMessage(src_obj, src_port, dst_obj, dst_port, payload);
     };

     Kata.LoopbackSpaceConnection.prototype.receiveODPMessage = function(src_obj, src_port, dst_obj, dst_port, payload) {
         this.mParent.receiveODPMessage(this.mSpaceURL, src_obj, src_port, dst_obj, dst_port, payload);
     };

     Kata.LoopbackSpaceConnection.prototype.registerProxQuery = function(id, sa) {
         this.mSpace.registerProxQuery(id, sa);
     };

     Kata.LoopbackSpaceConnection.prototype.proxEvent = function(id, observed, entered, properties) {
         this.mParent.proxEvent(this.mSpaceURL, id, observed, entered, properties);
     };

     Kata.LoopbackSpaceConnection.prototype.locUpdateRequest = function(id, loc, visual) {
         this.mSpace.locUpdateRequest(id, loc, visual);
     };

     Kata.LoopbackSpaceConnection.prototype.subscribe = function(id, observed) {
         this.mSpace.subscriptionRequest(id, observed, true);
     };

     Kata.LoopbackSpaceConnection.prototype.unsubscribe = function(id, observed) {
         this.mSpace.subscriptionRequest(id, observed, false);
     };

     // Invoked by LoopbackSpace when a loc update for a tracked object occurs.
     Kata.LoopbackSpaceConnection.prototype.presenceLocUpdate = function(from, to, loc, visual) {
         this.mParent.presenceLocUpdate(this.mSpaceURL, from, to, loc, visual);
     };

     Kata.SessionManager.registerProtocolHandler("loop", Kata.LoopbackSpaceConnection);
     // Simulated local space
     loopspace = new Kata.LoopbackSpace( Kata.URL("loop://localhost") );

}, 'katajs/oh/plugins/loop/LoopbackSpaceConnection.js');
