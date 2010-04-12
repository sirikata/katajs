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

if (0) {
    // JSDoc hack
    /** Sirikata is for subclasses specific to the Sirikata protocol.
     * @constructor
     */
    Sirikata = function(){};
}
if (typeof Sirikata == "undefined") { Sirikata = {}; }

Kata.include("HostedObject.js");
Kata.include("sirikata/QueryTracker.js");
Kata.include("../externals/protojs/protobuf.js");
Kata.include("../externals/protojs/pbj.js");
Kata.include("sirikata/protocol/MessageHeader.pbj.js");
Kata.include("sirikata/protocol/Persistence.pbj.js");
Kata.include("sirikata/protocol/Sirikata.pbj.js");
Kata.include("sirikata/protocol/Subscription.pbj.js");

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

    var MIN_TTL = 1; // subscription messages.
    var SPACE_OBJECT = "";

    /**
     * Sends a persistence message and keeps receiving replies until all the
     * fields are known. Currently persisntece uses the QueryTracker protocol.
     * @param {Sirikata.QueryTracker} querytracker  The socket to send and
     *     receive persistence messages.
     * @param {Sirikata.QueryTracker.Message} message  A prepared message.
     *     Do not send the same message twice!
     * @param {function()} callback  A function to be called when all the
     *     fields are filled out. The outgoing message will get mutated, so the
     *     callback function takes no arguments.
     */
    function sendPersistenceMessage(querytracker, message, callback) {
        var sentBody = message.body();
        message.setCallback(function(respHeader, respBytes) {
            var respBody = new Sirikata.Persistence.Protocol.ReadWriteSet;
            respBody.ParseFromStream(new PROTO.Base64Stream(respBytes));
            var index = 0;
            //console.log("Got persistence message: "+respBody.reads.length,respBody);
            for (var i = 0; i < respBody.reads.length; i++) {
                if (respBody.reads[i].index !== undefined) {
                    index = respBody.reads[i].index;
                }
                if (index < sentBody.reads.length && index >= 0) {
                    if (respBody.reads[i].return_status !== undefined) {
                        sentBody.reads[index].return_status =
                            respBody.reads[i].return_status;
                    } else if (respBody.reads[i].data !== undefined) {
                        sentBody.reads[index].data = respBody.reads[i].data;
                        if (respBody.reads[i].subscription_id !== undefined) {
                            sentBody.reads[index].subscription_id =
                                respBody.reads[i].subscription_id;
                            sentBody.reads[index].ttl = respBody.reads[i].ttl;
                        }
                    } else {
                        console.log("Error: missing return_status in message!");
                    }
                }
                index++;
            }
            //console.log("Checking persistence message: "+sentBody.reads.length,sentBody);
            for (var i = 0; i < sentBody.reads.length; i++) {
                if (sentBody.reads[i].return_status === undefined &&
                    sentBody.reads[i].data === undefined) {
                    //console.log("Persistence reads missing: "+i);
                    //return true;
                }
            }
            callback();
            return false;
        });
        querytracker.send(message);
    }

    /**
     * A single object's view of a remote object (corresponds to a ProxCall
     *     from a proximity query). If multiple objects have separate proximity
     *     queries, each view of a remote object will have its own ProxyObject.
     * @constructor
     * @param {Sirikata.SstService} service  A service to allocate ports from.
     * @param {Kata.ObjectHost} objectHost  The owner objectHost (does this
     *     make sense?)
     * @param {string} space  The remote space UUID.
     * @param {string} id  The objectreference for this ProxyObject.
     */
    Sirikata.ProxyObject = function(service, controllingObject, space, id) {
        this.mControllingObject = controllingObject;
        this.mRequests = {};
        this.mSubscriptions = [];
        this.mRefCount = 0;
        this.mID = id;
        this.mSpace = space;
        this.mLocationPendingRequests=[];
        this.mQueryTracker = new Sirikata.QueryTracker(service.newPort());
        this.mBroadcastPort = service.newPort();
        this.mBroadcastPort.addReceiver(Kata.bind(this.receivedBroadcast, this));
        this.mBroadcastIds = {};
    };
    Sirikata.ProxyObject.prototype.sendToSimulation=function(message) {
      this.mControllingObject.mObjectHost.sendToSimulation(message);
      var channel=this.mControllingObject.mScriptChannel;
      if (channel){
          channel.sendMessage(message);
      }
    };
     
    /** Clean up this data, and destroy all pending requests/ports. */
    Sirikata.ProxyObject.prototype.destroy = function() {
        for (var propname in this.subscriptions) {
            var subinfo = this.subscriptions[propname];
            var subMsg = new Sirikata.Protocol.Broadcast;
            subMsg.object = this.mID;
            subMsg.broadcast_name = subscription.subid;
            // ommitted ttl = unsubscribe.
            var header = new Sirikata.Protocol.Header;
            header.destination_object = SPACE_OBJECT;
            header.destination_port = Ports.SUBSCRIPTION;
            var message = new Sirikata.QueryTracker.Message(header, msg);
            this.mQueryTracker.send(message);
            delete this.mQueryTracker;
            if (this.mLocationPendingRequests===undefined) {
                thus.sendToSimulation({msg:"Destroy",
                                       id:this.mID
                                      });
            }
            this.mDestroyed=true;
        }
    };
    Sirikata.ProxyObject.prototype.generateMessage = function(portnum,msg) {
        var header = new Sirikata.Protocol.Header;
        header.destination_object = this.mID;
        //header.destination_space = this.mSpace;
        header.destination_port = portnum;
        return new Sirikata.QueryTracker.Message(header, msg);
    };
    Sirikata.ProxyObject.prototype.subscribeToProperty = function(subid, ttl, func) {
        if (subid === undefined) {
            Kata.log("No subscription for property "+func);
            return;
        }
        if (!ttl || ttl < MIN_TTL) {
            ttl = MIN_TTL;
        }
        var subMsg = new Sirikata.Protocol.Broadcast;
        subMsg.object = this.mID;
        subMsg.broadcast_name = subid;
        subMsg.update_period = ttl;
        var header = new Sirikata.Protocol.Header;
        header.destination_object = SPACE_OBJECT;
        header.destination_port = Ports.BROADCAST;
        this.mBroadcastIds[subid] = func;
        this.mBroadcastPort.send(header, subMsg);
    };
    Sirikata.ProxyObject.prototype.receivedBroadcast = function(header, body) {
        var bcast = new Sirikata.Protocol.Broadcast;
        bcast.ParseFromStream(new PROTO.Base64Stream(body));
        if (bcast.data!==undefined && bcast.broadcast_name!==undefined) {
            var bfunc = this.mBroadcastIds[bcast.broadcast_name];
            bfunc.call(this, bcast.data);
        }
    };
    Sirikata.ProxyObject.prototype._setMeshScale = function(newdata) {
        var meshScale = new Sirikata.Protocol.Vector3fProperty;
        meshScale.ParseFromStream(new PROTO.ByteArrayStream(newdata));
        if (meshScale.value) {
            this.sendToSimulation({msg: "Move",
                                   id: this.mID,
                                   time: new Date().getTime(),
                                   scale: meshScale.value
                                  });
        }
    };
    Sirikata.ProxyObject.prototype._setMeshURI = function(newdata) {
        var meshURI=new Sirikata.Protocol.StringProperty;
        meshURI.ParseFromStream(new PROTO.ByteArrayStream(newdata));
        if (meshURI.value===undefined) {
            console.log("MeshURI Property parse failure",newdata);
        }else {
            //send item to graphics system
            this.sendToSimulation({msg:"Mesh",
                                   id:this.mID,
                                   mesh:meshURI.value
                                  });
        }
    };
    Sirikata.ProxyObject.prototype._setWebViewURL = function(newdata) {
        var meshURI=new Sirikata.Protocol.StringProperty;
        meshURI.ParseFromStream(new PROTO.ByteArrayStream(newdata));
        if (meshURI.value===undefined) {
            console.log("WebViewURL Property parse failure",newdata);
        }else {
            this.sendToSimulation({msg:"IFrame",
                                   id:this.mID,
                                   mesh:webURI.value
                                  });
        }
    };
    Sirikata.ProxyObject.prototype._setLightInfo = function(newdata) {
        var lightProp=new Sirikata.Protocol.LightInfoProperty;
        lightProp.ParseFromStream(new PROTO.ByteArrayStream(newdata));
        this.sendToSimulation({msg:"Light",
                               id:this.mID,
                               diffuse_color:lightProp.diffuse_color,
                               specular_color:lightProp.specular_color,
                               ambient_color:lightProp.ambient_color,
                               power:lightProp.power
                              });
    };
    Sirikata.ProxyObject.prototype._setPhysical = function(newdata) {
        
    };
    Sirikata.ProxyObject.prototype._setParent = function(newdata) {
        
    };
    Sirikata.ProxyObject.prototype._setCamera = function(newdata) {
        this.sendToSimulation({msg:"Camera",
                               id:this.mID
                              });
    };
    Sirikata.ProxyObject.prototype._setLocation = function(newdata) {
        var oloc = new Sirikata.Protocol.ObjLoc;
        oloc.ParseFromStream(new PROTO.ByteArrayStream(newdata));
        var movemsg = {msg: "Move",
                       id: this.mID,
                       time: oloc.timestamp||(new Date().getTime())};
        if (oloc.position) {
            movemsg.pos = oloc.position;
        }
        if (oloc.orientation) {
            movemsg.orient = oloc.orientation;
        }
        if (oloc.velocity) {
            movemsg.vel = oloc.velocity;
        }
        if (oloc.angular_speed || oloc.rotational_axis) {
            movemsg.rotvel = oloc.angular_speed;            
            movemsg.rotaxis = oloc.rotational_axis;
        }
        this.sendToSimulation(movemsg);
    };
    Sirikata.ProxyObject.prototype.askForProperties = function() {
        var sentBody = new Sirikata.Persistence.Protocol.ReadWriteSet;
        // check that MeshScale is capped at the object's bounding sphere.
        //sentBody.reads.push().field_name = "MeshScale"; // Now a LOC property called "Scale"
        sentBody.reads.push().field_name = "MeshURI";
        sentBody.reads.push().field_name = "WebViewURL";
        sentBody.reads.push().field_name = "LightInfo";
        sentBody.reads.push().field_name = "PhysicalParameters";
        sentBody.reads.push().field_name = "Parent";
        sentBody.reads.push().field_name = "IsCamera";
        //sentBody.reads.push().field_name = "Name";
        // Ports.LOC
        var message = this.generateMessage(Ports.PERSISTENCE, sentBody);
        var thus = this;
        sendPersistenceMessage(this.mQueryTracker, message, function() {
            var deferUntilPositionResponse=function() {
                var fields = {};
                for (var i = 0; i < sentBody.reads.length; i++) {
                    var read = sentBody.reads[i];
                    if (read.return_status === undefined && read.data !== undefined) {
                        var propname = read.field_name;
                        var propval = {data: read.data,
                             ttl: read.ttl,
                             subid: read.subscription_id};
                        fields[propname] = propval;
                    }
                }
                //console.log(fields);
                var type = 'node';
                if (fields["MeshURI"]) {//these are data coming from the network in PBJ string form, not fields in a js struct
                    type = 'mesh';
                } else if (fields["LightInfo"]) {
                    type = 'light';
                } else if (fields["IsCamera"]) {
                    type = 'camera';
                }
                if (fields["WebViewURL"]) { // && type != 'mesh') {
                    type = 'webview';
                }
                switch (type) {
                case 'mesh':{
                    var propval = fields["MeshURI"];
                    thus._setMeshURI(propval.data, true);
                    thus.subscribeToProperty(propval.subid, propval.ttl, this._setMeshURI);
                    /*
                    if (fields["MeshScale"]) {
                        propval = fields["MeshScale"];
                        thus._setMeshScale(propval.data);
                        thus.subscribeToProperty(propval.subid, propval.ttl, this._setMeshScale);
                    }
                    */
                }break;
                case 'light':{
                    var propval = fields["LightInfo"];
                    thus._setLightInfo(propval.data, true);
                    thus.subscribeToProperty(propval.subid, propval.ttl, this._setLightInfo);
                }break;
                case 'webview':{
                    var propval = fields["WebViewURL"];
                    thus._setWebViewURL(propval.data, true);
                    thus.subscribeToProperty(propval.subid, propval.ttl, this._setWebViewURL);
                }break;
                case 'camera':{
                    var propval = fields["IsCamera"];
                    thus._setCamera(propval.data, true);
                    thus.subscribeToProperty(propval.subid, propval.ttl, this._setCamera);
                }break;
                default:break;
                }
                if (fields["PhysicalParameters"]) {
                    var propval = fields["PhysicalParameters"];
                    thus._setPhysical(propval.data);
                    thus.subscribeToProperty(propval.subid, propval.ttl, this._setPhysical);
                }
                if (fields["Parent"]) {
                    var propval = fields["Parent"];
                    thus._setParent(propval.data);
                    thus.subscribeToProperty(propval.subid, propval.ttl, this._setParent);
                }
            };
            if (thus.mLocationPendingRequests!==undefined) {
                thus.mLocationPendingRequests.push(deferUntilPositionResponse);
            }else {
                deferUntilPositionResponse();
            }

        });
    };

    Sirikata.ProxyObject.prototype.askForPosition = function() {
        var sentBody = new Sirikata.Persistence.Protocol.ReadWriteSet;
        var object_reference=this.mID;
        var r;
        // check that MeshScale is capped at the object's bounding sphere.
        r = sentBody.reads.push();
        r.field_name = "Position";
        r.object_uuid = this.mID;
        r = sentBody.reads.push();
        r.field_name = "Orientation";
        r.object_uuid = this.mID;
        r = sentBody.reads.push();
        r.field_name = "Velocity";
        r.object_uuid = this.mID;
        r = sentBody.reads.push();
        r.field_name = "AngVel";
        r.object_uuid = this.mID;
        r = sentBody.reads.push();
        r.field_name = "Scale";
        r.object_uuid = this.mID;
        // Ports.LOC
        var header = new Sirikata.Protocol.Header;
        header.destination_object = SPACE_OBJECT;
        //header.destination_space = this.mSpace;
        header.destination_port = Ports.LOC;
        var message = new Sirikata.QueryTracker.Message(header, sentBody);
        var thus = this;
        sendPersistenceMessage(this.mQueryTracker, message, function() {
            if (network_debug) console.log("### Got LOC response for object "+object_reference, sentBody);
            if (!thus.mDestroyed) {
                var createMsg = {
                    msg: "Create",
                    id: object_reference,//private ID for gfx (we can narrow it)
                    time:new Date().getTime(),
                    pos:[0,0,0],
                    vel:[0,0,0],
                    orient:[1,0,0,0],
                    rotaxis:[1,0,0],
                    rotvel:0
                    };
                var subscriptions = [];
                for (var i = 0; i < sentBody.reads.length; i++) {
                    r = sentBody.reads[i];
                    if (!r.return_status) {
                        if (r.field_name == "Scale") {
                            var scaleprop = new Sirikata.Protocol.Vector3fProperty;
                            scaleprop.ParseFromStream(new PROTO.ByteArrayStream(r.data));
                            createMsg.scale = scaleprop.value;
                            if (r.subscription_id) {
                                thus.subscribeToProperty(r.subscription_id, r.ttl, thus._setMeshScale);
                            }
                        } else {
                            var objloc = new Sirikata.Protocol.ObjLoc;
                            objloc.ParseFromStream(new PROTO.ByteArrayStream(r.data));
                            if (r.field_name == "Position") {
                                createMsg.pos = objloc.position;
                                createMsg.time = objloc.timestamp; // FIXME: Each property has own timestamp
                            } else if (r.field_name == "Orientation") {
                                createMsg.orient = objloc.orientation;
                            } else if (r.field_name == "Velocity") {
                                createMsg.vel = objloc.velocity;
                            } else if (r.field_name == "AngVel") {
                                createMsg.rotaxis = objloc.rotational_axis;
                                createMsg.rotvel = objloc.angular_speed;
                            }
                            if (r.subscription_id) {
                                thus.subscribeToProperty(r.subscription_id, r.ttl, thus._setLocation);
                            }
                        }
                    }
                }
                thus.sendToSimulation(createMsg);
                var deferredLength=thus.mLocationPendingRequests.length;
                for (var index=0;index<deferredLength;index+=1) {
                    thus.mLocationPendingRequests[index]();
                }
                delete thus.mLocationPendingRequests;
            }
        });
    };


    // public class SirikataHostedObject
    var SUPER = Kata.HostedObject.prototype;

    /**
     * An object connected to any number of sirikata space servers. Because
     * this can be connected to more than one space, we have something called
     * a "presence" to indicate space specific to a single space connection,
     * such as position as well as some properties like "Parent".
     * @constructor
     * @extends Kata.HostedObject
     * @param {Kata.ObjectHost} objectHost  The owner ObjectHost.
     * @param {string} id  The id of this object, which is an arbitrary string.
     * @param {object} createMsg  The creation message, since it contains some
     *     relevant fields such as location information.
     */
    Sirikata.HostedObject = function (objectHost, id, createMsg) {
        SUPER.constructor.call(this, objectHost, id);
        this.mSpaceConnectionMap = {};
        this.mObjects = {};
        this.mProperties = {};
        this.mBroadcasts = {};
        this.mNextBroadcastId = 0;
        this.mScale = [1,1,1];
        this.mPosition = [0,0,0];
        this.mOrientation = [0,0,0,1];
        this.mVelocity = [0,0,0];
        this.mRotAxis = [0,0,1];
        this.mRotSpeed = 0;
        this.mParentObject = null;
        this.mBoundingSphere = null;
        this.mScriptChannel=null;
        this._parseMoveMessage(createMsg, true);
    };

    Kata.extend(Sirikata.HostedObject, SUPER);

    Sirikata.HostedObject.prototype._parseMoveMessage = function(msg, initialization) {
        var locMessage = new Sirikata.Persistence.Protocol.ReadWriteSet;
        if (msg.scale) {
            var w = locMessage.writes.push();
            var scaleX = msg.scale[0], scaleY = msg.scale[1], scaleZ = msg.scale[2];
            var meshScale = new Sirikata.Protocol.Vector3fProperty;
            meshScale.value = [scaleX, scaleY, scaleZ];
            w.data = meshScale;
            w.field_name = "Scale";
            this.setProperty("MeshScale", meshScale);
            //this.mBoundingSphere = Math.sqrt(scaleX*scaleX+scaleY*scaleY+scaleZ*scaleZ);
            this.mBoundingSphere = meshScale.value;
        }
        if (msg.pos) {
            var w = locMessage.writes.push();
            var oloc = new Sirikata.Protocol.ObjLoc;
            oloc.position = msg.pos;
            this.mPosition = msg.pos;
            w.data = oloc;
            w.field_name = "Position";
        }
        if (msg.vel) {
            var w = locMessage.writes.push();
            var oloc = new Sirikata.Protocol.ObjLoc;
            oloc.velocity = msg.vel;
            this.mVelocity = msg.vel;
            w.data = oloc;
            w.field_name = "Velocity";
        }
        if (msg.orient) {
            var w = locMessage.writes.push();
            var oloc = new Sirikata.Protocol.ObjLoc;
            oloc.orientation = msg.orient;
            this.mOrient = msg.orient;
            w.data = oloc;
            w.field_name = "Orientation";
        }
        if (msg.rotvel || msg.rotaxis) {
            var w = locMessage.writes.push();
            var oloc = new Sirikata.Protocol.ObjLoc;
            if (msg.rotvel) {
                oloc.angular_speed = msg.rotvel;
                this.mRotSpeed = msg.rotvel;
            }
            if (msg.rotaxis) {
                oloc.angular_speed = msg.rotvel;
                this.mRotAxis = msg.rotaxis;
            } else if (initialization) {
                this.mRotSpeed = 0;
            }
            w.data = oloc;
            w.field_name = "AngVel";
        }
        if (msg.parent) {
            this.mParentObject = msg.parent;
            if (msg.parent != null) {
                var parentProp = new Sirikata.Protocol.ParentProperty;
                parentProp.value = msg.parent;
                this.setProperty("Parent", msg.parent);
            } else {
                this.unsetProperty("Parent");
            }
        }
		if (!initialization) {
            var header = new Sirikata.Protocol.Header;
            header.destination_object = SPACE_OBJECT;
            header.destination_port = Ports.LOC;
            this.sendMessage(msg.spaceid, header, locMessage);
		}
        // attachment_point or parentbone not implemented
    };
    Sirikata.HostedObject.prototype.setProperty = function(propname, propval) {
        var byteArrStream = new PROTO.ByteArrayStream;
        propval.SerializeToStream(byteArrStream);
        this.mProperties[propname] = byteArrStream.getArray();
        if (this.mBroadcasts[propname] === undefined) {
            this.mBroadcasts[propname] = this.mNextBroadcastId++;
        }
        var bcastmsg = new Sirikata.Protocol.Broadcast;
        bcastmsg.broadcast_name = this.mBroadcasts[propname];
        bcastmsg.data = this.mProperties[propname];
        var header = new Sirikata.Protocol.Header;
        header.destination_object = SPACE_OBJECT;
        header.destination_port = Ports.BROADCAST;
        for (var spaceid in this.mSpaceConnectionMap) {
            this.sendMessage(spaceid, header, bcastmsg);
        }
    };
    Sirikata.HostedObject.prototype.unsetProperty = function(propname) {
        delete this.mProperties[propname];
        var bcastmsg = new Sirikata.Protocol.Broadcast;
        bcastmsg.broadcast_name = this.mBroadcasts[propname];
        // null bcastmsg.data means deleted.
        var header = new Sirikata.Protocol.Header;
        header.destination_object = SPACE_OBJECT;
        header.destination_port = Ports.BROADCAST;
        for (var spaceid in this.mSpaceConnectionMap) {
            this.sendMessage(spaceid, header, bcastmsg);
        }
    };

    Sirikata.HostedObject.prototype._fillObjLoc = function(loc) {
        // Takes ObjLoc message and fills out fields.
        loc.timestamp = PROTO.I64.fromNumber(new Date().getTime()*1000);
        loc.position = this.mPosition;
        loc.orientation = this.mOrientation;
        loc.velocity = this.mVelocity;
        loc.angular_velocity = this.mRotVel;
        loc.angular_speed = this.mRotSpeed;
    };

    Sirikata.HostedObject.prototype.connectToSpace = function (space) {
        var topLevelConnection = this.mObjectHost.connectToSpace(space);
        var substream = topLevelConnection.clone();
        var spaceconn = {
            objectID: null,
            proximity: {},
            service: null,
            rpcPort: null,
            queryTracker: null
        };
        this.mSpaceConnectionMap[space] = spaceconn;
        spaceconn.service = new Sirikata.SstService(substream, space);
        spaceconn.queryTracker = new Sirikata.QueryTracker(spaceconn.service.newPort());
        spaceconn.rpcPort = spaceconn.service.getPort(Ports.RPC);
        spaceconn.service.getPort(Ports.RPC).addReceiver(
            Kata.bind(this._parseRPC, this));
        spaceconn.service.getPort(Ports.PERSISTENCE).addReceiver(
            Kata.bind(this._parsePersistence, this));
        spaceconn.service.getPort(Ports.BROADCAST).addReceiver(
            Kata.bind(this._parseBroadcast, this));

        // send introductory NewObj message.
        {
            var body = new Sirikata.Protocol.MessageBody;
            body.message_names.push("NewObj");
            var newObj = new Sirikata.Protocol.NewObj;
            newObj.object_uuid_evidence = this.mID;
            newObj.bounding_sphere_scale = this.mBoundingSphere || [0,0,0];
            this._fillObjLoc(newObj.requested_object_loc);
            body.message_arguments.push(newObj);
            var header = new Sirikata.Protocol.Header;
            header.destination_port = Ports.REGISTRATION;
            header.destination_object = "";
            spaceconn.rpcPort.send(header,body);
        }
        return substream;
    };

    Sirikata.HostedObject.prototype._parseRPC = function (header, bodydata) {
        var body = new Sirikata.Protocol.MessageBody;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        if (network_debug) console.log("Received RPC from:",header,"Body:",body);
        var spaceConn = this.mSpaceConnectionMap[header.source_space];
        var message_name = '';
        var message = null;
        var outMsg = new Sirikata.Protocol.MessageBody;
        var sendReply = false;
        for (var i = 0; i < body.message_arguments.length; i++) {
            var addReply = false;
            if (body.message_names[i]) {
                message_name = body.message_names[i];
            }
            message = body.message_arguments[i];
            switch (message_name) {
            case "LocRequest":
                var objLoc = new Sirikata.Protocol.ObjLoc;
                this._fillObjLoc(objLoc);
                outMsg.message_arguments.push(objLoc);
                sendReply = addReply = true;
                break;
            case "RetObj":
                var retObj = new Sirikata.Protocol.RetObj;
                retObj.ParseFromStream(new PROTO.ByteArrayStream(message));
                if (network_debug) console.log("Got RetObj!", retObj);
                if (network_debug) console.log("Object "+this.mID+" maps to "+retObj.object_reference);
                spaceConn.objectID = retObj.object_reference;
                spaceConn.service.setObjectReference(spaceConn.objectID);
                if (this.mScriptChannel){
                    this.mScriptChannel.sendMessage({msg:"RetObj",spaceid:header.source_space,object_reference:retObj.object_reference,location:retObj.location,bounding_sphere:retObj.bounding_sphere_scale});   
                }
/*
                this.mObjectHost.sendToSimulation({
                    msg: "Create",
                    id: this.mID,//private ID for gfx (we can narrow it)
                    time:retObj.location.timestamp,
                    pos:retObj.location.position,
                    vel:retObj.location.velocity,
                    rotaxis:retObj.location.rotational_axis,
                    rotvel:retObj.location.angular_speed
                });
*/
                // FIXME: Send my own type, in addition to the "Create" message!!!
                for (var queryid in spaceConn.proximity) {
                    this._sendNewProxQuery(spaceConn.proximity[queryid]);
                }
                break;
            case "ProxCall":
                var proxCall = new Sirikata.Protocol.ProxCall;
                proxCall.ParseFromStream(new PROTO.ByteArrayStream(message));
                var proximate_object = proxCall.proximate_object;
                if (0 && proximate_object == spaceConn.objectID) {
                    //FIXME: Maybe also check for other objects on this same ObjectHost?
                } else if (proxCall.proximity_event == Sirikata.Protocol.ProxCall.ProximityEvent.ENTERED_PROXIMITY) {
                    var obj = this.mObjects[proximate_object];
                    if (!obj) {
                        obj = new Sirikata.ProxyObject(spaceConn.service, this, header.source_space, proximate_object);
                        obj.askForProperties();
                        obj.askForPosition();
                    }
                    obj.mRefCount++; // in case this object has multiple queries.
                    if (network_debug) console.log("Entered:",proxCall.proximate_object);
                } else {
                    var obj = this.mObjects[proximate_object];
                    if (obj) {
                        if(--obj.mRefCount==0) {
                            obj.destroy();
                            delete this.mObjects[proximate_object];
                        }
                    }
                    if (network_debug) console.log("Exited:",proxCall.proximate_object);
                }
                break;
            }
            if (!addReply) {
                outMsg.message_arguments.push([]);
            }
        }
        if (sendReply && header.id !== undefined) {
            header.reply_id = header.id;
            header.destination_object = header.source_object;
            header.destination_port = header.source_port;
            header.id = undefined;
            header.source_port = undefined;
            header.source_object = undefined;
            this.mSpaceConnectionMap[header.source_space].service.getPort(Ports.RPC)
                .send(header, outMsg);
        }
    };
    Sirikata.HostedObject.prototype._parsePersistence = function (header, bodydata) {
        var body = new Sirikata.Persistence.Protocol.ReadWriteSet;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        if (network_debug) console.log("Received Persistence from:",header,"Body:",body);
        var respBody = new Sirikata.Persistence.Protocol.Response;
        var returnNames = (body.options & Sirikata.Persistence.Protocol.ReadWriteSet
            .ReadWriteSetOptions.RETURN_READ_NAMES) != 0;
        for (var i = 0; i < body.reads.length; i++) {
            var fname = body.reads[i].field_name;
            var outRead = respBody.reads.push();
            if (body.reads[i].index) {
                outRead.index = body.reads[i].index;
            }
            if (this.mProperties[fname] !== undefined) {
                outRead.data = this.mProperties[fname];
                // ttl?
                outRead.subscription_id = this.mBroadcasts[fname];
            } else {
                outRead.return_status = "KEY_MISSING";
            }
            if (returnNames) {
                outRead.field_name = fname;
            }
        }
        header.reply_id = header.id;
        header.destination_object = header.source_object;
        header.destination_port = header.source_port;
        header.id = undefined;
        header.source_port = undefined;
        header.source_object = undefined;
        this.mSpaceConnectionMap[header.source_space].service.getPort(Ports.PERSISTENCE)
            .send(header, respBody);
    };
    Sirikata.HostedObject.prototype._parseBroadcast = function (header, bodydata) {
        var body = new Sirikata.Protocol.Broadcast;
        body.ParseFromStream(new PROTO.Base64Stream(bodydata));
        if (network_debug) console.log("Received Broadcast from:",header,"Body:",body);
    };

    Sirikata.HostedObject.prototype.sendMessage = function (destSpace, header, body) {
        var info = this.mSpaceConnectionMap[destSpace];
        if (!info) {
            Kata.error("Trying to send message to not-connected space "+destSpace);
        }
        info.rpcPort.send(header, body);
    };

    Sirikata.HostedObject.prototype._sendNewProxQuery = function(data) {
        if (data.spaceid && data.radius) {
            var prox = new Sirikata.Protocol.NewProxQuery;
            prox.query_id = data.query_id || 0;
            prox.max_radius = data.radius;
            prox.min_solid_angle = data.min_angle || 0;
            var body = new Sirikata.Protocol.MessageBody;
            body.message_names.push("NewProxQuery");
            body.message_arguments.push(prox);
            var header = new Sirikata.Protocol.Header;
            header.destination_object = SPACE_OBJECT;
            header.destination_port = Ports.GEOM;
            this.sendMessage(data.spaceid, header, body);
        } else {
            Kata.error("Not enough information to send new prox query", data);
        }
    };

    Sirikata.HostedObject.prototype.messageFromScript = function (channel, data) {
        return this.messageFromSimulation(channel,data);//probably want to just forward messages to space?
    };
    Sirikata.HostedObject.prototype.messageFromSimulation = function (channel, data) {
        switch (data.msg) {
        case "ConnectToSpace":
            if (data.spaceid) {
                if (network_debug) console.log("Connecting "+this.mID+" to space "+data.spaceid);
                this.connectToSpace(data.spaceid.toLowerCase());
            }
            break;
        case "DisconnectFromSpace":
            this.destroy(); //????
            break;
        case "Destroy":
            this.destroy(); //
            break;
        case "Move":
            this._parseMoveMessage(data,false);
            break;
        case "Create":
            this.mObjectHost.receivedMessage(channel,data);
            break;
        case "Script":
            var script=new Kata.WebWorker(data.script,data.method,data.args);
            this.mScriptChannel=script.getChannel();
            this.mScriptChannel.registerListener(
                Kata.bind(this.messageFromScript,this));
            script.go();
            break;
        case "Send":
            {
                var header=new Sirikata.Protocol.Header;
                header.source_object=data.source_object;
                header.destination_object=data.destination_object;
                header.source_space=data.space;
                header.destination_space=data.space;
                header.source_port=data.source_port;
                header.destination_port=data.destination_port;
                if (data.header.reply_id!==undefined)
                  header.reply_id=data.reply_id;  
                if (data.header.id!==undefined)
                  header.id=data.id;
                if(data.space in this.mSpaceConnectionMap) {
                    var spaceConn = this.mSpaceConnectionMap[data.space];
                    spaceConn.service.getPort(data.source_port).send(header,data.message);
                }
            }
            break;
        case "BindPort":
            {
                if (!this.mScirptPortFunction)
                    this.mScriptPortFunction=Kata.bind(this.mScriptChannel, this);
                if (!mScriptPorts[data.port]){
                    var spaceConn = this.mSpaceConnectionMap[data.space];
                    if (spaceConn)
                        spaceConn.service.getPort(data.port).addReceiver(this.mScriptPortFunction);
                }
            }
            break;
        case "UnbindPort":
            if (this.mScirptPortFunction) {
                var spaceConn = this.mSpaceConnectionMap[data.space];
                if (spaceConn)
                    spaceConn.service.getPort(data.port).addReceiver(this.mScriptPortFunction);                
            }
            break;
        case "Mesh":
            {
                var meshURI = new Sirikata.Protocol.StringProperty;
                meshURI.value = data.mesh;
                this.setProperty("MeshURI", meshURI);
                if (!this.mBoundingSphere) {
                    this._parseMoveMessage({scale: [1,1,1]},true);
                }
            }
            break;
        case "DestroyMesh":
            // Sirikata protocol does not support this.
            this.unsetProperty("MeshURI");
            break;
        case "Light":
            {
                var lightInfo = new Sirikata.Protocol.LightInfoProperty;
                //lightInfo.
                /*
  diffuse_color:[.25,.5,1],
  specular_color: [.2,1,.5],
  power=1.0: //exponent on the light
  ambient_color: [0,0,0],
  light_range: 1.0e5
  constant_falloff: 0.5,
  linear_falloff: 0.2,
  quadratic_falloff: 0.1,
  cone_inner_radians: 0,
  cone_outer_radians: 0,
  cone_falloff: 0.5,
  type: "POINT",//options include "SPOTLIGHT" or "DIRECTIONAL"
  casts_shadow: true
                 */
                this.setProperty("LightInfo", lightInfo);
            }
            break;
        case "DestroyLight":
            // Sirikata protocol does not support this after connecting to a space.
            this.unsetProperty("LightInfo");
            break;
        case "Camera":
            {
                var camProp = new Sirikata.Protocol.StringProperty;
                // Sirikata protocol does not support this after connecting to a space.
                this.setProperty("IsCamera",camProp);    
            }
            break;
        case "DestroyCamera":
            // Sirikata protocol does not support this after connecting to a space.
            this.unsetProperty("IsCamera");
            break;
        case "SetPhysical":
            {
                var physParams = new Sirikata.Protocol.PhysicalParameters;
                this.setProperty("PhysicalParameters", physParams);
            }
            break;
        case "Proximity":
            if (data.spaceid) {
                data.queryid = data.queryid || 0;
                this.mSpaceConnectionMap[data.spaceid].proximity[data.queryid] = data;
                if (this.mSpaceConnectionMap[data.spaceid].objectID) {
                    this._sendNewProxQuery(data);
                }
            }
            break;
        }
    };

})();
