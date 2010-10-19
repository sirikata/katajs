/*  Kata Javascript Utilities
 *  Port.js
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
    'katajs/oh/odp/Endpoint.js'
], function() {

    if (typeof(Kata.ODP) == "undefined")
        Kata.ODP = {};

     /** An ODP port gives a convenient interface for sending and receiving ODP
      *  messages. These should only be allocated by objects that have internal
      *  methods for sending messages.  Users of Ports should acquire them from
      *  these other services.
      *  @constructor
      *  @param endpoint {Kata.ODP.Endpoint} the endpoint this port sends and
      *   receives on
      *  @param send_func {function(Kata.ODP.Endpoint, Kata.ODP.Endpoint, *)}
      *   function which actually sends the ODP message.
      *  @param release_func {function(Kata.ODP.Endpoint)} function which
      *   release the endpoint from this port. After being invoked, the port
      *   should be available for allocation again.
      */
    Kata.ODP.Port = function(endpoint, send_func, release_func) {
        this.mEndpoint = endpoint;
        this.mSendFunc = send_func;
        this.mReleaseFunc = release_func;

        this.mReceiveHandlers = [];
    };

    /** Send a message from this port to the specified destination endpoint.
     *  @param {Kata.ODP.Endpoint} dest destination endpoint
     *  @param payload payload to deliver in the message
     */
    Kata.ODP.Port.prototype.send = function(dest, payload) {
        this.mSendFunc(this.mEndpoint, dest, payload);
    };

    /** Set a default handler for messages that aren't handled by a more
     *  specific handler registerd with receiveFrom.
     *  @param handler handler to invoke
     */
    Kata.ODP.Port.prototype.receive = function(handler) {
        this.receiveFrom(Kata.ODP.Endpoint.any(), handler);
    };

    /** Set a handler for messages from the specified source.
     *  @param {Kata.ODP.Endpoint} src endpoint to receive messages from
     *  @param handler handler for messages matching src
     */
    Kata.ODP.Port.prototype.receiveFrom = function(src, handler) {
        this.mReceiveHandlers[src] = handler;
    };

    /** Deliver a message to this port.  Should only be used by the creator of
     *  the port.
     */
    Kata.ODP.Port.prototype.deliver = function(src, payload) {
        // Try to deliver from most specific to least specific
        if (this._tryDeliver(src, src, payload)) return true;
        if (this._tryDeliver(
            new Kata.ODP.Endpoint(src.space(), Kata.ObjectID.any(), src.port()),
            src, payload)) return true;
        if (this._tryDeliver(
            new Kata.ODP.Endpoint(Kata.SpaceID.any(), Kata.ObjectID.any(), src.port()),
            src, payload)) return true;
        if (this._tryDeliver(
            new Kata.ODP.Endpoint(src.space(), src.object(), Kata.ODP.PortID.any()),
            src, payload)) return true;
        if (this._tryDeliver(
            new Kata.ODP.Endpoint(src.space(), Kata.ObjectID.any(), Kata.ODP.PortID.any()),
            src, payload)) return true;
        if (this._tryDeliver(
            new Kata.ODP.Endpoint(Kata.SpaceID.any(), Kata.ObjectID.any(), Kata.ODP.PortID.any()),
            src, payload)) return true;

        return false;
    };

    /** Try to deliver a message via this port, trying to use match to find a
     *  handler.
     *  @returns true if successfully delivered
     */
    Kata.ODP.Port.prototype._tryDeliver = function(match, src, payload) {
        if(match in this.mReceiveHandlers) {
            var handler=this.mReceiveHandlers[match];
            handler(src, this.mEndpoint, payload);
            return true;
        }
        return false;
    };

    Kata.ODP.Port.prototype.toString = function() {
        return 'ODP.Port(' + this.mEndpoint.toConciseString() + ')';
    };

    /** Close the port, releasing it back to its creator.  This should be used
     *  when you are finished with the port so it can be reallocated by another
     *  user.
     */
    Kata.ODP.Port.prototype.close = function() {
        var rfunc = this.mReleaseFunc;
        var endpoint = this.mEndpoint;

        delete this.mEndpoint;
        delete this.mSendFunc;
        delete this.mReleaseFunc;

        rfunc(endpoint);
    };
}, 'katajs/oh/odp/Port.js');
