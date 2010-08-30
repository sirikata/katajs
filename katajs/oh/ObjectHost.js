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
    Kata.ObjectHost = function (blessed_script, blessed_class, blessed_args) {
        this.mSimulations = [];
        this.mSimulationsByName = {};
        this.mSimulationCallbacksByName={};
        this.mSpaceMap = {};
        this.mSpaceConnections = {};
        this.mObjects = {};

        this.createObject(blessed_script, blessed_class, blessed_args);

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
        channel.registerListener(Kata.bind(this.receivedSimulationMessage, this, name));
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
    Kata.ObjectHost.prototype.registerSimulationCallback = function(simName, object){
        if (simName in this.mSimulationCallbacksByName) {
            this.mSimulationCallbacksByName[simName].push(object);
        }else {
            this.mSimulationCallbacksByName[simName]=[object];
        }
    };
    Kata.ObjectHost.prototype.unregisterSimulationCallback = function(simName, object){
        var callbacks = this.mSimulationCallbacksByName[simName];
        if (callbacks.length==1) {
            delete this.mSimulationCallbacksByName[simName];
        }else {
            for (var i=0;i<callbacks.length;++i) {
                if (callbacks[i]==object) {
                    callbacks[i]=callbacks[callbacks.length-1];
                    callbacks.pop();
                    break;
                }
            }
        }
    };
    Kata.ObjectHost.prototype.receivedSimulationMessage = function(simName, channel, data) {
        var cbArray=this.mSimulationCallbacksByName[simName];
        if (cbArray) {
            for (var i=0;i<cbArray.length;++i) {
                cbArray[i].handleMessageFromSimulation(simName,channel,data);
            }
        }
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
     Kata.ObjectHost.prototype.connect = function(ho, req, auth) {
         var spaceURL = new Kata.URL(req.space);

         // Look up or create a connection
         var space_conn = this.mSpaceConnections[spaceURL.toString()];
         if (!space_conn) {
             var protoClass = Kata.ObjectHost._getProtocolHandler(spaceURL.protocol);
             if (!protoClass)
                 Kata.error("Unknown space protocol: " + spaceURL.protocol);
             space_conn = new protoClass(this, spaceURL);
             this.mSpaceConnections[spaceURL.toString()] = space_conn;
         }

         // And try to connect
         space_conn.connectObject(ho.getID(), auth, req.visual);
     };

     /** Indicate a connection response to the ObjectHost.  Should
      *  only be called by SpaceConnections.
      *  @param {} id
      *  @param {boolean} success
      *  @param {} presence_id the identifier for the presence, or
      *  null if the connection wasn't successful.
      *  @param {Kata.Location} loc initial location information for the object
      *  @param {} visual a reference to the visual description of the object
      */
     Kata.ObjectHost.prototype.connectionResponse = function(id, success, presence_id, loc, visual) {
         var obj = this.mObjects[id];
         if (!obj) {
             Kata.warn("Got connection response for unknown object: " + id);
             return;
         }

         // Swap which ID we're tracking the object with
         delete this.mObjects[id];
         this.mObjects[presence_id.object] = obj;

         obj.connectionResponse(success, presence_id, loc, visual);
     };

     Kata.ObjectHost.prototype.registerProxQuery = function(space, id, sa) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.registerProxQuery(id, sa);
     };

     Kata.ObjectHost.prototype.proxEvent = function(space, querier, observed, entered, properties) {
         var obj = this.mObjects[querier];
         obj.proxEvent(space, observed, entered, properties);
     };

     /** Send an update request to the space. */
     Kata.ObjectHost.prototype.locUpdateRequest = function(space, id, loc, visual) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.locUpdateRequest(id, loc, visual);
     };

     /** Should be invoked by SpaceConnection classes when a location
      *  update for a presence is available.
      *  @param from
      *  @param to
      */
     Kata.ObjectHost.prototype.presenceLocUpdate = function(space, from, to, loc, visual) {
         var obj = this.mObjects[to];
         obj.presenceLocUpdate(space, from, loc, visual);
     };

     Kata.ObjectHost.prototype.subscribe = function(space, id, observed) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.subscribe(id, observed);
     };

     Kata.ObjectHost.prototype.unsubscribe = function(space, id, observed) {
         var space_conn = this.mSpaceConnections[space];
         space_conn.unsubscribe(id, observed);
     };


})();

// Needs to register using registerProtocolHandler.
Kata.include("katajs/oh/LoopbackSpaceConnection.js");
