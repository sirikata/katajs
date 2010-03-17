/*  Kata Javascript Network Layer
 *  ObjectHost.js
 *
 *  Copyright (c) 2010, Katalabs, Inc.
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
        RPC:0,
        REGISTRATION:1,
        LOC:2,
        GEOM:3,
        ROUTER:4,
        PERSISTENCE:5,
        PHYSICS:6,
        TIMESYNC:7,
        SUBSCRIPTION:9,
        BROADCAST:10
    };
    var SPACE_OBJECT = "";

    Sirikata.Loopback = function() {
        this.mObjects = {};
        this.mProxQueries = [];
    };
    Sirikata.Loopback.prototype.send = function (objectref, base64data) {
        var header = new Sirikata.Protocol.Header;
        var base64stream = new PROTO.Base64Stream(base64data);
        header.ParseFromStream(base64stream);
        header.source_object = objectref;
        //console.log("Sending to Sirikata Loopback:",header,base64data);
        var destobj = header.destination_object;
        if (destobj !== undefined) {
            if (this.mObjects[destobj]) {
                /* We are not able to determine the end of the header.
                 * Additionally, protojs does not hold onto unknown body fields.
                 * Since we don't know how to re-encode, we append source_object.
                 * This is not valid in the Sirikata protocol since C++ will stop
                 * parsing header fields. However, in javascript-only land it is fine.
                 */
                header = new Sirikata.Protocol.Header;
                header.source_object = objectref;
                header.SerializeToStream(base64stream);
                base64data = base64stream.getString();
                this.mObjects[destobj].callListeners(base64data);
            } else if (destobj.match(/[0-9a-fA-F]/g).length == destobj.match(/0/g).length) {
                this._spaceMessage(header, base64data);
            }
        }
    };
    Sirikata.Loopback.prototype._sendProxCall = function (proxquery, newobj, isentering) {
        var messageBody = new Sirikata.Protocol.MessageBody;
        messageBody.message_names.push("ProxCall");
        var proxCall = new Sirikata.Protocol.ProxCall;
        proxCall.query_id = proxquery.query_id;
        proxCall.proximate_object = newobj;
        proxCall.proximity_event = isentering?
            Sirikata.Protocol.ProxCall.ProximityEvent.ENTERED_PROXIMITY:
            Sirikata.Protocol.ProxCall.ProximityEvent.EXITED_PROXIMITY;
        messageBody.message_arguments.push(proxCall);
        var header = new Sirikata.Protocol.Header;
        header.destination_object = proxquery.object;
        header.destination_port = proxquery.port;
        var b64stream = new PROTO.Base64Stream;
        header.SerializeToStream(b64stream);
        messageBody.SerializeToStream(b64stream);
        this.send(SPACE_OBJECT,b64stream.getString());
    }
    Sirikata.Loopback.prototype._spaceMessage = function (header, base64data) {
        var dport = header.destination_port || Ports.RPC;
        switch (dport) {
        case Ports.SUBSCRIPTION:
            break;
        case Ports.LOC:
            break;
        case Ports.GEOM:
        case Ports.RPC:
        case Ports.REGISTRATION:
            {
                var messageBody = new Sirikata.Protocol.MessageBody;
                messageBody.ParseFromStream(new PROTO.Base64Stream(base64data));
                var outMsg = new Sirikata.Protocol.MessageBody;
                var sendReply = false;
                var messname;
                var argstream;
                for (var i = 0; i < messageBody.message_arguments.length; i++) {
                    var addReply = false;
                    messname = messageBody.message_names[i] || messname;
                    argstream = new PROTO.ByteArrayStream(messageBody.message_arguments[i]);
                    if (messname == "NewObj" && dport == Ports.REGISTRATION) {
                        var newObj = new Sirikata.Protocol.NewObj;
                        newObj.ParseFromStream(argstream);
                        var outRetObj = new Sirikata.Protocol.RetObj;
                        outRetObj.bounding_sphere = newObj.bounding_sphere;
                        outRetObj.location = newObj.requested_object_loc;
                        outRetObj.object_reference = header.source_object;
                        outMsg.message_names.push("RetObj");
                        outMsg.message_arguments.push(outRetObj);
                        for (var i = 0; i < this.mProxQueries.length; i++) {
                            this._sendProxCall(this.mProxQueries[i], header.source_object, true);
                        }
                        sendReply = addReply = true;
                    } else if (messname == "DelObj" && dport == Ports.REGISTRATION) {
                        delete this.mObjects[header.source_object];
                        for (var i = 0; i < this.mProxQueries.length; i++) {
                            if (this.mProxQueries[i].object == header.source_object) {
                                this.mProxQueries.splice(i,1);
                                i--;
                            } else {
                                this._sendProxCall(this.mProxQueries[i], header.source_object, false);
                            }
                        }
                        return;
                    } else if (messname == "NewProxQuery" && dport == Ports.GEOM) {
                        var npq = new Sirikata.Protocol.NewProxQuery;
                        npq.ParseFromStream(argstream);
                        var proxqueryoldlen = this.mProxQueries.length;
                        var newQuery = {
                            object: header.source_object,
                            port: header.source_port||0,
                            query_id: npq.query_id};
                        console.log("Adding prox query:",newQuery);
                        this.mProxQueries.push(newQuery);
                        for (var i = 0; i < proxqueryoldlen; i++) {
                            this._sendProxCall(newQuery, this.mProxQueries[i].object, true);
                        }
                    } else if (messname == "DelProxQuery" && dport == Ports.GEOM) {
                        var dpq = new Sirikata.Protocol.DelProxQuery;
                        dpq.ParseFromStream(argstream);
                        for (var i = 0; i < this.mProxQueries.length; i++) {
                            if (this.mProxQueries[i].object == header.source_object &&
                                this.mProxQueries[i].port == (header.source_port||0) &&
                                this.mProxQueries[i].query_id == dpq.query_id) {
                                this.mProxQueries.splice(i,1);
                                break;
                            }
                        }
                    }
                    console.log("Loopback space RPC message "+messname);
                    if (!addReply) {
                        outMsg.message_arguments.push([]);
                    }
                }
                if (sendReply) {
                    header.destination_object = header.source_object;
                    header.source_object = SPACE_OBJECT;
                    header.destination_port = header.source_port;
                    header.source_port = dport;
                    if (header.id !== undefined) {
                        header.reply_id = header.id;
                        header.id = undefined;
                    }
                    var outb64 = new PROTO.Base64Stream;
                    header.SerializeToStream(outb64);
                    outMsg.SerializeToStream(outb64);
                    this.send(SPACE_OBJECT,outb64.getString());
                }
            }
            break;
        }
    };
    Sirikata.Loopback.prototype.clone = function () {
        var objectref = Math.uuid().toLowerCase();
        this.mObjects[objectref] = new Sirikata.Loopback.Substream(this, objectref);
        return this.mObjects[objectref];
    };

    Sirikata.Loopback.Substream = function (tcpsst, objectReference) {
        this.mOwner = tcpsst;
        this.mWhich = objectReference;
        Kata.Channel.call(this);
    };
    Kata.extend(Sirikata.Loopback.Substream, Kata.Channel.prototype);

    Sirikata.Loopback.Substream.prototype.sendMessage = function (data) {
        this.mOwner.send(this.mWhich, data);
    };
    Sirikata.Loopback.Substream.prototype.getTopLevelStream = function () {
        return this.mOwner;
    };
    Sirikata.Loopback.Substream.prototype.close = function () {
    };

})();