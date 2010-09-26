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

Kata.include("katajs/oh/SpaceConnection.js");
Kata.include("katajs/oh/SessionManager.js");
Kata.include("katajs/network/TCPSST.js");
Kata.include("externals/protojs/protobuf.js");
Kata.include("externals/protojs/pbj.js");

Kata.include("katajs/oh/plugins/sirikata/impl/TimedMotionVector.pbj.js");
Kata.include("katajs/oh/plugins/sirikata/impl/TimedMotionQuaternion.pbj.js");
Kata.include("katajs/oh/plugins/sirikata/impl/Session.pbj.js");

Kata.include("katajs/oh/plugins/sirikata/impl/ObjectMessage.pbj.js");

Kata.defer(function() {

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

        //var port = 9998;
        var port = 7777;
        if (spaceurl.port)
            port = spaceurl.port;
        this.mSocket = new Kata.TCPSST(spaceurl.host, port);
        this.mPrimarySubstream = this.mSocket.clone();
        this.mPrimarySubstream.registerListener(
            Kata.bind(this._receivedData, this)
        );
    };
    Kata.extend(Kata.SirikataSpaceConnection, Kata.SpaceConnection.prototype);

    Kata.SirikataSpaceConnection.prototype.Ports = {
        Session : 1,
        Proximity : 2,
        Location : 3
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

    Kata.SirikataSpaceConnection.prototype._serializeMessage = function(msg) {
        var serialized = new PROTO.ByteArrayStream();
        msg.SerializeToStream(serialized);
        return serialized;
    };

    Kata.SirikataSpaceConnection.prototype.connectObject = function(id, auth, vis) {
        var objid = this._getObjectID(id);

        //Kata.warn("Connecting " + id + " == " + objid);

        this.mOutstandingConnectRequests[objid] =
            {
                loc_bounds : Kata.LocationIdentity(0),
                visual : vis
            };

        var connect_msg = new Sirikata.Protocol.Session.Connect();

        connect_msg.type = Sirikata.Protocol.Session.Connect.ConnectionType.Fresh;
        connect_msg.object = objid;
        // FIXME most of these should be customizable
        var loc = new Sirikata.Protocol.TimedMotionVector();
        loc.t = 0;
        loc.position = [0, 0, 0];
        loc.velocity = [0, 0, 0];
        connect_msg.loc = loc;
        var orient = new Sirikata.Protocol.TimedMotionQuaternion();
        orient.t = 0;
        orient.position = [0, 0, 0, 0];
        orient.velocity = [0, 0, 0, 0];
        connect_msg.orientation = orient;
        connect_msg.bounds = [0, 0, 0, 1];
        // FIXME don't always register queries, allow specifying angle
        connect_msg.query_angle = 0.0000001;
        if (vis && vis.mesh)
            connect_msg.mesh = vis.mesh;

        var session_msg = new Sirikata.Protocol.Session.Container();
        session_msg.connect = connect_msg;

        this._sendODPMessage(
            objid, this.Ports.Session,
            Kata.ObjectID.null(), this.Ports.Session,
            this._serializeMessage(session_msg)
        );
    };

    Kata.SirikataSpaceConnection.prototype.disconnectObject = function(id) {
        Kata.notImplemented("SirikataSpaceConnection.disconnectObject");
    };

    Kata.SirikataSpaceConnection.prototype._sendODPMessage = function(src, src_port, dest, dest_port, payload) {
        var odp_msg = new Sirikata.Protocol.Object.ObjectMessage();
        odp_msg.source_object = src;
        odp_msg.source_port = src_port;
        odp_msg.dest_object = dest;
        odp_msg.dest_port = dest_port;
        odp_msg.unique = PROTO.I64.fromNumber(0);
        odp_msg.payload = payload;

        var serialized = new PROTO.Base64Stream();
        odp_msg.SerializeToStream(serialized);

        this.mPrimarySubstream.sendMessage( serialized.getString() );
    };

    Kata.SirikataSpaceConnection.prototype._receivedData = function(substream, data) {
        var odp_msg = new Sirikata.Protocol.Object.ObjectMessage();
        odp_msg.ParseFromStream(new PROTO.Base64Stream(data));

        // Special case: Session messages
        if (odp_msg.source_object == Kata.ObjectID.null() && odp_msg.dest_port == this.Ports.Session)
            this._handleSessionMessage(odp_msg);
        else
            Kata.warn("Not implemented - Sirikata ODP dispatch: " + odp_msg.toString());
    };

    /* Handle session messages from the space server. */
    Kata.SirikataSpaceConnection.prototype._handleSessionMessage = function(odp_msg) {
        var session_msg = new Sirikata.Protocol.Session.Container();
        session_msg.ParseFromStream(new PROTO.ByteArrayStream(odp_msg.payload));

        var objid = odp_msg.dest_object;

        if (session_msg.HasField("connect_response")) {
            var conn_response = session_msg.connect_response;

            if (conn_response.response == Sirikata.Protocol.Session.ConnectResponse.Response.Success) {
                var id = this._getLocalID(objid);
                Kata.warn("Successfully connected " + id);

                var connect_info = this.mOutstandingConnectRequests[objid];
                delete this.mOutstandingConnectRequests[objid];

                // Send ack
                var connect_ack_msg = new Sirikata.Protocol.Session.ConnectAck();
                var ack_msg = new Sirikata.Protocol.Session.Container();
                ack_msg.connect_ack = connect_ack_msg;

                this._sendODPMessage(
                    objid, this.Ports.Session,
                    Kata.ObjectID.null(), this.Ports.Session,
                    this._serializeMessage(ack_msg)
                );

                // Indicate response. FIXME SST connect stream should happen before this
                this.mParent.connectionResponse(
                    id, true,
                    {space : this.mSpaceURL, object : objid},
                    connect_info.loc_bounds, connect_info.visual
                );
            }
            else if (conn_response.response == Sirikata.Protocol.Session.ConnectResponse.Response.Redirect) {
                Kata.notImplemented("Server redirects for Sirikata are not implemented.");
            }
            else if (conn_response.response == Sirikata.Protocol.Session.ConnectResponse.Response.Error) {
                Kata.warn("Connection Error.");
                this.mParent.connectionResponse(id, false);
            }
            else {
                Kata.warn("Got unknown connection response.");
            }
        }

        if (session_msg.HasField("init_migration")) {
            Kata.notImplemented("Migrations not implemented.");
        }
    };

    Kata.SessionManager.registerProtocolHandler("sirikata", Kata.SirikataSpaceConnection);
});
