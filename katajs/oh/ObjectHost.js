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

Kata.include("katajs/oh/HostedObject.js");

(function() {

    var NUM_STREAMS = 1; //FIXME: Test with more than one.

    /** Kata.ObjectHost is the main interface to access HostedObject's. It also
     * manages the list of open space connections, and communication between
     * other simulations (graphics and physics).
     * @constructor
     */
    Kata.ObjectHost = function () {
        this.mSimulations = [];
        this.mSimulationsByName = {};
        this.mSpaceMap = {};
        this.mSpaceConnections = {};
        this.mObjects = {};
        if (network_debug) console.log("ObjectHosted!");
    };

     /** Register a protocol handler which is used to create
      *  connections to spaces for a protocol.
      *
      * @param {string} protocol the protocol this constructor
      * handles, e.g. the protocol part of a URL such as http in http://host/
      * @param {} conn_const a constructor for a SpaceConnection
      */
     Kata.ObjectHost.registerProtocolHandler = function(protocol, conn_const) {
         if (! this._protocols)
             this._protocols = {};

         if (this._protocols[protocol])
             Kata.warn("Overwriting protocol handler for " + protocol);

         this._protocols[protocol] = conn_const;
     };

     /** Lookup the handler for the specified protocol.
      *  @param {string} protocol the protocol to handle.
      */
     Kata.ObjectHost._getProtocolHandler = function(protocol) {
         if (! this._protocols)
             return undefined;
         return this._protocols[protocol];
     };

    /** Notifies the ObjectHost about a new simulation.
     * @param {Kata.Channel} channel  The corresponding simulation's channel.
     * @param {string} name  Some human-readable name. May be useful if scripts
     *     wish to talk to a specfic simulation?
     */
    Kata.ObjectHost.prototype.registerSimulation = function (channel, name) {
        this.mSimulations.push(channel);
        this.mSimulationsByName[name] = channel;
        channel.registerListener(Kata.bind(this.receivedMessage, this));
    };
    /**
     * @return The human-readable name passed to registerSimulation.
     * @param {Kata.Channel} channel  The corresponding simulation's channel.
     */
    Kata.ObjectHost.prototype.getSimulationName = function (channel) {
        for (var name in this.mSimulationsByName) {
            if (this.mSimulationsByName[name] == channel) {
                return name;
            }
        }
        return null;
    };

    /** Sends a message to some simulation.
     * @param {string|object} data  A message (often an object formatted as
     *     JavascriptGraphicsApi)
     * @param {string=} name  Simulation name (if ommitted, broadcast).
     */
    Kata.ObjectHost.prototype.sendToSimulation = function (data, name) {
        if (!name) {
            for (name in this.mSimulationsByName) {
                this.mSimulationsByName[name].sendMessage(data);
            }
        } else {
            this.mSimulationsByName[name].sendMessage(data);
        }
    };

    Kata.ObjectHost.prototype.privateIdGenerator=function(){
        var retval=0;
        return function() {
            retval+=1;
            return ""+retval;
        };
    }();
    /** Sends a message to some simulation.
     * @param {Kata.Channel} channel  The sending simulation.
     * @param {string|object} data  A message (often an object formatted as
     *     JavascriptGraphicsApi)
     */
    Kata.ObjectHost.prototype.receivedMessage = function (channel, data) {
        var privid = this.privateIdGenerator();
        if (channel == this.mSimulationsByName["graphics"]||data.msg=="Create") {
            switch (data.msg) {
            case "RegisterSpace":
                var spaceid = data.spaceid;
                this.registerSpace(spaceid, data.server);
                return;
            case "Create":{
                var createdObject = this.createObject(privid);
                if (data.script && data.method && data.args)
                    createdObject.createScript(data.script, data.method, data.args);
                return;
            }
            default:
                break;
            }
        }
        if (privid in this.mObjects) {
            this.mObjects[privid].messageFromSimulation(channel, data);
        } else {
            console.log("ObjectHost message for unknown object: "+privid);
            console.log("List of known objects:",this.mObjects);
        }
    };

    /** Registers a space server in a map. This server is not connected yet.
     * Does not handle spaces with multiple IP addresses, so this isn't very
     * useful.
     *
     * @param {string} spacename  The name (or UUID) of a space server.
     * @param {string} server  A URI (protocol, host, port) to connect to.
     */
    Kata.ObjectHost.prototype.registerSpace = function (spacename, server) {
        var colon = server.indexOf("://");
        if (colon == -1) {
            Kata.error("registerSpace missing protocol for server "+server);
        }
        var protoname = server.substr(0, colon);
        var protoClass = Kata.ObjectHost._getProtocolHandler(protoname);
        if (!protoClass) {
            Kata.error("Protocol "+protoname+" is not registered.");
        }
        server = server.substr(colon+3);
        var slash = server.indexOf("/");
        if (slash != -1) {
            server = server.substr(0, slash);
        }
        colon = server.indexOf(":");
        var host, port;
        if (colon == -1) {
            host = server;
            port = null;
        } else {
            host = server.substr(0, colon);
            port = server.substr(colon+1);
        }
        this.mSpaceMap[spacename] = {protocol: protoClass, host: host, port: port};
    };

    /** Creates a new instance of a Kata.HostedObject for a specific protocol.
     * @param {string} id  A unique name for this object. You can use this to
     *     lookup the object within the object host, and it gets passed to the
     *     object's constructor.
     * @return {Kata.HostedObject} A pointer to the new object.
     */
    Kata.ObjectHost.prototype.createObject = function(id) {
        if (network_debug) console.log("Creating Object "+id);
        this.mObjects[id] = new Kata.HostedObject(this, id);
        return this.mObjects[id];
    };

    /** Connects to a space registered using registerSpace.
     * @param {string} spacename  The name of a space (from registerSpace).
     * @param {Kata.ObjectHost.TopLevelStream=} channel  A channel to register
     *     to a new space. Omitted if a new connection is to be made instead.
     * @return {Kata.ObjectHost.TopLevelStream}  A top-level stream to talk to
     *     the space represented by spacename.
     */
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

    /**
     * A top-level connection to a remote server. It is not yet bound to a
     * specific HostedObject.
     * @interface
     */
    Kata.ObjectHost.TopLevelStream = function() {};
    /**
     * @return {Kata.Channel} A connection bound to a specific hosted object.
     */
    Kata.ObjectHost.TopLevelStream.prototype.clone = function() {};

})();
