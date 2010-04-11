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

Kata.include("sirikata/SirikataHostedObject.js");
Kata.include("Channel.js");
Kata.include("../Math.uuid.js");
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
Kata.include("sirikata/protocol/MessageHeader.pbj.js");
Kata.include("sirikata/protocol/Persistence.pbj.js");
Kata.include("sirikata/protocol/Sirikata.pbj.js");
Kata.include("sirikata/protocol/Subscription.pbj.js");

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
    var VELOCITY_SUBSCRIPTION = -2;
    var ORIENTATION_SUBSCRIPTION = -3;
    var ANGVEL_SUBSCRIPTION = -4;

    /**
     * Sirikata.Loopback is a simple top-level server connection that pretends
     * to be a remote server, but implements everything synchronously in
     * javascript.
     * @constructor
     * @implements {Kata.ObjectHost.TopLevelStream}
     */
    Sirikata.Loopback = function() {
        this.mObjects = {};
        this.mProxQueries = [];
        this.mSubscriptions = {};
    };
    /**
     * Send data via this space. It may synchronously call back to another
     * object on this object host, or broadcast a message to multiple objects.
     * @param {string} objectref  The sender objectreference (uuid)
     * @param {string} base64data  The fully encoded message (header+body)
     */
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
    /**
     * Send out a ProxCall message. Called in three cases:
     * <ul>
     * <li>Sent to all other proximity queries when an object enters.</li>
     * <li>Sent to all other proximity queries when an object exits.</li>
     * <li>Sent for each existing object to any new proximity subscribers.</li>
     * </ul>
     * @param {string} proxquery  A simple object holding proximity query info.
     * @param {string} newobj  The objectreference of the newly entered/exited
     *     object.
     * @param {boolean} isentering  If true, entered. If false, exited.
     * @private
     */
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
    /**
     * Send out a ProxCall message. Called in three cases:
     * <ul>
     * <li>Sent to all other proximity queries when an object enters.</li>
     * <li>Sent to all other proximity queries when an object exits.</li>
     * <li>Sent for each existing object to any new proximity subscribers.</li>
     * </ul>
     * @param {string} object  The source objectreference of the broadcast.
     * @param {number} fid  The field number to broadcast.
     * @param {Array.<number>} data  Encoded data to broadcast (byte array).
     * @private
     */
    Sirikata.Loopback.prototype._broadcast = function(object, fid, data) {
        var key = object+"_"+fid;
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
    /**
     * Subscribe somebody to the broadcast map.
     * @param {string} key  The broadcast key (owner+"_"+fid)
     * @param {string} subscriber  The objectreference of the subscriber.
     * @param {number} port  The port of the BROADCAST message.
     * @param {number} period  PBJ.duration amount between broadcasts (us).
     * @private
     */
    Sirikata.Loopback.prototype._subscribe = function(key, subscriber, port, period) {
        var bcastinfo = this.mSubscriptions[key];
        if (!bcastinfo) {
            this.mSubscriptions[key] = {};
            bcastinfo = this.mSubscriptions[key];
        }
        if (period !== undefined) {
            // Subscribe
            bcastinfo[subscriber+":"+port] = {
                subscriber:subscriber,
                port: port,
                update_period: period
            };
        } else if (bcastinfo) {
            // Unsubscribe
            delete bcastinfo[subscriber+":"+port];
        }
        if (!bcastinfo) {
            delete this.mSubscriptions[key];
        }
    };
    /**
     * Update some object's position in the space.
     * @param {string} object  The objectreference of the object that moved.
     * @param {Sirikata.Protocol.ObjLoc} oloc  New location information (only
     *     the assigned fields in the protobuf will be changed).
     * @param {boolean} dobroadcast  Usually true, except for initialization.
     * @private
     */
    Sirikata.Loopback.prototype._updateObjectPosition = function (object, oloc, dobroadcast) {
        var objToSet = this.mObjects[object];
        if (oloc.position !== undefined) {
            objToSet.mPos.position = oloc.position;
            objToSet.mPos.timestamp = oloc.timestamp || new Date;
            if (dobroadcast) {
                this._broadcast(object,POSITION_SUBSCRIPTION,objToSet.mPos);
            }
        }
        if (oloc.velocity !== undefined) {
            objToSet.mVel.velocity = oloc.velocity;
            objToSet.mVel.timestamp = oloc.timestamp || new Date;
            if (dobroadcast) {
                this._broadcast(object,VELOCITY_SUBSCRIPTION,objToSet.mVel);
            }
        }
        if (oloc.orientation !== undefined) {
            objToSet.mOrient.orientation = oloc.orientation;
            objToSet.mOrient.timestamp = oloc.timestamp || new Date;
            if (dobroadcast) {
                this._broadcast(object,ORIENTATION_SUBSCRIPTION,objToSet.mOrient);
            }
        }
        var setangspd = false;
        if (oloc.angular_speed !== undefined) {
            objToSet.mRot.angular_speed = oloc.angular_speed;
            if (objToSet.mRot.rotational_axis === undefined) {
                objToSet.mRot.rotational_axis = [1,0,0];
            }
            objToSet.mRot.timestamp = oloc.timestamp || new Date;
            setangspd = true;
        }
        if (oloc.rotational_axis !== undefined) {
            objToSet.mRot.rotational_axis = oloc.rotational_axis;
            objToSet.mRot.timestamp = oloc.timestamp || new Date;
            setangspd = true;
        }
        if (!(objToSet.mRot.angular_speed > 0)) {
            objToSet.mRot.angular_speed = 0;
            objToSet.mRot.rotational_axis = [1,0,0];
        }
        if (setangspd) {
            if (dobroadcast) {
                this._broadcast(object,ANGVEL_SUBSCRIPTION,bcastmsg.objToSet.mRot);
            }
        }
    };
    /**
     * Process a message destined for the space (object id 0).
     * @param {Sirikata.Protocol.Header} header  Header parsed from sender.
     * @param {string} base64data  Message from object to be parsed.
     */
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
                var key = object+"_"+fid;
                this._subscribe(key, subscriber, port, updateper);
            }
            break;
        case Ports.LOC:
            {
                var rws = new Sirikata.Persistence.Protocol.ReadWriteSet;
                rws.ParseFromStream(new PROTO.Base64Stream(base64data));
                var object = header.source_object;
                for (var i = 0; i < rws.writes.length; i++) {
                    var w = rws.writes[i];
                    if (w.field_name == "Position" || w.field_name == "Orientation" ||
                       w.field_name == "AngVel" || w.field_name == "Velocity") {
                        var oloc = new Sirikata.Protocol.ObjLoc;
                        oloc.ParseFromStream(new PROTO.ByteArrayStream(w.data));
                        this._updateObjectPosition(object, oloc, true);
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
                        ret.subscription_id = POSITION_SUBSCRIPTION;
                    } else if (r.field_name == "Orientation") {
                        oloc.orientation = thisObj.mOrient.orientation;
                        oloc.timestamp = thisObj.mOrient.timestamp;
                        ret.subscription_id = ORIENTATION_SUBSCRIPTION;
                    } else if (r.field_name == "AngVel") {
                        oloc.angular_speed = thisObj.mRot.angular_speed;
                        oloc.rotational_axis = thisObj.mRot.rotational_axis;
                        oloc.timestamp = thisObj.mRot.timestamp;
                        ret.subscription_id = ANGVEL_SUBSCRIPTION;
                    } else if (r.field_name == "Velocity" ) {
                        oloc.velocity = thisObj.mVel.velocity;
                        oloc.timestamp = thisObj.mVel.timestamp;
                        ret.subscription_id = VELOCITY_SUBSCRIPTION;
                    }
                    if (!oloc.IsInitialized()) {
                        ret.return_status = Sirikata.Persistence.Protocol.
                            StorageElement.ReturnStatus.KEY_MISSING;
                    } else {
                        ret.data = oloc;
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
                    retMsg.SerializeToStream(outb64);
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
                        var object = header.source_object;
                        var newObj = new Sirikata.Protocol.NewObj;
                        newObj.ParseFromStream(argstream);
                        this._updateObjectPosition(object, newObj.requested_object_loc, false);
                        var outRetObj = new Sirikata.Protocol.RetObj;
                        outRetObj.bounding_sphere = newObj.bounding_sphere;
                        outRetObj.location = newObj.requested_object_loc;
                        outRetObj.object_reference = object;
                        outMsg.message_names.push("RetObj");
                        outMsg.message_arguments.push(outRetObj);
                        for (var j = 0; j < this.mProxQueries.length; j++) {
                            this._sendProxCall(this.mProxQueries[j], object, true);
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
                        for (var objid in this.mObjects) {
                            this._sendProxCall(newQuery, objid, true);
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
    /**
     * @return {Sirikata.Loopback.Substream} A Substream to talk to this space.
     */
    Sirikata.Loopback.prototype.clone = function () {
        var objectref = Math.uuid().toLowerCase();
        this.mObjects[objectref] = new Sirikata.Loopback.Substream(this, objectref);
        return this.mObjects[objectref];
    };

    /**
     * The Substream represents a connection with some object. There is one
     * loopback space per object host, so the Loopback is the toplevel stream.
     * @param {Sirikata.Loopback} loopback  Pointer to controlling space.
     * @param {string} objectReference  ObjectReference of connection (not the
     *     same as the object_uuid_evidence).
     */
    Sirikata.Loopback.Substream = function (loopback, objectReference) {
        this.mOwner = loopback;
        this.mWhich = objectReference;
        this.mPos = new Sirikata.Protocol.ObjLoc;
        this.mPos.position = [0,0,0];
        this.mOrient = new Sirikata.Protocol.ObjLoc;
        this.mOrient.orientation = [0,0,0,1];
        this.mVel = new Sirikata.Protocol.ObjLoc;
        this.mVel.velocity = [0,0,0];
        this.mRot = new Sirikata.Protocol.ObjLoc;
        this.mRot.angular_speed = 0;
        this.mRot.rotational_axis = [1,0,0];
        Kata.Channel.call(this);
    };
    Kata.extend(Sirikata.Loopback.Substream, Kata.Channel.prototype);

    Sirikata.Loopback.Substream.prototype.sendMessage = function (data) {
        this.mOwner.send(this.mWhich, data);
    };
    /** @return {Sirikata.Loopback} Controlling space */
    Sirikata.Loopback.Substream.prototype.getTopLevelStream = function () {
        return this.mOwner;
    };
    Sirikata.Loopback.Substream.prototype.close = function () {
    };


    Kata.ObjectHost.sProtocols["skloop"] = {
        name: "skloop",
        default_port: 0,
        protocol_class: Sirikata.Loopback,
        object_class: Sirikata.HostedObject
    };


})();