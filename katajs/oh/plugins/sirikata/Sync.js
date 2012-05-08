/*  KataJS
 *  Sync.js
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
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/TimeSync.pbj.js']
], function() {

    if (typeof(Kata.Sirikata) == 'undefined')
        Kata.Sirikata = {};

    /** SyncClient handles the synchronization protocol with the server.
     *
     *  \param odp_service object used to send ODP messages to the
     *  server, must have sendODPMessage and _receiveODPMessage functions
     *  \param local_endpoint the local ODP endpoint to use
     *  \param sync_endpoint the server endpoint to sync with
     *  \param cb callback to invoke, passed the current computed
     *  offset when it is updated
     */
    Kata.Sirikata.SyncClient = function(odp_service, local_endpoint, sync_endpoint, cb) {
        this.mODP = odp_service;
        this.mLocalEndpoint = local_endpoint;
        this.mSyncEndpoint = sync_endpoint;
        this.mCB = cb;

        this.mODP._receiveODPMessage(
            local_endpoint.object(), local_endpoint.port(),
            Kata.bind(this.handleMessage, this)
        );

        this.mSeqNo = 0;
        this.mRequestTimes = new Array(256);
        this.poll();

        this.mOffset = null;
    };

    Kata.Sirikata.SyncClient.prototype.MaxRTT = 5000;

    Kata.Sirikata.SyncClient.prototype.valid = function() {
        return (this.mOffset == null);
    };

    Kata.Sirikata.SyncClient.prototype.offset = function() {
        return this.mOffset;
    };

    Kata.Sirikata.SyncClient.prototype.poll = function() {
        // Send the next update request
        var sync_msg = new Sirikata.Protocol.TimeSync();
        var seqno = this.mSeqNo;
        this.mSeqNo = (this.mSeqNo+1) % 256;
        sync_msg.seqno = seqno;
        this.mRequestTimes[seqno] = Date.now();

        var serialized = new PROTO.ByteArrayStream();
        sync_msg.SerializeToStream(serialized);
        this.mODP.sendODPMessage(
            this.mLocalEndpoint.object(), this.mLocalEndpoint.port(),
            this.mSyncEndpoint.object(), this.mSyncEndpoint.port(),
            serialized
        );

        // Setup for next time
        setTimeout(Kata.bind(this.poll, this), 5000);
    };

    Kata.Sirikata.SyncClient.prototype.handleMessage = function(space, src, src_port, dest, dest_port, payload) {
        var sync_msg = new Sirikata.Protocol.TimeSync();
        sync_msg.ParseFromStream(PROTO.CreateArrayStream(payload));

        var local_start_t = this.mRequestTimes[sync_msg.seqno];
        var server_t = sync_msg.t;
        var local_finish_t = Date.now();

        // Sanity check the round trip time to avoid using outdated packets
        var rtt = local_finish_t - local_start_t;
        if (local_finish_t < local_start_t ||
            rtt > this.MaxRTT)
            return;

        // FIXME use averaging, falloff, etc instead of just replacing the value outright
        this.mOffset = server_t - (local_start_t + (rtt/2.0));
        if (this.mCB)
            this.mCB();

    };

}, 'katajs/oh/plugins/sirikata/Sync.js');
