/*  Kata Javascript Utilities
 *  Endpoint.js
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
    'katajs/core/SpaceID.js',
    'katajs/core/ObjectID.js',
    'katajs/core/PresenceID.js',
    'katajs/oh/odp/PortID.js'
], function() {

    if (typeof(Kata.ODP) == "undefined")
        Kata.ODP = {};

    /** An ODP.Endpoint is a fully qualified address for ODP, including the
     *  space, object, and port.
     */
    Kata.ODP.Endpoint = function() {
        if (arguments.length == 2) {
            this.mSpace = arguments[0].space();
            this.mObject = arguments[0].object();
            this.mPort = arguments[1];
        }
        else if (arguments.length == 3) {
            this.mSpace = arguments[0];
            this.mObject = arguments[1];
            this.mPort = arguments[2];
        }
        else {
            throw "Invalid endpoint constructor argument list";
        }
    };

    Kata.ODP.Endpoint.prototype.space = function() {
        return this.mSpace;
    };

    Kata.ODP.Endpoint.prototype.object = function() {
        return this.mObject;
    };

    Kata.ODP.Endpoint.prototype.port = function() {
        return this.mPort;
    };

    Kata.ODP.Endpoint.prototype.presenceID = function() {
        return new Kata.PresenceID(this.mSpace, this.mObject);
    };

    Kata.ODP.Endpoint.any = function() {
        return new Kata.ODP.Endpoint(Kata.SpaceID.any(), Kata.ObjectID.any(), Kata.ODP.PortID.any());
    };

    Kata.ODP.Endpoint.prototype.toConciseString = function() {
        return this.mSpace.toString() + ':' + this.mObject.toString() + ':' +
            this.mPort.toString();
    };
    Kata.ODP.Endpoint.prototype.toString = function() {
        return 'ODP.Endpoint(' + this.toConciseString() + ')';
    };

}, 'katajs/oh/odp/Endpoint.js');
