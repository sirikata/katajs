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
        BROADCAST:10
    };
    var SPACE_OBJECT = "";

    var POSITION_SUBSCRIPTION = -1;
    var VELOCITY_SUBSCRIPTION = -1;
    var ORIENTATION_SUBSCRIPTION = -1;
    var ANGVEL_SUBSCRIPTION = -1;

    Sirikata.Loopback = function() {
        this.mObjects = {};
        this.mProxQueries = [];
        this.mBroadcasts = {};
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
    };
    Sirikata.Loopback.prototype._broadcast = function(object, fid, data) {
        var key = this._broadcastkey[object+"_"+fid];
        var bcastinfo = this.mSubscriptions[key];
        var msg = new Sirikata.Protocol.Broadcast;
        msg.data = data;
        msg.object = object;
        msg.broadcast_name = fid;
        var header = new Sirikata.Protocol.Header;
        header.source_object = SPACE_OBJECT;
        header.source_port = Ports.BROADCAST;
        if (bcastinfo) {
            for (var subscriber in bcastinfo) {
                var subinfo = bcastinfo[subscriber];
                header.destination_port = subinfo.port;
                header.destination_object = subinfo.subscriber;
                var outb64 = new PROTO.Base64Stream;
                header.SerializeToStream(outb64);
                msg.SerializeToStream(outb64);
                this.send(SPACE_OBJECT,outb64.getString());
            }
        }
    };
    Sirikata.Loopback.prototype._subscribe = function(key, subscriber, port, period) {
        var bcastinfo = this.mSubscriptions[key];
        if (period !== undefined) {
            // Subscribe
            bcastinfo.subscribers[subscriber+":"+port] = {
                subscriber:subscriber,
                port: port,
                update_period: period
            };
        } else {
            // Unsubscribe
            delete bcastinfo.subscribers[subscriber+":"+port];
        }
    };
    Sirikata.Loopback.prototype._spaceMessage = function (header, base64data) {
        var dport = header.destination_port || Ports.RPC;
        switch (dport) {
        case Ports.BROADCAST:
            var bcastmsg = new Sirikata.Protocol.Broadcast;
            bcastmsg.ParseFromStream(new PROTO.Base64Stream(base64data));
            var fid = bcastmsg.broadcast_name;
            if (bcastmsg.data !== undefined) {
                // Broadcast message
                var object = header.source_object;

                if (fid > 0 || !object) {
                    if (!object) {
                        object = bcastmsg.object;
                    }
                    this._broadcast(object,fid,bcastmsg.data);
                }
            } else {
                // Subscription message
                var subscriber = header.source_object;
                var port = header.source_port;
                var object = bcastmsg.object;
                var updateper = bcastmsg.update_period;
                var key = this._broadcastkey[object+"_"+fid];
                this._subscribe(key, subscriber, port, updateper);
            }
            break;
        case Ports.LOC:
            {
                var rws = new Sirikata.Persistence.Protocol.ReadWriteSet;
                var object = header.source_object;
                for (var i = 0; i < rws.writes.length; i++) {
                    var w = rws.writes[i];
                    if (w.field_name == "Position" || w.field_name == "Orientation" ||
                       w.field_name == "AngVel" || w.field_name == "Velocity") {
                        var oloc = new Sirikata.Protocol.ObjLoc;
                        oloc.ParseFromStream(new ByteArrayStream(w.data));
                        var objToSet = this.mObjects[object];
                        if (oloc.position !== undefined) {
                            objToSet.mPos.position = oloc.position;
                            objToSet.mPos.timestamp = oloc.timestamp || new Date;
                            this._broadcast(object,POSITION_SUBSCRIPTION,bcastmsg.objToSet.mPos);
                        }
                        if (oloc.velocity !== undefined) {
                            objToSet.mVel.velocity = oloc.velocity;
                            objToSet.mVel.timestamp = oloc.timestamp || new Date;
                            this._broadcast(object,VELOCITY_SUBSCRIPTION,bcastmsg.objToSet.mVel);
                        }
                        if (oloc.orientation !== undefined) {
                            objToSet.mOrient.orientation = oloc.orientation;
                            objToSet.mOrient.timestamp = oloc.timestamp || new Date;
                            this._broadcast(object,ORIENTATION_SUBSCRIPTION,bcastmsg.objToSet.mOrient);
                        }
                        var setangspd = false;
                        if (oloc.angular_speed !== undefined) {
                            objToSet.mRot.angular_speed = oloc.angular_speed;
                            if (objToSet.mRot.axis_of_rotation === undefined) {
                                objToSet.mRot.axis_of_rotation = [1,0,0];
                            }
                            objToSet.mRot.timestamp = oloc.timestamp || new Date;
                            setangspd = true;
                        }
                        if (oloc.axis_of_rotation !== undefined) {
                            objToSet.mRot.axis_of_rotation = oloc.axis_of_rotation;
                            objToSet.mRot.timestamp = oloc.timestamp || new Date;
                            setangspd = true;
                        }
                        if (!(objToSet.mRot.angular_speed > 0)) {
                            objToSet.mRot.angular_speed = 0;
                            objToSet.mRot.axis_of_rotation = [1,0,0];
                        }
                        if (setangspd) {
                            this._broadcast(object,ANGVEL_SUBSCRIPTION,bcastmsg.objToSet.mRot);
                        }
                    }
                }
                var retMsg = new Sirikata.Persistence.Protocol.Response;
                for (var i = 0; i < rws.reads.length; i++) {
                    var r = rws.reads[i];
                    var ret = retMsg.reads.push();
                    var oloc = new Sirikata.Protocol.ObjLoc;
                    var thisObj = this.mObjects[r.object || header.source_object];
                    if (r.field_name == "Position") {
                        oloc.position = thisObj.mPos.position;
                        oloc.timestamp = thisObj.mPos.timestamp;
                        ret.subscription_name = POSITION_SUBSCRIPTION;
                    } else if (r.field_name == "Orientation") {
                        oloc.orientation = thisObj.mOrient.orientation;
                        oloc.timestamp = thisObj.mOrient.timestamp;
                        ret.subscription_name = ORIENTATION_SUBSCRIPTION;
                    } else if (r.field_name == "AngVel") {
                        oloc.angular_speed = thisObj.mRot.angular_speed;
                        oloc.axis_of_rotation = thisObj.mRot.axis_of_rotation;
                        oloc.timestamp = thisObj.mRot.timestamp;
                        ret.subscription_name = ANGVEL_SUBSCRIPTION;
                    } else if (r.field_name == "Velocity" ) {
                        oloc.velocity = thisObj.mVel.velocity;
                        oloc.timestamp = thisObj.mVel.timestamp;
                        ret.subscription_name = VELOCITY_SUBSCRIPTION;
                    }
                    if (oloc.IsInitialized()) {
                        ret.data = oloc;
                    } else {
                        ret.return_status = Sirikata.Persistence.Protocol.
                            StorageElement.ReturnStatus.KEY_MISSING;
                    }
                }
                if (retMsg.reads.length) {
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
                        this.mObjects[header.source_object].mLoc = newObj.requested_object_loc;
                        var outRetObj = new Sirikata.Protocol.RetObj;
                        outRetObj.bounding_sphere = newObj.bounding_sphere;
                        outRetObj.location = newObj.requested_object_loc;
                        outRetObj.object_reference = header.source_object;
                        outMsg.message_names.push("RetObj");
                        outMsg.message_arguments.push(outRetObj);
                        for (var j = 0; j < this.mProxQueries.length; j++) {
                            this._sendProxCall(this.mProxQueries[j], header.source_object, true);
                        }
                        sendReply = addReply = true;
                    } else if (messname == "DelObj" && dport == Ports.REGISTRATION) {
                        delete this.mObjects[header.source_object];
                        for (var j = 0; j < this.mProxQueries.length; j++) {
                            if (this.mProxQueries[j].object == header.source_object) {
                                this.mProxQueries.splice(j,1);
                                i--;
                            } else {
                                this._sendProxCall(this.mProxQueries[j], header.source_object, false);
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
                        for (var j = 0; j < proxqueryoldlen; j++) {
                            this._sendProxCall(newQuery, this.mProxQueries[j].object, true);
                        }
                    } else if (messname == "DelProxQuery" && dport == Ports.GEOM) {
                        var dpq = new Sirikata.Protocol.DelProxQuery;
                        dpq.ParseFromStream(argstream);
                        for (var j = 0; j < this.mProxQueries.length; j++) {
                            if (this.mProxQueries[j].object == header.source_object &&
                                this.mProxQueries[j].port == (header.source_port||0) &&
                                this.mProxQueries[j].query_id == dpq.query_id) {
                                this.mProxQueries.splice(j,1);
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
        this.mPos = new Sirikata.Protocol.ObjLoc;
        this.mOrient = new Sirikata.Protocol.ObjLoc;
        this.mVel = new Sirikata.Protocol.ObjLoc;
        this.mRot = new Sirikata.Protocol.ObjLoc;
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