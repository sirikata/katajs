/*  Kata Javascript Network Layer
 *  HostedObject.js
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

Kata.include("network/ObjectHost.js");

(function() {

    /** Base class for protocol-specific HostedObject implementations.
     * @constructor
     * @param {Kata.ObjectHost} objectHost Pointer to controlling object host.
     * @param {string} id Some identifier for this object. It may not be
     *     meaningful to the underlying protocol?
     */
    Kata.HostedObject = function (objectHost, id) {
        this.mObjectHost = objectHost;
        this.mID = id;
    };

    /**
     * @return Pointer to controlling object host as passed in constructor.
     */
    Kata.HostedObject.prototype.getObjectHost = function () {
        return this.mObjectHost;
    };

    /**
     * @return Pointer to identifier passed in constructor.
     */
    Kata.HostedObject.prototype.getID = function () {
        return this.mID;
    };

    /** A simulation sent a message to this object via the object host.
     *
     * @param {Kata.Channel} channel  Channel of the sending simulation.
     * @param {object} data  Data from the simulation (at the moment, in
     *     JavascriptGraphicsApi format, as well as protocol-specific messages)
     */
    Kata.HostedObject.prototype.messageFromSimulation = function (channel, data) {
    };

})();
