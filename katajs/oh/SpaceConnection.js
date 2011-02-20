/*  KataJS
 *  SpaceConnection.js
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
    'katajs/oh/ObjectHost.js'
], function() {

     /** Kata.SpaceConnection is a connection to a space. It provides
      * functionality for connecting to a space (as an object host)
      * and session management for individual objects.
      *
      * Implementations should register themselves as protocol
      * handlers using Kata.ObjectHost.registerProtocolHandler.
      *
      * @constructor
      * @param {Kata.SessionManager} parent the parent SessionManager
      * that owns this connection.
      */
     Kata.SpaceConnection = function (parent) {
         this.mParent = parent;
     };

     /** Attempt to connect the object to the space using the
      * authentication information.
      * @param {string} id identifier for this object, only used internally
      * @param {string} auth authentication information for the object
      * @param {Location} loc the whereabouts of the object
      * @param {string} vis the visual representation for the object
      * 
      */
     Kata.SpaceConnection.prototype.connectObject = function(id, auth, loc, vis) {
         Kata.notImplemented("SpaceConnection.connectObject");
     };

    /** Disconnect the object from the space. */
    Kata.SpaceConnection.prototype.disconnectObject = function(id) {
        Kata.notImplemented("SpaceConnection.disconnectObject");
    };

     /** Send an ODP message. */
     Kata.SpaceConnection.prototype.sendODPMessage = function(src_obj, src_port, dst_obj, dst_port, payload) {
         Kata.notImplemented("SpaceConnection.sendODPMessage");
     };

     Kata.SpaceConnection.prototype.registerProxQuery = function(id, sa) {
         Kata.notImplemented("SpaceConnection.registerQuery");
     };

     Kata.SpaceConnection.prototype.locUpdateRequest = function(id, loc, visual) {
         Kata.notImplemented("SpaceConnection.locUpdateRequest");
     };

     /** Send a subscription request to the space.
      * @param id the identifier of the subscriber
      * @param observed the identifier of the object to listen for
      * updates from
      */
     Kata.SpaceConnection.prototype.subscribe = function(id, observed) {
         Kata.notImplemented("SpaceConnection.subscribe");
     };

     /** Send an unsubscription request to the space.
      * @param id the identifier of the subscriber
      * @param observed the identifier of the object to stop getting updates from.
      */
     Kata.SpaceConnection.prototype.unsubscribe = function(id, observed) {
         Kata.notImplemented("SpaceConnection.unsubscribe");
     };

}, 'katajs/oh/SpaceConnection.js');
