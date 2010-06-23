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
Kata.include("katajs/core/URL.js");

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

     Kata.ObjectHost.prototype.createObject = function(script, cons, args) {
         var privid = this.privateIdGenerator();
         var createdObject = this.generateObject(privid);
         if (script && cons && args)
             createdObject.createScript(script, cons, args);
     };

    /** Sends a message to some simulation.
     * @param {Kata.Channel} channel  The sending simulation.
     * @param {string|object} data  A message (often an object formatted as
     *     JavascriptGraphicsApi)
     */
    Kata.ObjectHost.prototype.receivedMessage = function (channel, data) {
        if (channel == this.mSimulationsByName["graphics"]||data.msg=="Create") {
            switch (data.msg) {
            case "Create":{
                this.createObject(data.script, data.method, data.args);
                return;
            }
            default:
                break;
            }
        }
        console.log("ObjectHost message for unknown object: "+privid);
        console.log("List of known objects:",this.mObjects);
    };

    /** Creates a new instance of a Kata.HostedObject for a specific protocol.
     * @param {string} id  A unique name for this object. You can use this to
     *     lookup the object within the object host, and it gets passed to the
     *     object's constructor.
     * @return {Kata.HostedObject} A pointer to the new object.
     */
    Kata.ObjectHost.prototype.generateObject = function(id) {
        if (network_debug) console.log("Creating Object "+id);
        this.mObjects[id] = new Kata.HostedObject(this, id);
        return this.mObjects[id];
    };

     /** Attempts to connect the object to the specified space.
      *
      * @param {Kata.HostedObject} ho the HostedObject to connect
      * @param {string} space URL of space to connect to
      * @param {} auth authentication information for the space
      */
     Kata.ObjectHost.prototype.connect = function(ho, space, auth) {
         var spaceURL = new Kata.URL(space);

         // Look up or create a connection
         var space_conn = this.mSpaceConnections[spaceURL.toString()];
         if (!space_conn) {
             var protoClass = Kata.ObjectHost._getProtocolHandler(spaceURL.protocol);
             if (!protoClass)
                 Kata.error("Unknown space protocol: " + spaceURL.protocol);
             space_conn = new protoClass(this, spaceURL);
         }

         // And try to connect
         space_conn.connectObject(ho.getID(), auth);
     };

     /** Indicate a connection response to the ObjectHost.  Should
      *  only be called by SpaceConnections.
      *  @param {} id
      *  @param {boolean} success
      *  @param {} presence_id the identifier for the presence, or
      *  null if the connection wasn't successful.
      *  @param {LocUpdate} loc initial location information for the object
      *  @param {BoundsUpdate} bounds initial bounds information for the object
      */
     Kata.ObjectHost.prototype.connectionResponse = function(id, success, presence_id, loc, bounds) {
         var obj = this.mObjects[id];
         if (!obj) {
             Kata.warn("Got connection response for unknown object: " + id);
             return;
         }

         obj.connectionResponse(success, presence_id, loc, bounds);
     };

    /** Connects to a space registered using registerSpace.
     * @param {string} spacename  The name of a space (from registerSpace).
     * @param {Kata.ObjectHost.TopLevelStream=} channel  A channel to register
     *     to a new space. Omitted if a new connection is to be made instead.
     * @return {Kata.ObjectHost.TopLevelStream}  A top-level stream to talk to
     *     the space represented by spacename.
     */
    Kata.ObjectHost.prototype.connectToSpace = function(spacename, channel) {
        Kata.warn("Deprecated: ObjectHost.connectToSpace");
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
