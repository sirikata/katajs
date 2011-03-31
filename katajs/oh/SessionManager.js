/*  Kata Javascript Network Layer
 *  SessionManager.js
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
    'katajs/core/URL.js'
], function() {
    /** Kata.SessionManager manages sessions with spaces.  Internally, it
     *  tracks only as many ObjectHost <-> Space connections as necessary.
     *  It multiplexes individual sessions over these connections, and
     *  presents for each object an interface that looks like it has a
     *  dedicated connection to the space. Migrations are also handled
     *  transparently, so only the SessionManager must handle migrating
     *  from space server to space server.
     *  @constructor
     */
    Kata.SessionManager = function () {
        this.mSpaceConnections = {};
        this.mObjects = {};
    };

     /** Register a protocol handler which is used to create
      *  connections to spaces for a protocol.
      *
      * @param {string} protocol the protocol this constructor
      * handles, e.g. the protocol part of a URL such as http in http://host/
      * @param {function()} conn_const a constructor for a SpaceConnection
      */
     Kata.SessionManager.registerProtocolHandler = function(protocol, conn_const) {
         if (! this._protocols)
             this._protocols = {};

         if (this._protocols[protocol])
             Kata.warn("Overwriting protocol handler for " + protocol);

         this._protocols[protocol] = conn_const;
     };

     /** Lookup the handler for the specified protocol.
      *  @param {string} protocol the protocol to handle.
      */
     Kata.SessionManager._getProtocolHandler = function(protocol) {
         if (! this._protocols)
             return undefined;
         return this._protocols[protocol];
     };

     /** Attempts to connect the object to the specified space.
      *
      * @param {Kata.HostedObject} ho the HostedObject to connect
      * @param {string} space URL of space to connect to
      * @param {string} auth authentication information for the space
      */
     Kata.SessionManager.prototype.connect = function(ho, req, auth) {
         var spaceURL = req.space;
         var spaceURLProtocol = Kata.URL.protocol(spaceURL);
         // Look up or create a connection
         var space_conn = this.mSpaceConnections[spaceURL];
         if (!space_conn) {
             var protoClass = Kata.SessionManager._getProtocolHandler(spaceURLProtocol);
             if (!protoClass)
                 Kata.error("Unknown space protocol: " + spaceURL.protocol);
             space_conn = new protoClass(this, spaceURL);
             this.mSpaceConnections[spaceURL] = space_conn;
         }

         this.mObjects[ho.getID()] = ho;

         // And try to connect
         space_conn.connectObject(ho.getID(), auth, req, req.visual);
     };

     /** Callback from SpaceConnection which allows us to alias an ID
      *  while a connection setup is in progress to safely handle
      *  events such as unreliable messages.
      */
     Kata.SessionManager.prototype.aliasIDs = function(id, presence_id) {
         var obj = this.mObjects[id];
         if (!obj) {
             Kata.warn("Got ID aliasing for unknown object: " + id);
             return;
         }
         this.mObjects[presence_id.object] = obj;
     };

     /** Indicate a connection response to the SessionManager.  Should
      *  only be called by SpaceConnections.
      *  @param {string} id
      *  @param {boolean} success
      *  @param {string} presence_id the identifier for the presence, or
      *  null if the connection wasn't successful.
      *  @param {Kata.Location} loc initial location information for the object
      *  @param {string} visual a reference to the visual description of the
      *  object
      */
     Kata.SessionManager.prototype.connectionResponse = function(id, success, presence_id, data) {
         var obj = this.mObjects[id];
         if (!obj) {
             Kata.warn("Got connection response for unknown object: " + id);
             return;
         }

         // If we actually got connected, swap which ID we're tracking the object with
         if (success) {
             delete this.mObjects[id];
             this.mObjects[presence_id.object] = obj;
         }

         obj.connectionResponse(success, presence_id, data);
     };

    /** Diconnect the given object from the space. */
    Kata.SessionManager.prototype.disconnect = function(ho, req) {
        var spaceURL = Kata.URL(req.space);
        var space_conn = this.mSpaceConnections[spaceURL];
        if (!space_conn) return;
        space_conn.disconnectObject(req.id);
    };

    /** Invoked by SpaceConnections when an object is forcefully
     *  disconnected from the space.
     */
    Kata.SessionManager.prototype.disconnected = function(objid, space) {
        var obj = this.mObjects[objid];
        if (!obj) {
            Kata.warn("Got disconnection event for unknown object: " + objid);
            return;
        }

        obj.disconnected(space);
    };

    /** Invoked by SpaceConnections when they are disconnected from
     *  the space. Guarantees the space connection won't continue to
     *  be used.
     */
    Kata.SessionManager.prototype.spaceConnectionDisconnected = function(space_conn) {
        for(var conn in this.mSpaceConnections) {
            if (space_conn === this.mSpaceConnections[conn])
                delete this.mSpaceConnections[conn];
        }
    };

     Kata.SessionManager.prototype.sendODPMessage = function(space, src_obj, src_port, dst_obj, dst_port, payload) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.sendODPMessage(src_obj, src_port, dst_obj, dst_port, payload);
     };

     Kata.SessionManager.prototype.receiveODPMessage = function(space, src_obj, src_port, dst_obj, dst_port, payload) {
         var obj = this.mObjects[dst_obj];
         obj.receiveODPMessage(space, src_obj, src_port, dst_obj, dst_port, payload);
     };

     Kata.SessionManager.prototype.registerProxQuery = function(space, id, sa) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.registerProxQuery(id, sa);
     };

     Kata.SessionManager.prototype.proxEvent = function(space, querier, observed, entered, properties) {
         var obj = this.mObjects[querier];
         obj.proxEvent(space, observed, entered, properties);
     };

     /** Send an update request to the space. */
     Kata.SessionManager.prototype.locUpdateRequest = function(space, id, loc, visual) {
         var space_conn = this.mSpaceConnections[space];
         if (space_conn !== undefined)
             space_conn.locUpdateRequest(id, loc, visual);
     };

     /** Should be invoked by SpaceConnection classes when a location
      *  update for a presence is available.
      *  @param from
      *  @param to
      */
     Kata.SessionManager.prototype.presenceLocUpdate = function(space, from, to, loc, visual) {
         var obj = this.mObjects[to];
         obj.presenceLocUpdate(space, from, loc, visual);
     };

     Kata.SessionManager.prototype.subscribe = function(space, id, observed) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.subscribe(id, observed);
     };

     Kata.SessionManager.prototype.unsubscribe = function(space, id, observed) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.unsubscribe(id, observed);
     };

}, 'katajs/oh/SessionManager.js');

// Needs to register using registerProtocolHandler.
