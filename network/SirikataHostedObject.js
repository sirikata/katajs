/*  Kata Javascript Network Layer
 *  SirikataHostedObject.js
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

if (typeof Sirikata == "undefined") { Sirikata = {}; }

(function() {

    var Ports = {
        RPC:0, // Default MessageBody RPC service
        REGISTRATION:1,
        LOC:2,
        GEOM:3, // Proximity service: Also known as PROX
        ROUTER:4,
        PERSISTENCE:5,
        PHYSICS:6,
        TIMESYNC:7,
        SUBSCRIPTION:9,
        BROADCAST:10
    };

    function ProxyObject(id) {
        this.mRequests = {};
        this.mSubscriptions = [];
        this.mRefCount = 0;
        this.mID = id;
        this.mSerialNum = 1;
    };

    ProxyObject.prototype.generateHeader = function(space, port) {
        var header = new Sirikata.Protocol.Header;
        header.destination_object = this.mID;
        header.destination_space = space;
        header.destination_port = port;
        header.id = this.mSerialNum++;
    };

    ProxyObject.prototype.askForProperties = function() {
        var persistence = new Sirikata.Protocol.Persistence;
        var header = this.generateHeader(space, Ports.LOC);
        var b64stream = new PROTO.Base64Stream;
        msg.SerializeToStream(b64stream);
        this.mRequests[header.id] = msg;
    };

    ProxyObject.prototype.askForPosition = function(space) {
        var loc = new Sirikata.Protocol.LocRequest;
        var header = this.generateHeader(space, Ports.LOC);
        var msg = new Sirikata.Protocol.MessageBody;
        msg.message_names.push("LocRequest");
        msg.message_arguments.push(loc);
        var b64stream = new PROTO.Base64Stream;
        msg.SerializeToStream(b64stream);
        this.mRequests[header.id] = msg;
    };

    // public class SirikataHostedObject
    var SUPER = Kata.HostedObject.prototype;

    /** @constructor */
    Sirikata.HostedObject = function (objectHost, uuid) {
        SUPER.constructor.call(this, objectHost, uuid);
        this.mSpaceConnectionMap = {};
        this.mObjects = {};
    };

    Kata.extend(Sirikata.HostedObject, SUPER);

    Sirikata.HostedObject.prototype.connectToSpace = function (space) {
        var topLevelConnection = this.mObjectHost.connectToSpace(space);
        var substream = topLevelConnection.clone();
        substream.registerListener(this);
        var spaceconn = {
            objectID: null,
            proximity: {},
            service: null,
            rpcPort: null
        };
        this.mSpaceConnectionMap[space] = spaceconn;
        spaceconn.service = new SstService(substream, space);
        spaceconn.rpcPort = spaceconn.service.getPort(Ports.RPC);
        spaceconn.service.bindPort(Ports.RPC, this._parseRPC, this);
        spaceconn.service.bindPort(Ports.PERSISTENCE, this._parsePersistence, this);
        spaceconn.service.bindPort(Ports.BROADCAST, this._parseBroadcast, this);

        // send introductory NewObj message.
        {
            var body = new Sirikata.Protocol.MessageBody;
            body.message_names.push("NewObj");
            var newObj = new Sirikata.Protocol.NewObj;
            newObj.object_uuid_evidence = this.mID;
            newObj.bounding_sphere = [0,0,0,1];
            var loc = newObj.requested_object_loc;
            loc.timestamp = PROTO.I64.fromNumber(new Date().getTime()*1000);
            loc.position = [0,0,0];
            loc.orientation = [0,0,0,1];
            loc.velocity = [0,0,0];
            body.message_arguments.push(newObj);
            spaceconn.rpcPort.send("",Ports.REGISTRATION,body);
        }
        return substream;
    };

    Sirikata.HostedObject.prototype._parseRPC = function (header, bodydata) {
        var body = new Sirikata.Protocol.MessageBody;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received RPC from:",header,"Body:",body);
        var spaceConn = this.mSpaceConnectionMap[header.source_space];
        var message_name = '';
        var message = null;
        for (var i = 0; i < body.message_arguments.length; i++) {
            if (body.message_names[i]) {
                message_name = body.message_names[i];
            }
            message = body.message_arguments[i];
            switch (message_name) {
            case "RetObj":
                var retObj = new Sirikata.Protocol.RetObj;
                retObj.ParseFromStream(new PROTO.ByteArrayStream(message));
                console.log("Got RetObj!", retObj);
                console.log("Object "+this.mID+" maps to "+retObj.object_reference);
                spaceConn.objectID = retObj.object_reference;
                spaceConn.service.setObjectReference(spaceConn.objectID);
                this.mObjectHost.sendToSimulation({
                    msg: "ConnectedToSpace",
                    spaceid: header.source_space,
                    privid: this.mID,
                    id: retObj.object_reference
                });
                for (var queryid in spaceConn.proximity) {
                    this._sendNewProxQuery(spaceConn.proximity[queryid]);
                }
                break;
            case "ProxCall":
                var proxCall = new Sirikata.Protocol.ProxCall;
                proxCall.ParseFromStream(new PROTO.ByteArrayStream(message));
                var proximate_object = proxCall.proximate_object;
                if (proximate_object == spaceConn.objectID) {
                } else if (proxCall.proximity_event == Sirikata.Protocol.ProxCall.ProximityEvent.ENTERED_PROXIMITY) {
                    var obj = this.mObjects[proximate_object];
                    if (!obj) {
                        obj = new ProxyObject;
                        obj.askForProperties(this);
                        obj.askForPosition(this);
                    }
                    obj.mRequests[sourceObj.getID()].mRefCount++; // in case this object has multiple queries.
                    console.log("Entered:",proxCall.proximate_object);
                } else {
                    var obj = this.mObjects[proximate_object];
                    if (obj) {

                    }
                    console.log("Exited:",proxCall.proximate_object);
                }
                break;
            }
        }
    };
    Sirikata.HostedObject.prototype._parsePersistence = function (header, bodydata) {
        var body = new Sirikata.Persistence.Protocol.ReadWriteSet;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received Persistence from:");
        console.log(header);
        console.log("Body:");
        console.log(body);
    };
    Sirikata.HostedObject.prototype._parseBroadcast = function (header, bodydata) {
        var body = new Sirikata.Protocol.Broadcast;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received Broadcast from:");
        console.log(header);
        console.log("Body:");
        console.log(body);
    };

    Sirikata.HostedObject.prototype.sendMessage = function (header, body) {
        var destSpace = header.destination_space;
        var info = this.mSpaceConnectionMap[destSpace];
        if (!info) {
            Kata.error("Trying to send message to not-connected space "+destSpace);
        }
        header.destination_space = undefined;
        header.source_object = undefined;
        var b64stream = new PROTO.Base64Stream();
        header.SerializeToStream(b64stream);
        body.SerializeToStream(b64stream);
        info.stream.sendMessage(b64stream.getString());
    };

    Sirikata.HostedObject.prototype.receivedMessage = function (channel, data) {
        var header = new Sirikata.Protocol.Header;
        var info, spaceid;
        header.ParseFromStream(new PROTO.Base64Stream(data));
        for (spaceid in this.mSpaceConnectionMap) {
            info = this.mSpaceConnectionMap[spaceid];
            if (info.stream == channel) {
                header.source_space = spaceid;
                header.destination_object = info.objectID;
                break;
            }
        }
        console.log("Object "+this.mID+" got message on port "+header.destination_port, header, data);
        if (!header.destination_port) {
            this.mPortHandlers[0].call(this, header, data);
        } else if (header.destination_port in this.mPortHandlers) {
            this.mPortHandlers[channel].call(this, header, data);
        } else {
            SUPER.receivedMessage.call(this, header, data);
        }
    };
    Sirikata.HostedObject.prototype._sendNewProxQuery = function(data) {
        console.log("Sending NewProxQuery", data);
        if (data.spaceid && data.radius) {
            var prox = new Sirikata.Protocol.NewProxQuery;
            prox.query_id = data.id || 0;
            prox.max_radius = data.radius;
            prox.min_solid_angle = data.min_angle || 0;
            var body = new Sirikata.Protocol.MessageBody;
            body.message_names.push("NewProxQuery");
            body.message_arguments.push(prox);
            var header = new Sirikata.Protocol.Header;
            header.destination_object = [];
            header.destination_port = Ports.GEOM;
            header.destination_space = data.spaceid;
            this.sendMessage(header, body);
        } else {
            Kata.error("Not enough information to send new prox query", data);
        }
    };

    Sirikata.HostedObject.prototype.messageFromSimulation = function (channel, data) {
        switch (data.msg) {
        case "ConnectToSpace":
            if (data.spaceid) {
                console.log("Connecting "+this.mID+" to space "+data.spaceid);
                this.connectToSpace(data.spaceid.toLowerCase());
            }
            break;
        case "Proximity":
            if (data.spaceid) {
                data.id = data.id || 0;
                this.mSpaceConnectionMap[data.spaceid].proximity[data.id] = data;
                if (this.mSpaceConnectionMap[data.spaceid].objectID) {
                    this._sendNewProxQuery(data);
                }
            }
            break;
        }
    };

})();
