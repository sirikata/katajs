/*  katajs Javascript Utilities
 *  TCPSST.js
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
 *  * Neither the name of katajs nor the names of its contributors may
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


Kata.require([
    'katajs/core/Channel.js',
    'katajs/core/Math.uuid.js'
], function() {

    function getMessageCallback(thus, which) {
        return function(ev) {
            thus._onMessage(which, ev.data);
        };
    }

    function getOpenCallback(thus, which) {
        return function(ev) {
            thus._onOpen(which);
        };
    }

    function getCloseCallback(thus, which) {
        return function(ev) {
            thus._onClose(which);
        };
    }

    function getErrorCallback(thus, which) {
        return function(ev) {
            thus._onError(which);
        };
    }

    if (typeof(WebSocket)!="undefined") {
        /**
         * TCPSST is a protocol which has several substreams over a single
         *     TCP (WebSocket) connection.
         * @constructor
         * @implements {Kata.ObjectHost.TopLevelStream}
         * @param {string} host  The hostname to connect to.
         * @param {string} port  The port number to connect to.
         * @param {number=} numStreams  Number of connections to make (def. 1)
         */
        Kata.TCPSST = function (host, port, numStreams) {
            if (!numStreams) {
                numStreams = 1;
            }
            this.mUUID = Math.uuid();
            this.mURI = "ws://"+host+":"+port+"/"+this.mUUID;
            this.mSockets = new Array(numStreams);
            this.mConnected = new Array;
            this.mMessageQueue = new Array;
            for (var i = 0; i < numStreams; i++) {
                this._connectSocket(i);
            }
            this.mNextSubstream = 1; //16777217; // 1
            this.mSubstreams = new Object;
        };

        /**
         * Start connecting a new WebSocket. Also sets callbacks.
         * @param {number} which  Which socket is starting to connect.
         * @private
         */
        Kata.TCPSST.prototype._connectSocket = function (which) {
            if (this.mSockets[which] && this.mSockets[which].readyState == WebSocket.CONNECTED) {
                this.mConnected--;
            }
            var sock = new WebSocket(this.mURI);
            sock.onopen = getOpenCallback(this, which);
            sock.onclose = getCloseCallback(this, which);
            sock.onmessage = getMessageCallback(this, which);
            sock.onerror = getErrorCallback(this, which);
            sock._timeout = setTimeout(Kata.bind(this._onError, this, which), 10000);
            this.mSockets[which] = sock;
        };
        /**
         * A remote connection ended for some reason.
         * @param {number} which  Which socket disconnected.
         * @private
         */
        Kata.TCPSST.prototype._onClose = function (which) {
            if (network_debug) console.log("Closed socket "+which);
            var index = this.mConnected.indexOf(which);
            if (index != -1) {
                this.mConnected.splice(index,1);
            }
            // FIXME: Shouldn't there be some transparent reconnect?
            // What do we do if only one of the streams closes (network error?)
            for (var i in this.mSubstreams) {
                this.mSubstreams[i].callListeners(null);
            }
        };
        /**
         * A remote connection was established. Sends all messages in the
         * queue on this single socket, since other sockets have not yet been
         * established. This might not always be ideal, so maybe timeouts would
         * work better.
         * @param {number} which  Which socket finished connecting.
         * @private
         */
        Kata.TCPSST.prototype._onOpen = function (which) {
            if (network_debug) console.log("Opened socket "+which);

            clearTimeout(this.mSockets[which]._timeout);
            delete this.mSockets[which]._timeout;

            this.mConnected.push(which);
            for (var i = 0; i < this.mMessageQueue.length; i++) {
                this.mSockets[which].send(this.mMessageQueue[i]);
            }
            this.mMessageQueue = new Array;
            // Set this.mConnected = true; send anything waiting in queue.
        };

        Kata.TCPSST.prototype._onError = function (which) {
            delete this.mSockets[which];

            for (var i in this.mSubstreams) {
                this.mSubstreams[i].callListeners(null);
            }
        };

        /**
         * Received data on one of our sokets.
         * @param {number} which  Which socket got some data.
         * @param {string} b64data  Received some ASCII data (usually base64).
         * @private
         */
        Kata.TCPSST.prototype._onMessage = function (which, b64data) {
            var percent = b64data.indexOf('%');
            var streamnumber = parseInt(b64data.substr(0,percent), 16);
            b64data = b64data.substr(percent+1);
            //console.log("Receive from socket "+which+" stream "+streamnumber+":",b64data);

            // FIXME: How do we detect a "close" message?

            if (!this.mSubstreams[streamnumber]) {
                var substream = new Kata.TCPSST.Substream(this, streamnumber);
                this.mSubstreams[streamnumber] = substream;
            }
            this.mSubstreams[streamnumber].callListeners(b64data);
        };
        /**
         * Sends a message over the WebSocket connection
         * @param streamid  Which stream number (allocated by Substream)
         * @param base64data  Any ASCII data (binary data not yet supported).
         */
        Kata.TCPSST.prototype.send = function (streamid, base64data) {
            //console.log("Send to socket stream "+streamid+":",base64data);
            var finalString = streamid.toString(16)+"%"+base64data;

            if (this.mConnected.length == 0) {
                this.mMessageQueue.push(finalString);
                return;
            }
            var randsock = this.mSockets[this.mConnected[Math.floor(
                Math.random()*this.mConnected.length)]];
            randsock.send(finalString);
        };
        /**
         * Picks a new substream ID. Does not yet clean up old substreams.
         * Doing this is tricky because you need to receive acknowledgement
         * from all open connections before it can be reused.
         * @return {number} A new substream ID.
         * @private
         */
        Kata.TCPSST.prototype._getNewSubstreamID = function () {
            var ret = this.mNextSubstream;
            this.mNextSubstream += 2;
            return ret;
        };
        /**
         * Allocates a new Substream using the next available substream ID.
         * @return {Kata.TCPSST.Substream} A new Channel that can send/receive.
         */
        Kata.TCPSST.prototype.clone = function () {
            var id = this._getNewSubstreamID();
            var substr = new Kata.TCPSST.Substream(this, id);
            this.mSubstreams[id] = substr;
            return substr;
        };

        /**
         * A single substream which is able to send/receive messages.
         * @constructor
         * @extends Kata.Channel
         * @param {Kata.TCPSST} tcpsst  The top-level stream.
         * @param {number} which  This stream id (for sending messages).
         */
        Kata.TCPSST.Substream = function (tcpsst, which) {
            this.mOwner = tcpsst;
            this.mWhich = which;
            Kata.Channel.call(this);
        };
        Kata.extend(Kata.TCPSST.Substream, Kata.Channel.prototype);

        /**
         * Send ASCII (usually base64 encoded) data over this substream
         */
        Kata.TCPSST.Substream.prototype.sendMessage = function (data) {
            this.mOwner.send(this.mWhich, data);
        };
        /**
         * @return {Kata.TCPSST}  The owning top-level stream.
         */
        Kata.TCPSST.Substream.prototype.getTopLevelStream = function () {
            return this.mOwner;
        };
        /**
         * Close and clean-up this substream. Not yet implemented!!!
         * Send a packet on stream 0 with the contents equal to this stream id?
         */
        Kata.TCPSST.Substream.prototype.close = function () {
            // FIXME: How do we send a "close" message?
        };

    } else {
        Kata.warn("WebSockets not available.");
    }

}, 'katajs/network/TCPSST.js');
