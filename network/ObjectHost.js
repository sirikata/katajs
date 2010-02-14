/*  Kata Javascript Network Layer
 *  ObjectHost.js
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

(function() {

    var NUM_STREAMS = 1; //FIXME: Test with more than one.

    // public abstract class ObjectHost
    /** @constructor */
    Kata.ObjectHost = function () {
        this.mProtocols = {};
        this.mProtocols["sirikata"] = {
            name: "sirikata",
            default_port: 5943,
            protocol_class: Kata.TCPSST,
            object_class: Kata.SirikataHostedObject
        };
        this.mSimulations = [];
        this.mSimulationsByName = {};
        this.mSpaceMap = {};
        this.mSpaceConnections = {};
        this.mObjects = {};
    };

    Kata.ObjectHost.prototype.registerSimulation = function (channel, name) {
        this.mSimulations.push(channel);
        this.mSimulationsByName[name] = channel;
        channel.registerListener(this);
    };

    /** FIXME DESCRIPTION
    @param {object=} name  Simulation name (if ommitted, broadcast). */
    Kata.ObjectHost.prototype.sendToSimulation = function (data, name) {
        if (!name) {
            for (name in this.mSimulationsByName) {
                this.mSimulationsByName[name].sendMessage(data);
            }
        } else {
            this.mSimulationsByName[name].sendMessage(data);
        }
    };
    Kata.ObjectHost.prototype.receivedMessage = function (channel, data) {
        console.log("Object Host received a message:", data);
        if (channel == this.mSimulationsByName["graphics"]) {
            switch (data.msg) {
            case "RegisterSpace":
                this.registerSpace(data.spaceid.toLowerCase(), data.server);
                return;
            case "CreateObject":
                this.createObject(data.spaceid.toLowerCase(), data.privid.toLowerCase());
                return;
            default:
                break;
            }
        }
        var privid = data.privid && data.privid.toLowerCase();
        if (privid in this.mObjects) {
            this.mObjects[privid].messageFromSimulation(channel, data);
        } else {
            console.log("ObjectHost message for unknown object ",privid);
            console.log("List of known objects:",this.mObjects);
        }
    };

    Kata.ObjectHost.prototype.registerSpace = function (spacename, server) {
        var colon = server.indexOf("://");
        if (colon == -1) {
            Kata.error("registerSpace missing protocol for server "+server);
        }
        var proto = this.mProtocols[server.substr(0, colon)];
        if (!proto) {
            Kata.error("Protocol "+proto+" is not registered.");
        }
        var ProtoClass = proto.protocol_class;
        server = server.substr(colon+3);
        var slash = server.indexOf("/");
        if (slash != -1) {
            server = server.substr(0, slash);
        }
        colon = server.indexOf(":");
        var host, port;
        if (colon == -1) {
            host = server;
            port = proto.default_port;
        } else {
            host = server.substr(0, colon);
            port = server.substr(colon+1);
        }
        this.mSpaceMap[spacename] = {protocol: proto, host: host, port: port};
    };

    Kata.ObjectHost.prototype.createObject = function(spacename, id) {
        var HostedClass = this.mSpaceMap[spacename].protocol.object_class;
        this.mObjects[id] = new HostedClass(this, id);
        return this.mObjects[id];
    };

    /** FIXME
    @param {object=} channel  An optional top-level stream already connected to this same space. */
    Kata.ObjectHost.prototype.connectToSpace = function(spacename, channel) {
        var topLevelStream = channel;
        if (topLevelStream) {
            this.mSpaceConnections[spacename] = channel;
        } else {
            topLevelStream = this.mSpaceConnections[spacename];
        }
        if (!topLevelStream) {
            var server = this.mSpaceMap[spacename];
            var ProtoClass = server.protocol.protocol_class;
            topLevelStream = new ProtoClass(server.host, server.port, NUM_STREAMS);
            this.mSpaceConnections[spacename] = topLevelStream;
        }
        return topLevelStream;
    };

})();
