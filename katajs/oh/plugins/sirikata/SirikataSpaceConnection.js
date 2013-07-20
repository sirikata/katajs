/*  KataJS
 *  SirikataSpaceConnection.js
 *
 *  Copyright (c) 2010, Ewen Cheslack-Postava
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
"use strict";

Kata.require([
    'katajs/oh/SpaceConnection.js',
    'katajs/oh/SessionManager.js',
    'katajs/network/TCPSST.js',
    'katajs/core/Quaternion.js',
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/AggregateBoundingInfo.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/TimedMotionVector.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/TimedMotionQuaternion.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/Session.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/ObjectMessage.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/Prox.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/Loc.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/Frame.pbj.js'],
    'katajs/oh/sst/SSTImpl.js',
    'katajs/oh/plugins/sirikata/Frame.js',
    'katajs/oh/plugins/sirikata/Sync.js',
    'katajs/core/FilterChannel.js',
    'katajs/core/MessageDispatcher.js',
    'katajs/oh/Presence.js',
    'katajs/core/URL.js',
    'katajs/oh/impl/ScriptProtocol.js'
], function() {
    Kata.testRecovery=false;
    var SUPER = Kata.SpaceConnection.prototype;
    /** Kata.SirikataSpaceConnection is an implementation of
     * Kata.SpaceConnection which connects to a local space server,
     * i.e. one running in a WebWorker in the same browser.
     *
     * @constructor
     * @param {Kata.SessionManager} parent the parent
     * SessionManager that owns this connection
     * @param {Kata.URL} spaceurl URL of the space to connect to
     */
    Kata.SirikataSpaceConnection = function (parent, spaceurl, auth) {
        SUPER.constructor.call(this, parent);
        this.mRecovered=false;
        this.mAuth = auth;
        this.mSpaceURL = spaceurl;

        // OH ID (which may not be a UUID) -> UUID for identifying object w/ space
        this.mObjectUUIDs = {};
        this.mLocalIDs = {};

        // Track outstanding connect request info so we can provide it
        // back if we get the OK from the space server
        this.mOutstandingConnectRequests = {};

        // Track information about active connections
        this.mConnectedObjects = {};

        //var port = 9998;
        var port = 7777;
        if (Kata.URL.port(spaceurl))
            port = Kata.URL.port(spaceurl);
        this.mDisconnected=false;
        this.mSocket = new Kata.TCPSST(Kata.URL.host(spaceurl), port);
        this.mPrimarySubstream = this.mSocket.clone();
        this.mPrimarySubstream.registerListener(
            Kata.bind(this._receivedData, this)
        );

        this.mODPHandlers = {};
        this.mIncompleteLocationData = {};
        // Time sync -- this needs to be updated to use the Sirikata sync protocol.
        this.mSync = new Kata.Sirikata.SyncClient(
            this,
            new Kata.ODP.Endpoint(this.mSpaceURL, Kata.ObjectID.nil(), this.Ports.TimeSync),
            new Kata.ODP.Endpoint(this.mSpaceURL, Kata.ObjectID.nil(), this.Ports.TimeSync)
        );
        
    };
    Kata.extend(Kata.SirikataSpaceConnection, Kata.SpaceConnection.prototype);

    Kata.SirikataSpaceConnection.prototype.Ports = {
        Session : 1,
        Proximity : 2,
        Location : 3,
        TimeSync : 4,
        Space : 253
    };

    Kata.SirikataSpaceConnection.prototype.ObjectMessageRouter = function(parent_spaceconn) {
        this.mParentSpaceConn = parent_spaceconn;
    };

    Kata.SirikataSpaceConnection.prototype.ObjectMessageRouter.prototype.route = function(msg) {
        this.mParentSpaceConn._sendPreparedODPMessage(msg);
    };

    Kata.SirikataSpaceConnection.prototype._getObjectID = function(id) {
        if (!this.mObjectUUIDs[id]) {
            this.mObjectUUIDs[id] = Math.uuid();
            this.mLocalIDs[ this.mObjectUUIDs[id] ] = id;
        }
        return this.mObjectUUIDs[id];
    };
    Kata.SirikataSpaceConnection.prototype._getLocalID = function(objid) {
        return this.mLocalIDs[objid];
    };


    // Time related helpers
    Kata.SirikataSpaceConnection.prototype._toLocalTime = function(t) {
        if (t instanceof Date)
            return new Date(t.getTime() - this.mSync.offset());
        else
            return new Date(t - this.mSync.offset());
    };
    Kata.SirikataSpaceConnection.prototype._toSpaceTime = function(t) {
        if (t instanceof Date)
            return new Date(t.getTime() + this.mSync.offset());
        else
            return new Date(t + this.mSync.offset());
    };



    Kata.SirikataSpaceConnection.prototype._serializeMessage = function(msg) {
        var serialized = new PROTO.ByteArrayStream();
        msg.SerializeToStream(serialized);
        return serialized;
    };
    Kata.SirikataSpaceConnection.prototype._generateLocUpdatePartsFromConnectMessage = function(connect_msg, with_defaults) { 
        var retval = this._generateLocUpdateParts(connect_msg.loc_bounds,with_defaults);
        if (connect_msg.visual||!retval.visual) {
            retval.visual = connect_msg.visual;
        }
        return retval;
    };
    // Helper method to generate the parts of a loc update message
    // from a location object. Returns object with fields (loc, orient, bounds, visual)
    Kata.SirikataSpaceConnection.prototype._generateLocUpdateParts = function(loc, with_defaults) {
        var result = with_defaults ?
            {
                loc: undefined,
                orient: undefined,
                bounds: [0, 0, 0, 1],
                visual: ""
            } :
            {
                loc: undefined,
                orient: undefined,
                bounds: undefined,
                visual: undefined
            };


        if (loc.pos || loc.vel) {
            var pos = new Sirikata.Protocol.TimedMotionVector();
            pos.t = this._toSpaceTime(loc.posTime?loc.posTime:loc.time);
            if (loc.pos)
                pos.position = loc.pos;
            if (loc.vel)
                pos.velocity = loc.vel;
            result.loc = pos;
        }

        if (loc.orient || (loc.rotvel != undefined && loc.rotaxis != undefined)) {
            var orient = new Sirikata.Protocol.TimedMotionQuaternion();
            orient.t = this._toSpaceTime(loc.orientTime?loc.orientTime:loc.time);
            if (loc.orient)
                orient.position = loc.orient;
            if (loc.rotvel != undefined && loc.rotaxis != undefined)
                orient.velocity = Kata.Quaternion.fromAxisAngle(loc.rotaxis, loc.rotvel).array(); // FIXME angular velocity
            result.orient = orient;
        }

        if (loc.scale) {
            if (loc.scale.length === undefined) { // single number
                result.bounds = [0, 0, 0, loc.scale];
                console.log("IMPROPER BOUNDS: number");
            }
            else if (loc.scale.length == 3) {
                // FIXME how to deal with differing values?
                result.bounds = [0, 0, 0, loc.scale[0]];
                Kata.warn("IMPROPER BOUNDS LENGTH");
            }
            else if (loc.scale.length == 4) {
                result.bounds = loc.scale;
            }
        }

        if (loc.visual)
            result.visual = loc.visual;

        return result;
    };
    function serializeConnect(connect_msg) {
        var retval="v:";
        retval+=connect_msg.version;
        retval+=" type: "+connect_msg.type;
        retval+=" object: "+connect_msg.object;
        if (connect_msg.loc) {
            retval+=" loc: "+connect_msg.loc.position;            
            retval+=" loct: "+connect_msg.loc.t;            
            retval+=" vel: "+connect_msg.loc.velocity;

        }
        if (connect_msg.orientation) {
            retval+=" o: "+connect_msg.orientation.position;            
            retval+=" ot: "+connect_msg.orientation.t;            
            retval+=" ov: "+connect_msg.orientation.velocity;

        }
        retval+=" bounds: "+connect_msg.loc.bounds;
        retval+=" angle: "+connect_msg.query_angle;
        retval+=" max: "+connect_msg.query_max_count;
        retval+=" qp: "+connect_msg.query_parameters;
        retval+=" msh: "+connect_msg.mesh;
        retval+=" phy: "+connect_msg.physics;
        retval+=" oh: "+connect_msg.oh_name;
        retval+=" z: "+connect_msg.zernike;
        return retval;
    }
    Kata.SirikataSpaceConnection.prototype._sendOutstandingConnectRequest=function(objid,outstandingConnectRequest) {

        var connect_msg = new Sirikata.Protocol.Session.Connect();

        connect_msg.type = Sirikata.Protocol.Session.Connect.ConnectionType.Fresh;
        connect_msg.object = objid;

        if (outstandingConnectRequest.auth) {
            if (typeof(outstandingConnectRequest.auth) == "string")
                connect_msg.auth = PROTO.encodeUTF8(outstandingConnectRequest.auth);
            else
                connect_msg.auth = outstandingConnectRequest.auth;
        }

        var loc_parts = this._generateLocUpdatePartsFromConnectMessage(outstandingConnectRequest, true);
        var query = outstandingConnectRequest.query_angle;
        if (loc_parts.loc)
            connect_msg.loc = loc_parts.loc;
        if (loc_parts.orient)
            connect_msg.orientation = loc_parts.orient;
        if (loc_parts.bounds)
            connect_msg.bounds = loc_parts.bounds;
        if (loc_parts.visual)
            connect_msg.mesh = loc_parts.visual;
        if (outstandingConnectRequest.query_angle!==undefined) {
            connect_msg.query_angle = outstandingConnectRequest.query_angle;
        }

        var session_msg = new Sirikata.Protocol.Session.Container();
        console.log("ICONNECTING WITH "+serializeConnect(connect_msg));
        session_msg.connect = connect_msg;

        this._sendODPMessage(
            objid, this.Ports.Session,
            Kata.ObjectID.nil(), this.Ports.Session,
            this._serializeMessage(session_msg)
        );
        
    };

    Kata.SirikataSpaceConnection.prototype.connectObject = function(id, auth, loc, vis, query) {
        var objid = this._getObjectID(id);
        var resetTime=false;
        if (loc.posTime===undefined&&loc.time === undefined) {
            loc.time=Date.now();
            resetTime=true;
        }
        var reqloc = Kata.LocationIdentity(loc.posTime === undefined?loc.time:loc.posTime);
        Kata.LocationCopyUnifyTime(loc, reqloc);
/*
        if (resetTime) {

            delete loc.time;
            delete reqloc.time;
            if (reqloc.posTime!==undefined)
                delete reqloc.posTime;                
            if (reqloc.orientTime!==undefined)
                delete reqloc.orientTime;                
            if (reqloc.scaleTime!==undefined)
                delete reqloc.scaleTime;                
        }
*/
        reqloc.visual = loc.visual;

        this.mOutstandingConnectRequests[objid] =
            {
                auth : auth,
                loc_bounds : reqloc,
                visual : vis,
                reset_time : resetTime,
                deferred_odp : []
            };
        if (query>0.0&&query!=true&&query) {
            this.mOutstandingConnectRequests[objid].query_angle = query;
        }else if (query) {
            this.mOutstandingConnectRequests[objid].query_angle = 0.00000000000000000000000001;
        }
        this._sendOutstandingConnectRequest(objid,this.mOutstandingConnectRequests[objid]);
        //Kata.warn("Connecting " + id + " == " + objid);

    };

    Kata.SirikataSpaceConnection.prototype.disconnectObject = function(id) {
        //var objid = this._getObjectID(id);

        var disconnect_msg = new Sirikata.Protocol.Session.Disconnect();
        disconnect_msg.object = id;
        disconnect_msg.reason = "Quit";

        var session_msg = new Sirikata.Protocol.Session.Container();
        session_msg.disconnect = disconnect_msg;

        this._sendODPMessage(
            id, this.Ports.Session,
            Kata.ObjectID.nil(), this.Ports.Session,
            this._serializeMessage(session_msg)
        );
    };

    Kata.SirikataSpaceConnection.prototype.sendODPMessage = function(src, src_port, dest, dest_port, payload) {
        // ODP interface will likely change, underlying _sendODPMessage probably won't
        this._sendODPMessage(src, src_port, dest, dest_port, payload);
    };

    Kata.SirikataSpaceConnection.prototype._sendODPMessage = function(src, src_port, dest, dest_port, payload) {
        var odp_msg = new Sirikata.Protocol.Object.ObjectMessage();
        odp_msg.source_object = src;
        odp_msg.source_port = src_port;
        odp_msg.dest_object = dest;
        odp_msg.dest_port = dest_port;
        odp_msg.unique = PROTO.I64.fromNumber(0);
        if (typeof(payload) !== "undefined") {
            if (typeof(payload.length) === "undefined" || payload.length > 0) {
                if (typeof(payload) == "string")
                    odp_msg.payload = PROTO.encodeUTF8(payload);
                else
                    odp_msg.payload = payload;
            }
        }

        this._sendPreparedODPMessage(odp_msg);
    };

    Kata.SirikataSpaceConnection.prototype._sendPreparedODPMessage = function(odp_msg) {
        var serialized = new PROTO.ArrayBufferStream();
        odp_msg.SerializeToStream(serialized);

        this.mPrimarySubstream.sendMessage( serialized.getUint8Array() );
    };

    Kata.SirikataSpaceConnection.prototype._handleDisconnected = function(substream) {
        // We only have the one substream currently, it had better be the right one
        if (substream !== this.mPrimarySubstream) return;
        this.mDisconnected=true;
         var objid;
        // All objects connected through us get disconnected
        for(objid in this.mConnectedObjects) {
            this.mParent.disconnected(objid, this.mSpaceURL);
        }
        // All objects *trying* to connect get rejected
        for(objid in this.mOutstandingConnectRequests) {
            var id = this._getLocalID(objid);
            this.mParent.connectionResponse(
                id, false,
                {space : this.mSpaceURL, object : objid},
                {
                    msg: "Couldn't connect to space server."
                }
            );
        }
        this.mParent.spaceConnectionDisconnected(this);
    };

    Kata.SirikataSpaceConnection.prototype._receivedData = function(substream, data) {
        if (data === undefined || data === null) {
            this._handleDisconnected(substream);
            return;
        }
        if (this.mDisconnected) {
            Kata.log("Barely avoided error");
            return;//ignore any packets after this guy has been disconnected
        }
        var odp_msg = new Sirikata.Protocol.Object.ObjectMessage();
        odp_msg.ParseFromStream(new PROTO.Uint8ArrayStream(data));

        // Special case: Session messages
        if (odp_msg.source_object == Kata.ObjectID.nil() && odp_msg.dest_port == this.Ports.Session) {
            this._handleSessionMessage(odp_msg);
            return;
        }

        // Always try our shortcut handlers
        var shortcut_handler = this.mODPHandlers[odp_msg.dest_object + odp_msg.dest_port];
        if (shortcut_handler) {
            shortcut_handler(
                this.mSpaceURL,
                odp_msg.source_object, odp_msg.source_port,
                odp_msg.dest_object, odp_msg.dest_port,
                odp_msg.payload
            );
            return;
        }

        var dest_obj_data = this.mConnectedObjects[odp_msg.dest_object];
        if (dest_obj_data) {
            var sst_handled = dest_obj_data.odpDispatcher.dispatchMessage(odp_msg);
            if (!sst_handled) {
                this._tryDeliverODP(odp_msg);
            }
        }
    };

    /** Register to receive ODP messages from this connection. Use sparingly. */
    Kata.SirikataSpaceConnection.prototype._receiveODPMessage = function(dest, dest_port, cb) {
        this.mODPHandlers[dest + dest_port] = cb;
    };

    // Because we might get ODP messages before we've got the
    // connection + sst fully setup and made the callback, we work
    // through this method to either deliver the message if possible,
    // or queue it up if we can't deliver it yet.
    Kata.SirikataSpaceConnection.prototype._tryDeliverODP = function(odp_msg) {
        // Queue it up if we have an outstanding connection request
        var connect_info = this.mOutstandingConnectRequests[odp_msg.dest_object];
        if (connect_info) {
            connect_info.deferred_odp.push(odp_msg);
            return;
        }
        this._deliverODP(odp_msg);
    };

    Kata.SirikataSpaceConnection.prototype._deliverODP = function(odp_msg) {
        this.mParent.receiveODPMessage(
            this.mSpaceURL,
            odp_msg.source_object, odp_msg.source_port,
            odp_msg.dest_object, odp_msg.dest_port,
            odp_msg.payload
        );
    };

    /* Handle session messages from the space server. */
    Kata.SirikataSpaceConnection.prototype._handleSessionMessage = function(odp_msg) {
        var session_msg = new Sirikata.Protocol.Session.Container();
        session_msg.ParseFromStream(PROTO.CreateArrayStream(odp_msg.payload));

        var objid = odp_msg.dest_object;

        if (session_msg.HasField("connect_response")) {
            var conn_response = session_msg.connect_response;
            if (conn_response.response !== Sirikata.Protocol.Session.ConnectResponse.Response.Success) {
                //this.recoverConnection(objid);//the connection has failed somehow
                Kata.log("Would have tried connection recovery here, but that causes a bad loopdiloop");
                var thus=this;
                setTimeout(function() {
                               if (objid in thus.mOutstandingConnectRequests && !(objid in thus.mConnectedObjects)) {
                                   thus._sendOutstandingConnectRequest(objid,thus.mOutstandingConnectRequests[objid]);                    
                               }                               
                           },5000);
            }
            if (conn_response.response === Sirikata.Protocol.Session.ConnectResponse.Response.Success) {
                var id = this._getLocalID(objid);
                Kata.log("Successfully connected " + id);

                // Send ack
                var connect_ack_msg = new Sirikata.Protocol.Session.ConnectAck();
                var ack_msg = new Sirikata.Protocol.Session.Container();
                ack_msg.connect_ack = connect_ack_msg;

                this._sendODPMessage(
                    objid, this.Ports.Session,
                    Kata.ObjectID.nil(), this.Ports.Session,
                    this._serializeMessage(ack_msg)
                );

                // Set up SST
                this.mConnectedObjects[objid] = {};
                this.mConnectedObjects[objid].queryAngleRequest = this.mOutstandingConnectRequests[objid].query_angle;
                var odpRouter = new this.ObjectMessageRouter(this);
                var odpDispatcher = new Kata.SST.ObjectMessageDispatcher();
                // Store the dispatcher so we can deliver ODP messages
                this.mConnectedObjects[objid].odpDispatcher = odpDispatcher;
                // And the BaseDatagramLayer...
                this.mConnectedObjects[objid].odpBaseDatagramLayer = Kata.SST.createBaseDatagramLayer(
                    // FIXME SST requiring a full endpoint here is unnecessary, it only uses the objid for indexing
                    new Kata.SST.EndPoint(objid, 0), odpRouter, odpDispatcher
                );

                this.mConnectedObjects[objid].proxdata = [];
                if (this.mOutstandingConnectRequests[objid].locationUpdateRequest)//if we got a location update during connect
                    this.mConnectedObjects[objid].locationUpdateRequest = this.mOutstandingConnectRequests[objid].locationUpdateRequest;
                else
                    this.mConnectedObjects[objid].locationUpdateRequest = new Sirikata.Protocol.Loc.LocationUpdateRequest();
                this.mConnectedObjects[objid].discardChildStream=Kata.bind(this.discardChildStream,this,objid);
                // Try to connect the initial stream
                var tried_sst = Kata.SST.connectStream(
                    new Kata.SST.EndPoint(objid, this.Ports.Space),
                    new Kata.SST.EndPoint(Kata.SpaceID.nil(), this.Ports.Space),
                    Kata.bind(this._spaceSSTConnectCallback, this, objid)
                );

                // Allow the SessionManager to alias the ID until the swap to the Space's ID can be safely made
                this.mParent.aliasIDs(
                    id, {space : this.mSpaceURL, object : objid}
                );
            }
            else if (conn_response.response === Sirikata.Protocol.Session.ConnectResponse.Response.Redirect) {
                Kata.notImplemented("Server redirects for Sirikata are not implemented.");
            }
            else if (conn_response.response === Sirikata.Protocol.Session.ConnectResponse.Response.Error) {
                Kata.warn("Connection Error.");
                var id = this._getLocalID(objid);
                this.mParent.connectionResponse(
                    id, false,
                    {space : this.mSpaceURL, object : objid},
                    {
                        msg: "Authentication failure."
                    }
                );
            }
            else {
                Kata.warn("Got unknown connection response.");
            }
        }

        if (session_msg.HasField("init_migration")) {
            Kata.notImplemented("Migrations not implemented.");
        }
    };
    function createPlausibleRequestFromConnectMessage(space_conn,connect_msg) {
        var ptime = space_conn._toLocalTime(connect_msg.loc.t);
        var otime = space_conn._toLocalTime(connect_msg.orientation.t);
        var stime = ptime;
        var retval = Kata.LocationIdentity(ptime);

        retval.pos[0]=connect_msg.loc.position[0];
        retval.pos[1]=connect_msg.loc.position[1];
        retval.pos[2]=connect_msg.loc.position[2];
        retval.vel[0]=0;//connect_msg.loc.velocity[0]; //nonzero velocity when we haven't synced our clocks is a bad idea
        retval.vel[1]=0;//connect_msg.loc.velocity[1];
        retval.vel[2]=0;//connect_msg.loc.velocity[2];

        retval.orientTime=otime;
        retval.orient[0]=connect_msg.orientation.position[0];
        retval.orient[1]=connect_msg.orientation.position[1];
        retval.orient[2]=connect_msg.orientation.position[2];
        retval.orient[3]=connect_msg.orientation.position[3];
        retval.rotaxis[0]=0;//connect_msg.loc.velocity[0];
        retval.rotaxis[1]=0;//connect_msg.loc.velocity[1];
        retval.rotaxis[2]=1;//connect_msg.loc.velocity[2];
        retval.rotvel=0;//connect_msg.loc.velocity[3];
        //FIXME no angvel
        retval.scale[0]=connect_msg.bounds[0];
        retval.scale[1]=connect_msg.bounds[1];
        retval.scale[2]=connect_msg.bounds[2];
        retval.scale[3]=connect_msg.bounds[3];
        if (connect_msg.visual!==undefined)
            retval.visual = connect_msg.visual;
        return retval;
    }
    function arrayDup(array) {
        var retval=[];
        for (var i=0;i<array.length;++i) {
            retval.push(array[i]);
        }
        return retval;
    }
    function copyLocationUpdateRequestToConnectMessage(connect_msg, locCopy, queryAngleRequest) {
        if (locCopy.location) {
            var pos = new Sirikata.Protocol.TimedMotionVector();
            pos.t = locCopy.location.t;
            pos.position = arrayDup(locCopy.location.position);
            pos.velocity = [0,0,0];//zero out the velocity
            connect_msg.loc = pos;            
        }

        if (locCopy.orientation) {
            var orient = new Sirikata.Protocol.TimedMotionQuaternion();
            orient.t = locCopy.location.t;
            orient.position = arrayDup(locCopy.orientation.position);
            orient.velocity = [0,0,0,1];//zero out the velocity
            connect_msg.orientation = orient;            
            
        }
        if (locCopy.bounds) {
            connect_msg.bounds = arrayDup(locCopy.bounds);   
        }
        if (locCopy.mesh)
            connect_msg.mesh = locCopy.mesh;
        if (queryAngleRequest>0.0&&queryAngleRequest!=true&&queryAngleRequest) {
            connect_msg.query_angle = queryAngleRequest;
        }else if (queryAngleRequest) {
            connect_msg.query_angle = 0.00000000000000000000000001;
        }
    }
    /**
     * Copies connect info to a LocationUpdateRequest, only overwriting thigns is shouldOverwrite is passed or the field is missing. Returns true if any old data exists
     */
    function copyConnectInfoToLocationUpdateRequest(connection,destinationLocCopy,connect_info,shouldOverwrite) {
        var newData=false;
        var loc_parts = connection._generateLocUpdatePartsFromConnectMessage(connect_info, true);
        if (destinationLocCopy.HasField("bounds")) {
            newData=true;
            if (shouldOverwrite) destinationLocCopy.bounds = loc_parts.bounds;
        }else {
            destinationLocCopy.bounds = loc_parts.bounds;
        }
        if (destinationLocCopy.HasField("orientation")) {
            newData=true;
            if (shouldOverwrite) destinationLocCopy.orientation = loc_parts.orient;
        }else {
            destinationLocCopy.orientation = loc_parts.orient;
        }
        if (destinationLocCopy.HasField("location")) {
            newData=true;
            if (shouldOverwrite) destinationLocCopy.location = loc_parts.loc;
        }else {
            destinationLocCopy.location = loc_parts.loc;
        }
        if (destinationLocCopy.HasField("mesh")) {
            newData=true;
            if (shouldOverwrite) destinationLocCopy.mesh = connect_info.visual;
        }else {
            destinationLocCopy.mesh = connect_info.visual;
        }
        if (destinationLocCopy.HasField("physics")) {
            newData=true;
        }else {//we aren't allowed to set physics on connect I believe--so it's undefined
            
        }        
        return newData;
    }
    Kata.SirikataSpaceConnection.prototype._spaceSSTConnectCallback = function(objid, error, stream) {
        if (error == Kata.SST.FAILURE) {
            this.recoverConnection(objid);
/*
            Kata.warn("Failed to get SST connection to space for " + objid + ".");
            Kata.warn("RETRYING");
            var tried_sst = Kata.SST.connectStream(
                new Kata.SST.EndPoint(objid, this.Ports.Space),
                new Kata.SST.EndPoint(Kata.SpaceID.nil(), this.Ports.Space),
                Kata.bind(this._spaceSSTConnectCallback, this, objid)
                );
            if (tried_sst) {
                this.mConnectedObjects[objid].spaceStream=null;//kill any old stream                
            }else {
                Kata.warn("Unable to retry connnecting stream");
            }
*/
            return;
        }

        Kata.log("Successful SST space connection for " + objid + ". Setting up loc and prox listeners.");
        // Store the stream for later use
        this.mConnectedObjects[objid].spaceStream = stream;
        
        // reset the prox sequence number so future updates will be accepted
        this.requestResetProxSeqno(objid);
        // And setup listeners for loc and prox
        stream.listenSubstream(this.Ports.Location, Kata.bind(this._handleLocationSubstream, this, objid));
        stream.listenSubstream(this.Ports.Proximity, Kata.bind(this._handleProximitySubstream, this, objid));

        // With the successful connection + sst stream, we can indicate success to the parent SessionManager
        var connect_info = this.mOutstandingConnectRequests[objid];
        if (connect_info.reset_time) {
            connect_info.loc_bounds.time = Kata.now(this.mSpaceURL);
        }
        delete this.mOutstandingConnectRequests[objid];
        var id = this._getLocalID(objid);
        this.mParent.connectionResponse(
            id, true,
            {space : this.mSpaceURL, object : objid},
            {
                loc : connect_info.loc_bounds, 
                vis : connect_info.visual
            }
        );

        // And finally, having given the parent a chance to setup
        // after getting the connection, we can flush buffered odp
        // packets
        for(var di = 0; di < connect_info.deferred_odp.length; di++)
            this._deliverODP( connect_info.deferred_odp[di] );
        // now lets send out any outstanding LOC requests
        var doSendLocationUpdate=false;
        var savedLocCopy = this.mConnectedObjects[objid].locationUpdateRequest;

        this.mConnectedObjects[objid].auth = connect_info.auth;
        if (copyConnectInfoToLocationUpdateRequest(this,savedLocCopy,connect_info,false)) {
            //if there's been new info since we attempted to connect, go ahead and send it out in the usual fashion 
        
            var spacestream = this.mConnectedObjects[objid].spaceStream;
            if (!spacestream) {
                Kata.warn("Should really have stream by now: this is in the stream creation callback");
                return;
            }

            var container = new Sirikata.Protocol.Loc.Container();
            container.update_request = savedLocCopy;

            spacestream.createChildStream(
                this.mConnectedObjects[objid].discardChildStream,
                this._serializeMessage(container).getArray(),
                this.Ports.Location, this.Ports.Location);

        }
    };
function sleep(delay) {
    var start = Date.now();
    while (Date.now() < start + delay);
  }
    Kata.SirikataSpaceConnection.prototype.requestResetProxSeqno = function(objid) {
        this.mParent.requestResetProxSeqno(this.mSpaceURL,objid);
    };
    Kata.SirikataSpaceConnection.prototype.recoverConnectionCallback = function(whichObjectDisconnected) {
        this.mRecoveryCallback=this;
        this.recoverConnection(whichObjectDisconnected);
    };
    Kata.SirikataSpaceConnection.prototype.recoverConnection = function(whichObjectDisconnected) {
        if (this.mRecovered) return;
        for (var objid in this.mOutstandingConnectRequests) {
            if (this.mRecoveryCallback===undefined||(Date.now()-this.mRecoveryStarted)<5000){
                if (!this.mRecoveryStarted) {
                    this.mRecoveryStarted = Date.now();
                }
                if (this.mRecoveryCallback===this||this.mRecoveryCallback===undefined)//reset timeout...otherwise timeout was set by someone else and we shouldn't clutter
                    this.mRecoveryCallback = setTimeout(Kata.bind(this.recoverConnectionCallback,this,whichObjectDisconnected),400);
                return;
            }
        }
        this.mRecovered=true;
        Kata.SST.Stream.traceLog={};
        this.mParent.spaceConnectionDisconnected(this) ;
        var space_conn = this.mParent.connectSpaceToServer(this.mSpaceURL,this.mAuth);
        this.mSocket.close();
        this.mDisconnected=true;
        space_conn.mSync.setOffset(this.mSync.offset());
        space_conn.mLocalIDs=this.mLocalIDs;
        space_conn.mObjectUUIDs=this.mObjectUUIDs;
        this.mLocalIDs={};
        this.mObjectUUIDs={};
        var objs = this.mConnectedObjects;
        var objid;
        var partiallyConnectedObjs = this.mOutstandingConnectRequests;
        for (objid in partiallyConnectedObjs) {
            var obj = partiallyConnectedObjs[objid];
            this.requestResetProxSeqno(objid);
            space_conn.mOutstandingConnectRequests[objid] = obj;
            space_conn._sendOutstandingConnectRequest(objid,obj);
        }
        for (objid in objs) {
            if (!(objid in partiallyConnectedObjs)) {//make sure we haven't just reconnected this before that was waiting for sst completion
                this.requestResetProxSeqno(objid);
                var obj = objs[objid];
                var connect_msg = new Sirikata.Protocol.Session.Connect();
                connect_msg.type = Sirikata.Protocol.Session.Connect.ConnectionType.Fresh;
                connect_msg.object = objid;
                
                if (obj.auth) {
                    if (typeof(auth) == "string")
                        connect_msg.auth = PROTO.encodeUTF8(auth);
                    else
                        connect_msg.auth = auth;
                }
                copyLocationUpdateRequestToConnectMessage(connect_msg,obj.locationUpdateRequest,obj.queryAngleRequest);
                console.log("CONNECTING WITH "+serializeConnect(connect_msg));
                space_conn.mOutstandingConnectRequests[objid] =
                    {
                        query_angle: obj.queryAngleRequest,
                        auth : connect_msg.auth,
                        loc_bounds : createPlausibleRequestFromConnectMessage(space_conn,connect_msg),
                        visual : obj.locationUpdateRequest.mesh,
                        reset_time : false,
                        deferred_odp : []
                    };
/*
        if (query>0.0&&query!=true&&query) {
            this.mOutstandingConnectRequests[objid].query_angle = query;
        }else if (query) {
            this.mOutstandingConnectRequests[objid].query_angle = 0.00000000000000000000000001;
        }
*/  // should be duplicated by saving the queryAngleRequest from the obj

                this.mParent.unaliasIDs(space_conn._getLocalID(objid),{space:space_conn.mSpaceURL,object:objid});
                var session_msg = new Sirikata.Protocol.Session.Container();
                session_msg.connect = connect_msg;
                
                if (obj.spaceStream) {
                    var conn = obj.spaceStream.mConnection;
                    obj.spaceStream.close(true);
                    if (conn) {
                        conn.close(true);                    
                    }
                    Kata.SST.destroyBaseDatagramLayer(objid);
                }
                
                space_conn._sendODPMessage(
                    objid, space_conn.Ports.Session,
                    Kata.ObjectID.nil(), space_conn.Ports.Session,
                    space_conn._serializeMessage(session_msg)
                );
                
            }
        }
        this.mOutstandingConnectRequests={};
        this.mConnectedObjects={};
        this.mPrimarySubstream.close();
    };
    Kata.SirikataSpaceConnection.prototype.discardChildStream = function(objid,success,sptr) {
        if (success!=Kata.SST.SUCCESS||Kata.testRecovery) {
            Kata.testRecovery=false;
            this.recoverConnection(objid);
        }
        if (sptr != null)
            sptr.close(false);
        else
            Kata.warn("Failed to connect child stream to loc");
    };
    
    /**
     * Gets the appropriate locationUpdateRequest for saved location update depending on the progress in the connection request
     */
    Kata.SirikataSpaceConnection.prototype.getSavedLocationUpdateRequest = function(objid) {
        var savedLocCopy;
        if (objid in this.mConnectedObjects) {
            savedLocCopy = this.mConnectedObjects[objid].locationUpdateRequest;
        }else {
            savedLocCopy = this.mOutstandingConnectRequests[objid].locationUpdateRequest;
            if (!savedLocCopy) {
                savedLocCopy = this.mOutstandingConnectRequests[objid].locationUpdateRequest = new Sirikata.Protocol.Loc.LocationUpdateRequest();
            }
        }
        return savedLocCopy;
    };
    Kata.SirikataSpaceConnection.prototype.locUpdateRequest = function(objid, loc, visual) {
        // Generate and send an update to Loc
        var update_request = new Sirikata.Protocol.Loc.LocationUpdateRequest();
        var savedLocCopy = this.getSavedLocationUpdateRequest(objid);
        var loc_parts = this._generateLocUpdateParts(loc, false);
        
        if (loc_parts.loc) {
            savedLocCopy.location = loc_parts.loc;
            update_request.location = loc_parts.loc;            
        }

        if (loc_parts.orient) {
            savedLocCopy.orientation = loc_parts.orient;            
            update_request.orientation = loc_parts.orient;
        }
        if (loc_parts.bounds) {
            savedLocCopy.bounds = loc_parts.bounds;            
            update_request.bounds = loc_parts.bounds;
        }
        if (typeof(visual)=="string") {
            savedLocCopy.mesh = visual;            
            update_request.mesh = visual;
        }

        var container = new Sirikata.Protocol.Loc.Container();
        container.update_request = update_request;

        var connObj = this.mConnectedObjects[objid];
        if (!connObj) {
            return;            
        }
        var spacestream = connObj.spaceStream;
        if (!spacestream) {
            //Kata.warn("Tried to send loc update before stream to server was ready.");
            return;
        }
        spacestream.createChildStream(
            this.mConnectedObjects[objid].discardChildStream,
            this._serializeMessage(container).getArray(),
            this.Ports.Location, this.Ports.Location);
/*old protocol
        spacestream.datagram(
            this._serializeMessage(container).getArray(),
            this.Ports.Location, this.Ports.Location
        );*/
    };

    Kata.SirikataSpaceConnection.prototype.requestQueryRemoval = function(objid) {
        this.requestQueryUpdate(objid,4*Math.PI);
    };

    Kata.SirikataSpaceConnection.prototype.requestQueryUpdate = function(objid, newAngle) {
        // Generate and send an update to PINTO
        var update_request = new Sirikata.Protocol.Prox.QueryRequest();
        update_request.query_angle = newAngle;
        var spacestream = this.mConnectedObjects[objid].spaceStream;
        this.mConnectedObjects[objid].queryAngleRequest = newAngle;
        if (!spacestream) {
            Kata.warn("Tried to send prox update before stream to server was ready.");
            return;
        }

        spacestream.datagram(
            this._serializeMessage(update_request).getArray(),
            this.Ports.Proximity, this.Ports.Proximity
        );
    };

    Kata.SirikataSpaceConnection.prototype.setPhysics = function(objid, data) {
        // Generate and send an update to Loc
        var savedLocCopy = this.getSavedLocationUpdateRequest(objid);
        var update_request = new Sirikata.Protocol.Loc.LocationUpdateRequest();
        update_request.physics = data;
        savedLocCopy.physics = data;
        var container = new Sirikata.Protocol.Loc.Container();
        container.update_request = update_request;
        var connObj = this.mConnectedObjects[objid];
        if (!connObj) {
            return;
        }
        var spacestream = connObj.spaceStream;
        if (!spacestream) {
            Kata.warn("Tried to send loc update before stream to server was ready.");
            return;
        }
        spacestream.createChildStream(
            this.mConnectedObjects[objid].discardChildStream,
            this._serializeMessage(container).getArray(),
            this.Ports.Location, this.Ports.Location);
/*
        spacestream.datagram(
            this._serializeMessage(container).getArray(),
            this.Ports.Location, this.Ports.Location
        );*/
    };

    Kata.SirikataSpaceConnection.prototype._handleLocationSubstream = function(objid, error, stream) {
        if (error != 0)
            Kata.warn("Location substream (error " + error + ")");
        stream.registerReadCallback(Kata.bind(this._handleLocationSubstreamRead, this, objid, stream));
    };

    Kata.SirikataSpaceConnection.prototype._handleProximitySubstream = function(objid, error, stream) {
        if (error != 0)
            Kata.warn("Proximity substream (error " + error + ")");
        stream.registerReadCallback(Kata.bind(this._handleProximitySubstreamRead, this, objid, stream));
    };
    var posCache={};
    
    function printPos(uid,posStr) {
        if (posCache[uid]!==posStr) {
            console.log("Loc Update "+uid+" to "+posStr);
            posCache[uid]=posStr;
        }
    }
    Kata.SirikataSpaceConnection.prototype._handleLocationSubstreamRead = function(objid, stream, data) {
        // Currently we just assume each update is a standalone Frame

        // Parse the surrounding frame
        if (this.mIncompleteLocationData[stream.mUSID]) {
            data = this.mIncompleteLocationData[stream.mUSID].concat(data);
        }
        var framed_msg = new Sirikata.Protocol.Frame();
        var str = PROTO.CreateArrayStream(data);
        if (!framed_msg.ParseFromStream(str)) {
            this.mIncompleteLocationData[stream.mUSID] = data;
            return;
        }
        if (this.mIncompleteLocationData[stream.mUSID]) {
            delete this.mIncompleteLocationData[stream.mUSID];
        }

        // Parse the internal loc update
        var loc_update_msg = new Sirikata.Protocol.Loc.BulkLocationUpdate();
        loc_update_msg.ParseFromStream(PROTO.CreateArrayStream(framed_msg.payload));

        for(var idx = 0; idx < loc_update_msg.update.length; idx++) {
            var update = loc_update_msg.update[idx];
            var from = update.object;
            
            // Note: Currently things go wonky if we include
            // combinations of location and orientation in
            // presenceLocUpdates. To work around this, we generate
            // separate events for each type of information we've
            // received.  The visual parameter is handled seperately,
            // so we just fill it in before any calls to
            // presenceLocUpdate.
            //FIXME: bug un protojs: does not properly determine if mesh field is missing versus an empty string
            var visual = update.HasField("mesh")?update.mesh:undefined;

            var physics = update.HasField("physics")?update.physics:undefined;

            if (update.location) {
                var loc = {};
                // Note: currently we expect this to be in milliseconds, not a Date
                loc.seqno = update.seqno;
                loc.time = this._toLocalTime(update.location.t).getTime();
                loc.pos = update.location.position;
                loc.vel = update.location.velocity;
                this.mParent.presenceLocUpdate(this.mSpaceURL, from, objid, loc, visual, physics);
            }
            // FIXME differing time values? Maybe use Location class to handle?
            if (update.orientation) {
                var loc = {};
                // Note: currently we expect this to be in milliseconds, not a Date
                loc.seqno = update.seqno;
                loc.time = this._toLocalTime(update.orientation.t).getTime();
                loc.orient = update.orientation.position;
                var orientvel = new Kata.Quaternion(update.orientation.velocity);
                var ovel_aa = orientvel.toAngleAxis();
                loc.rotaxis = ovel_aa.axis;
                loc.rotvel = ovel_aa.angle;
                this.mParent.presenceLocUpdate(this.mSpaceURL, from, objid, loc, visual, physics);
            }

            if (update.aggregate_bounds) {
                var loc = {};
                // Note: currently we expect this to be in milliseconds, not a Date
                //loc.time = this._toLocalTime(update.bounds.t).getTime();
                loc.seqno = update.seqno;
                var size = update.aggregate_bounds.max_object_size;
                loc.scale = [0,0,0,size?size:0];
                if (update.aggregate_bounds.center_offset) {
                    var cp = update.aggregate_bounds.center_offset;
                    loc.scale[0]=cp[0];
                    loc.scale[1]=cp[1];
                    loc.scale[2]=cp[2];
                }
				if (!loc.time) {
					loc.time = Kata.now(this.mSpaceURL); // OMG HACK HACK HACK: The correct fix is to add time field to the space server.
				}
                this.mParent.presenceLocUpdate(this.mSpaceURL, from, objid, loc, visual, physics);
            }
        }
        stream.close(false);
    };

    Kata.SirikataSpaceConnection.prototype._handleProximitySubstreamRead = function(objid, stream, data) {
        var objinfo = this.mConnectedObjects[objid];
        objinfo.proxdata = objinfo.proxdata.concat(data);

        while(true) {
            var next_prox_msg = Kata.Frame.parse(objinfo.proxdata);
            if (next_prox_msg === null) break;

            // Handle the message
            var prox_msg = new Sirikata.Protocol.Prox.ProximityResults();
            prox_msg.ParseFromStream(PROTO.CreateArrayStream(next_prox_msg));
            // FIXME add actual use of proximity events
            for(var i = 0; i < prox_msg.update.length; i++)
                this._handleProximityUpdate(objid, prox_msg.t, prox_msg.update[i]);
        }
    };

    Kata.SirikataSpaceConnection.prototype._handleProximityUpdate = function(objid, t, update) {
        for(var add = 0; add < update.addition.length; add++) {
            var observed = update.addition[add].object;
            if (observed == objid) continue;
            // Decode location, orientation, bounds, mesh
            var properties = {};

            // FIXME what is going on with this weird Location "class"?
            properties.loc = Kata.LocationIdentity(0);

            properties.loc.pos = update.addition[add].location.position;
            properties.loc.vel = update.addition[add].location.velocity;
            // Note: currently we expect this to be in milliseconds, not a Date
            properties.loc.posTime = this._toLocalTime(update.addition[add].location.t).getTime();

            properties.loc.orient = update.addition[add].orientation.position;
            var orientvel = new Kata.Quaternion(update.addition[add].orientation.velocity);
            var ovel_aa = orientvel.toAngleAxis();
            properties.loc.rotaxis = ovel_aa.axis;
            properties.loc.rotvel = ovel_aa.angle;
            // Note: currently we expect this to be in milliseconds, not a Date
            properties.loc.orientTime = this._toLocalTime(update.addition[add].orientation.t).getTime();
            if (update.addition[add].aggregate_bounds) {
                
                var size = update.addition[add].aggregate_bounds.max_object_size;
                properties.bounds = [0,0,0,size?size:0];
                if (update.addition[add].aggregate_bounds.center_offset) {
                    var cp = update.addition[add].aggregate_bounds.center_offset;
                    properties.bounds[0]=cp[0];
                    properties.bounds[1]=cp[1];
                    properties.bounds[2]=cp[2];
                }
                
            }

            properties.loc.scale = properties.bounds;
            // FIXME bounds and scale don't get their own time. Why does Location even have this?
            properties.loc.scaleTime = this._toLocalTime(update.addition[add].location.t).getTime();

            if (update.addition[add].HasField("mesh")) {
                // FIXME: This is only an object with multiple
                // properties (instead of just the mesh URL) because
                // curretnly GraphicsScript relies on it being this
                // way.
                properties.visual = update.addition[add].mesh;
            }
            this.mParent.proxEvent(this.mSpaceURL, objid, observed, true, properties);
        }

        for(var rem = 0; rem < update.removal.length; rem++) {
            var observed = update.removal[rem].object;
            if (observed == objid) continue;
            this.mParent.proxEvent(this.mSpaceURL, objid, observed, false);
        }
    };

    Kata.SessionManager.registerProtocolHandler("sirikata", Kata.SirikataSpaceConnection);
}, 'katajs/oh/plugins/sirikata/SirikataSpaceConnection.js');
