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
    function discardChildStream(success,sptr) {
        if (success!=Kata.SST.SUCCESS) {
            Kata.warn("location packet lost due to unsuccessful packet send");
        }
        sptr.close(false);
    }

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
    Kata.SirikataSpaceConnection = function (parent, spaceurl) {
        SUPER.constructor.call(this, parent);

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
            pos.t = this._toSpaceTime(loc.time);
            if (loc.pos)
                pos.position = loc.pos;
            if (loc.vel)
                pos.velocity = loc.vel;
            result.loc = pos;
        }

        if (loc.orient || (loc.rotvel != undefined && loc.rotaxis != undefined)) {
            var orient = new Sirikata.Protocol.TimedMotionQuaternion();
            orient.t = this._toSpaceTime(loc.time);
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


    Kata.SirikataSpaceConnection.prototype.connectObject = function(id, auth, loc, vis, query) {
        var objid = this._getObjectID(id);

        //Kata.warn("Connecting " + id + " == " + objid);

        var reqloc = Kata.LocationIdentity(0);
        var resetTime=false;
        if (loc.posTime===undefined&&loc.time === undefined) {
            loc.time=Date.now();
            resetTime=true;
        }
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
                loc_bounds : reqloc,
                visual : vis,
                reset_time : resetTime,
                deferred_odp : []
            };

        var connect_msg = new Sirikata.Protocol.Session.Connect();

        connect_msg.type = Sirikata.Protocol.Session.Connect.ConnectionType.Fresh;
        connect_msg.object = objid;

        if (auth) {
            if (typeof(auth) == "string")
                connect_msg.auth = PROTO.encodeUTF8(auth);
            else
                connect_msg.auth = auth;
        }

        var loc_parts = this._generateLocUpdateParts(reqloc, true);

        if (loc_parts.loc)
            connect_msg.loc = loc_parts.loc;
        if (loc_parts.orient)
            connect_msg.orientation = loc_parts.orient;
        if (loc_parts.bounds)
            connect_msg.bounds = loc_parts.bounds;
        if (loc_parts.visual)
            connect_msg.mesh = loc_parts.visual;
        if (query>0.0&&query!=true&&query) {
            connect_msg.query_angle = query;
        }else if (query) {
            connect_msg.query_angle = 0.00000000000000000000000001;
        }

        var session_msg = new Sirikata.Protocol.Session.Container();
        session_msg.connect = connect_msg;

        this._sendODPMessage(
            objid, this.Ports.Session,
            Kata.ObjectID.nil(), this.Ports.Session,
            this._serializeMessage(session_msg)
        );
    };

    Kata.SirikataSpaceConnection.prototype.disconnectObject = function(id) {
        var objid = this._getObjectID(id);

        var disconnect_msg = new Sirikata.Protocol.Session.Disconnect();
        disconnect_msg.object = objid;
        disconnect_msg.reason = "Quit";

        var session_msg = new Sirikata.Protocol.Session.Container();
        session_msg.disconnect = disconnect_msg;

        this._sendODPMessage(
            objid, this.Ports.Session,
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

        // All objects connected through us get disconnected
        for(var objid in this.mConnectedObjects) {
            this.mParent.disconnected(objid, this.mSpaceURL);
        }
        // All objects *trying* to connect get rejected
        for(var objid in this.mOutstandingConnectRequests) {
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

            if (conn_response.response == Sirikata.Protocol.Session.ConnectResponse.Response.Success) {
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
            else if (conn_response.response == Sirikata.Protocol.Session.ConnectResponse.Response.Redirect) {
                Kata.notImplemented("Server redirects for Sirikata are not implemented.");
            }
            else if (conn_response.response == Sirikata.Protocol.Session.ConnectResponse.Response.Error) {
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

    Kata.SirikataSpaceConnection.prototype._spaceSSTConnectCallback = function(objid, error, stream) {
        if (error == Kata.SST.FAILURE) {
            Kata.warn("Failed to get SST connection to space for " + objid + ".");
            return;
        }

        Kata.log("Successful SST space connection for " + objid + ". Setting up loc and prox listeners.");
        // Store the stream for later use
        this.mConnectedObjects[objid].spaceStream = stream;

        // And setup listeners for loc and prox
        stream.listenSubstream(this.Ports.Location, Kata.bind(this._handleLocationSubstream, this, objid));
        stream.listenSubstream(this.Ports.Proximity, Kata.bind(this._handleProximitySubstream, this, objid));

        // With the successful connection + sst straem, we can indicate success to the parent SessionManager
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
    };

    Kata.SirikataSpaceConnection.prototype.locUpdateRequest = function(objid, loc, visual) {
        // Generate and send an update to Loc
        var update_request = new Sirikata.Protocol.Loc.LocationUpdateRequest();

        var loc_parts = this._generateLocUpdateParts(loc, false);

        if (loc_parts.loc)
            update_request.location = loc_parts.loc;
        if (loc_parts.orient)
            update_request.orientation = loc_parts.orient;
        if (loc_parts.bounds)
            update_request.bounds = loc_parts.bounds;
        if (typeof(visual)=="string")
            update_request.mesh = visual;

        var container = new Sirikata.Protocol.Loc.Container();
        container.update_request = update_request;

        var spacestream = this.mConnectedObjects[objid].spaceStream;
        if (!spacestream) {
            Kata.warn("Tried to send loc update before stream to server was ready.");
            return;
        }
        spacestream.createChildStream(
            discardChildStream,
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
        var update_request = new Sirikata.Protocol.Loc.LocationUpdateRequest;
        update_request.physics = data;

        var container = new Sirikata.Protocol.Loc.Container;
        container.update_request = update_request;

        var spacestream = this.mConnectedObjects[objid].spaceStream;
        if (!spacestream) {
            Kata.warn("Tried to send loc update before stream to server was ready.");
            return;
        }

        spacestream.datagram(
            this._serializeMessage(container).getArray(),
            this.Ports.Location, this.Ports.Location
        );
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

            if (update.bounds) {
                var loc = {};
                // Note: currently we expect this to be in milliseconds, not a Date
                //loc.time = this._toLocalTime(update.bounds.t).getTime();
                loc.seqno = update.seqno;
                loc.scale = update.bounds;
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

            properties.bounds = update.addition[add].bounds;
            properties.loc.scale = update.addition[add].bounds;
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
