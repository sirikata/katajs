/*  kata3d Javascript Utilities
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
 *  * Neither the name of kata3d nor the names of its contributors may
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

if (typeof(Kata) == "undefined") {Kata = {};}
(function() {

    function getMessageCallback(thus, which) {
        return function(ev) {
            thus._onMessage(which, ev.data);
        }
    }

    function getOpenCallback(thus, which) {
        return function(ev) {
            thus._onOpen(which);
        }
    }

    function getCloseCallback(thus, which) {
        return function(ev) {
            thus._onClose(which);
        }
    }

    Kata.Base64Stream = PROTO.Base64Stream;

    if (typeof(WebSocket)!="undefined") {
        // public final class TCPSST
        /** @constructor */
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
            this.mNextSubstream = 16777217; // 1
            this.mSubstreams = new Object;
        };

        Kata.TCPSST.prototype._connectSocket = function (which) {
            if (this.mSockets[which] && this.mSockets[which].readyState == WebSocket.CONNECTED) {
                this.mConnected--;
            }
            var sock = new WebSocket(this.mURI);
            sock.onopen = getOpenCallback(this, which);
            sock.onclose = getCloseCallback(this, which);
            sock.onmessage = getMessageCallback(this, which);
            this.mSockets[which] = sock;
        };
        Kata.TCPSST.prototype._onClose = function (which) {
            console.log("Closed socket "+which);
            var index = this.mConnected.indexOf(which);
            if (index != -1) {
                this.mConnected.remove(index);
            }
            // FIXME: Shouldn't there be some transparent reconnect?
            // What do we do if only one of the streams closes (network error?)
            for (var i in this.mSubstreams) {
                this.mSubstreams[i].callListeners(null);
            }
        };
        Kata.TCPSST.prototype._onOpen = function (which) {
            console.log("Opened socket "+which);
            /*
            {
                var sock = this.mSockets[which];
                var whichstr = which.toString(16);
                while (whichstr.length < 2) {
                    whichstr = "0"+whichstr;
                }
                sock.send("TCPSST"+whichstr+this.mUUID);
            }
            */
            this.mConnected.push(which);
            for (var i = 0; i < this.mMessageQueue.length; i++) {
                this.mSockets[which].send(this.mMessageQueue[i]);
            }
            this.mMessageQueue = new Array;
            // Set this.mConnected = true; send anything waiting in queue.
        };
        Kata.TCPSST.prototype._onMessage = function (which, b64data) {
            var percent = b64data.indexOf('%');
            var streamnumber = parseInt(b64data.substr(0,percent), 16);
            // Uncomment for base64 encoded lengths.
            //var streamnumber = PROTO.int32.ParseFromStream(stream);
            var stream = new Kata.Base64Stream(b64data.substr(percent+1));
            console.log("Message to socket "+which+" stream "+streamnumber+": "+b64data);

            // FIXME: How do we detect a "close" message?

            /* b64data may be misaligned. Do something with stream. */
            if (!this.mSubstreams[streamnumber]) {
                var substream = new Kata.TCPSST.Substream(this, streamnumber);
                this.mSubstreams[streamnumber] = substream;
            }
            this.mSubstreams[streamnumber].callListeners(stream);
        };
        Kata.TCPSST.prototype.send = function (streamid, base64data) {
            // Commented code is for base64 encoded lengths.
            /*
            var streamidStream = new Kata.Base64Stream();
            PROTO.int32.SerializeToStream(streamid, streamidStream);

            var finalString =
                streamidStream.getString().replace("=", "A")
                + base64data;
            */
            var finalString = streamid.toString(16)+"%"+base64data;

            if (this.mConnected.length == 0) {
                this.mMessageQueue.push(finalString);
                return;
            }
            var randsock = this.mSockets[this.mConnected[Math.floor(
                Math.random()*this.mConnected.length)]];
            randsock.send(finalString);
        };
        Kata.TCPSST.prototype._getNewSubstreamID = function () {
            var ret = this.mNextSubstream;
            this.mNextSubstream += 2;
            return ret;
        };
        Kata.TCPSST.prototype.clone = function () {
            var id = this._getNewSubstreamID();
            var substr = new Kata.TCPSST.Substream(this, id);
            this.mSubstreams[id] = substr;
            return substr;
        };

        // final class TCPSST.Substream extends Channel
        /** @constructor */
        Kata.TCPSST.Substream = function (tcpsst, which) {
            this.mOwner = tcpsst;
            this.mWhich = which;
        };
        Kata.TCPSST.Substream.prototype = new Kata.Channel;

        Kata.TCPSST.Substream.prototype.sendMessage = function (data) {
            this.mOwner.send(this.mWhich, data);
        };
        Kata.TCPSST.Substream.prototype.close = function () {
            // FIXME: How do we send a "close" message?
        };

    }

})();

