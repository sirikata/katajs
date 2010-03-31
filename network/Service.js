/*  kata3d Javascript Utilities
 *  Service.js
 * 
 *  Copyright (c) 2010, Patrick Reiter Horn
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
 *  * Neither the name of kata3d nor the names of its contributors may
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
    /** A Service is an interface which represents some connection that has a
     * number of ports. This class is responsible for allocating ports and
     * keeping a map of in-use ports. It has a send function to send a packet
     * over the network connection, assuming the port number is already set.
     * @constructor
     */
    Kata.Service=function () {
        this.mPorts = {};
        this.mNextPortId = this.sMaxPortNumber;
    };

    /** The maximum port number that can be specifically requested.
     * New allocations start at this number.
     * Subclasses can override this default number.
     */
    Kata.Service.prototype.sMaxPortNumber = 16384;

    /**
     * Returns a known port, usually to listen to specific network services.
     * @param {number} portid  A well known port number.
     * @return {Kata.Port}  The single port instance assigned to this portid.
     */
    Kata.Service.prototype.getPort = function(portid) {
        var port = this.mPorts[portid];
        if (!port) {
            port = this._createPort(portid);
            this.mPorts[portid] = port;
        }
        return port;
    };

    /**
     * Allocates a new port to be assigned, usually used for sending data and
     * waiting for it to be returned to the same sender.
     * @return {Kata.Port}  Some new or unused Kata.Port instance.
     */
    Kata.Service.prototype.newPort = function() {
        while (this.mPorts[this.mNextPortId]) {
            this.mNextPortId++;
        }
        var portid = this.mNextPortId;
        this.mNextPortId++;
        return this.getPort(portid);
    };

    /**
     * Delivers data on a specific port. Generally called by Kata.Port when it
     * is sending a message.
     * @param {number} portid  Some port identifier, usually of the caller.
     * @param {Array} args  Any arguments to be passed to the
     */
    Kata.Service.prototype.deliver = function(portid, args) {
        var listener = this.mPorts[portid];
        if (!listener) {
            Kata.error("Kata.Channel's mListener is not set");
        }
        listener.deliver(args);
    };

    /**
     * Delivers data on a specific port. Generally called by Kata.Port when it
     * is sending a message.
     * @param {...*} var_args  Any arguments to be passed in the message
     */
    Kata.Service.prototype.send = null;
    /**
     * Creates a new Kata.Port instance.
     * @param {number} portnum  What number to be assigned to this new port.
     * @return {Kata.Port}  A new port instance assigned this ID.
     */
    Kata.Service.prototype._createPort = null;

})();
