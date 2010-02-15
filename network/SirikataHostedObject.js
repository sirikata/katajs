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

    // public class SirikataHostedObject
    var SUPER = Kata.HostedObject.prototype;

    /** @constructor */
    Kata.SirikataHostedObject = function (objectHost, uuid) {
        SUPER.constructor.call(this, objectHost, uuid);
        this.portHandlers = {};
        this.portHandlers[Ports.RPC] = this._parseRPC;
        this.portHandlers[Ports.PERSISTENCE] = this._parsePersistence;
        this.portHandlers[Ports.BROADCAST] = this._parseBroadcast;

        this.spaceConnections = {};
    };

    Kata.extend(Kata.SirikataHostedObject, SUPER);

    Kata.SirikataHostedObject.prototype.connectToSpace = function (space) {
        var topLevelConnection = this.mObjectHost.connectToSpace(space);
        var substream = topLevelConnection.clone();
        substream.registerListener(this);
        this.spaceConnections[space] = {
            stream: substream,
            objectID: null
        };
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
            var serialized = new PROTO.ByteArrayStream;
            newObj.SerializeToStream(serialized);
            body.message_arguments.push(serialized.getArray());
            var header = new Sirikata.Protocol.Header;
            header.destination_object = [];
            header.destination_port = Ports.REGISTRATION;
            var b64stream = new PROTO.Base64Stream();
            header.SerializeToStream(b64stream);
            body.SerializeToStream(b64stream);
            substream.sendMessage(b64stream.getString());
        }
        return substream;
    };

    Kata.SirikataHostedObject.prototype._parseRPC = function (header, bodydata) {
        var body = new Sirikata.Protocol.MessageBody;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received RPC from:",header,"Body:",body);
        if (body.message_names[0]=="RetObj") {
            var retObj = new Sirikata.Protocol.RetObj;
            retObj.ParseFromStream(new PROTO.ByteArrayStream(body.message_arguments[0]));
            console.log("Got RetObj!", retObj);
            console.log("Object "+this.mID+" maps to "+retObj.object_reference);
            this.mObjectHost.sendToSimulation({
                msg: "ConnectedToSpace",
                spaceid: header.source_space,
                privid: this.mID,
                id: retObj.object_reference
            });
        }
    };
    Kata.SirikataHostedObject.prototype._parsePersistence = function (header, bodydata) {
        var body = new Sirikata.Persistence.Protocol.ReadWriteSet;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received Persistence from:");
        console.log(header);
        console.log("Body:");
        console.log(body);
    };
    Kata.SirikataHostedObject.prototype._parseBroadcast = function (header, bodydata) {
        var body = new Sirikata.Protocol.Broadcast;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        console.log("Received Broadcast from:");
        console.log(header);
        console.log("Body:");
        console.log(body);
    };

    Kata.SirikataHostedObject.prototype.sendMessage = function (header, body) {
        var destSpace = header.destination_space;
        var info = this.spaceConnections[destSpace];
        if (!info) {
            Kata.error("Trying to send message to not-connected space "+destSpace);
        }
        header.destination_space = undefined;
        header.source_object = undefined;
        var b64stream = new PROTO.Base64Stream();
        header.serializeToStream(b64stream);
        body.serializeToStream(b64stream);
        info.substream.sendMessage(b64stream.getString());
    };

    Kata.SirikataHostedObject.prototype.receivedMessage = function (channel, data) {
        var header = new Sirikata.Protocol.Header;
        var info, spaceid;
        header.ParseFromStream(new PROTO.Base64Stream(data));
        for (spaceid in this.spaceConnections) {
            info = this.spaceConnections[spaceid];
            if (info.substream == channel) {
                header.source_space = spaceid;
                header.destination_object = info.objectID;
                break;
            }
        }
        console.log("Object "+this.mID+" got message on port "+header.destination_port, header, data);
        if (!header.destination_port) {
            this.portHandlers[0].call(this, header, data);
        } else if (header.destination_port in this.portHandlers) {
            this.portHandlers[channel].call(this, header, data);
        } else {
            SUPER.receivedMessage.call(this, header, data);
        }
    };

    Kata.SirikataHostedObject.prototype.messageFromSimulation = function (channel, data) {
        if (data.msg == "ConnectToSpace") {
            if (data.spaceid) {
                console.log("Connecting "+this.mID+" to space "+data.spaceid);
                this.connectToSpace(data.spaceid.toLowerCase());
            }
        }
    };


})();
