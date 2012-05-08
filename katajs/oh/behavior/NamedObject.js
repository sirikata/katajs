/*  Kata Javascript Utilities
 *  NamedObject.js
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

// We use protocol buffers just to encode the string, we could also
// setup real messages
Kata.require([
    'externals/protojs/protobuf.js'
], function() {

    if (typeof(Kata.Behavior) == "undefined")
        Kata.Behavior = {};

    /** NamedObject is a behavior that attaches a name to the object and can
     *  respond to queries for it. See NamedObjectObserver for a version which
     *  also discovers the names of objects it encounters.
     *  @constructor
     *  @param name {String} the name for this object
     *  @param parent {Kata.Script} the parent Script for this behavior
     */
    Kata.Behavior.NamedObject = function(name, parent) {
        this.mName = name;

        this.mParent = parent;
        this.mParent.addBehavior(this);

        this.mPorts = {};
    };

    Kata.Behavior.NamedObject.prototype.ProtocolPort = 10;

    Kata.Behavior.NamedObject.prototype._getPort = function(pres) {
        var id = pres;
        if (pres.presenceID)
            id = pres.presenceID();
        var odp_port = this.mPorts[id];
        if (!odp_port && pres.bindODPPort) {
            odp_port = pres.bindODPPort(this.ProtocolPort);
            odp_port.receive(Kata.bind(this.handleResponse, this));
            this.mPorts[id] = odp_port;
        }
        return odp_port;
    };

    Kata.Behavior.NamedObject.prototype.newPresence = function(pres) {
        var odp_port = this._getPort(pres);
        odp_port.receive(Kata.bind(this._handleMessage, this));
    };

    Kata.Behavior.NamedObject.prototype.presenceInvalidated = function(pres) {
        var odp_port = this._getPort(pres);
        if (odp_port) {
            odp_port.close();
            delete this.mPorts[pres.presenceID()];
        }
    };

    Kata.Behavior.NamedObject.prototype._handleMessage = function(src, dest, payload) {
        var odp_port = this._getPort(dest.presenceID());
        odp_port.send(src, PROTO.encodeUTF8(this.mName));
    };

    /** NamedObjectObserver is a NamedObject which also requests the names of
     *  other objects. Mix this class in if you want to learn other objects
     *  names.
     *  @constructor
     *  @param name {String} the name for this object
     *  @param parent {Kata.Script} the parent Script for this behavior
     *  @param cb {function(Kata.RemotePresence, String)} a callback to be
     *   invoked when a new NamedObject becomes known, or it is discovered that
     *   an object is not a NamedObject. This can be used as a replacement for
     *   normal presence callbacks.
     */
    Kata.Behavior.NamedObjectObserver = function(name, parent, cb) {
        this.SUPER.constructor.call(this, name, parent);
        this.mCB = cb;

        this.mQueriedObjects = {};
    };
    Kata.extend(Kata.Behavior.NamedObjectObserver, Kata.Behavior.NamedObject.prototype);

    Kata.Behavior.NamedObjectObserver.prototype.remotePresence = function(presence, remote, added) {
        if (!added) {
            // In this case, just forward along the removal
            if (this.mCB)
                this.mCB(remote, added);
            return;
        }

        var odp_port = this._getPort(presence);
        // Empty payload indicates request
        odp_port.send(remote.endpoint(this.ProtocolPort), '');

        var self = this;
        var reqinfo = { remote : remote };
        var timer = setTimeout(
            function() { self._requestTimeout(reqinfo); },
            1000
        );
        reqinfo.timer = timer;
        this.mQueriedObjects[remote.presenceID()] = reqinfo;
    };

    Kata.Behavior.NamedObjectObserver.prototype._handleReply = function(reqinfo, name) {
        if (name === null)
            reqinfo.remote.name = null;
        else
            reqinfo.remote.name = PROTO.decodeUTF8(name);

        if (this.mCB)
            this.mCB(reqinfo.remote, true);
        clearTimeout(reqinfo.timer);
        delete this.mQueriedObjects[reqinfo.remote.presenceID()];
    };

    Kata.Behavior.NamedObjectObserver.prototype._handleMessage = function(src, dest, payload) {
        var queried_reqinfo = this.mQueriedObjects[src.presenceID()];
        // If we sent a query and we have non-zero response length, this is a reply
        if (queried_reqinfo && payload && payload.length > 0)
            this._handleReply(queried_reqinfo, payload);
        else // Otherwise, its just a request and should be answered as NamedObject does
            this.SUPER._handleMessage.call(this, src, dest, payload);
    };

     Kata.Behavior.NamedObjectObserver.prototype._requestTimeout = function(reqinfo) {
         this._handleReply(reqinfo, null);
     };

}, 'katajs/oh/behavior/NamedObject.js');
