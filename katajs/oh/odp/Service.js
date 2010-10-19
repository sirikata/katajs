/*  Kata Javascript Utilities
 *  Service.js
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
    'katajs/oh/odp/Port.js'
], function() {

    if (typeof(Kata.ODP) == "undefined")
        Kata.ODP = {};

     /** An ODP Service allows an .  This class should be used as a mixin via
      *  Kata.extend to add ODP service functionality to a class. By providing
      *  methods for sending messages and delegating OPD messages to the
      *  deliverODPMessage method, a class can quickly have full ODP
      *  functionality.
      *  @constructor
      *  @param send_func {function(Kata.ODP.Endpoint, Kata.ODP.Endpoint, *)}
      *   function which actually sends the ODP message.
      *  @param release_func {function(Kata.ODP.Endpoint)} function which
      *   release the endpoint from this port. After being invoked, the port
      *   should be available for allocation again.
      */
    Kata.ODP.Service = function(send_func) {
        this.mODPServiceSendFunc = send_func;
        this.mODPServiceBoundPorts = {};
    };

    /** Bind an ODP port for this presence.  The full identifier for
     * the port will be (PID,port), where PID is the PresenceID of
     * this Presence (which uniquely identifies the space and
     * object).
     * @param port the port to attempt to bind.
     * @returns {Kata.ODP.Port} an ODP port that can be used to send
     * ODP messages, or null on failure to bind
     */
    Kata.ODP.Service.prototype.bindODPPort = function(space, object, port) {
        var odp_ep = new Kata.ODP.Endpoint(space, object, port);
        var odp_port = this.mODPServiceBoundPorts[odp_ep];
        if (typeof(odp_port) != "undefined")
            throw "Tried to bind previously bound port.";

        odp_port = new Kata.ODP.Port(
            odp_ep,
            this.mODPServiceSendFunc,
            Kata.bind(this._handleODPServiceReleasePort, this)
        );
        this.mODPServiceBoundPorts[odp_ep] = odp_port;
        return odp_port;
    };

    Kata.ODP.Service.prototype._handleODPServiceReleasePort = function(endpoint)
    {
        if (typeof(this.mODPServiceBoundPorts[endpoint]) == "undefined")
            Kata.error("Got ODP port release for unallocated port.");
        delete this.mODPServiceBoundPorts[endpoint];
    };

    Kata.ODP.Service.prototype._deliverODPMessage = function(src_ep, dest_ep, payload) {
        var odp_port = this.mODPServiceBoundPorts[dest_ep];
        if (typeof(odp_port) == "undefined") return;

        odp_port.deliver(src_ep, payload);
    };

}, 'katajs/oh/odp/Service.js');
