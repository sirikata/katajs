/*  Kata Javascript Utilities
 *  QueryTracker.js
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

if (typeof Sirikata == "undefined") { Sirikata = {}; }

(function() {

// Multiplexer on header.id from one socket to several.
// Does this concept even make sense?
// Why not use unique ports for this purpose?

    var SUPER = Kata.Socket.prototype;
    /**
     * QueryTracker sends messages on a single socket using the "id" field for
     * messages sent and the "reply_id" for messages received.
     * @constructor
     * @extends {Kata.Socket}
     * @param {Kata.Port} socket  A parent socket/port.
     */
    Sirikata.QueryTracker = function (socket) {
        SUPER.constructor.call(this, socket);
        this.mNextId = 0;
        this.mPendingMessages = {};
    };
    Kata.extend(Sirikata.QueryTracker, SUPER);

    /**
     * Sends a message and sets the "id" field to the next available message
     * id.
     * @note Make sure not to send the same Message object twice.
     * @param {Sirikata.QueryTracker.Message} message  Completed message--the
     *     header.id field will be set before it is sent.
     */
    Sirikata.QueryTracker.prototype.send = function (message) {
        var header = message.header();
        var id = this.mNextId;
        header.id = PROTO.I64.fromNumber(id);
        this.mNextId++;
        this.mPendingMessages[id] = message;
        SUPER.send.call(this, header, message.body());
    };

    /**
     * Parses a message received from the network, using the "reply_id" field.
     * @param {Sirikata.Protocol.Header} header  Received message header.
     * @param {string} body  Base64-encoded body data.
     */
    Sirikata.QueryTracker.prototype.receivedMessage = function (header, body) {
        var replyId = header.reply_id.toNumber();
        var message = this.mPendingMessages[replyId];
        //console.log("QueryTracker recieved message, replyID is "+replyId+", header is ",header,"body",body);
        var sentHeader = message.header();
        if ((//sentHeader.destination_space != header.source_space ||
             sentHeader.destination_object != header.source_object ||
             (sentHeader.destination_port||0) != (header.source_port||0))) {
            console.log("QueryTracker is ignoring message from wrong sender, sentHeader:", sentHeader, "headeris:", header);
            return; // Ignore reply from wrong object.
        }
        if (!message.receivedMessage(header, body)) {
            delete this.mPendingMessages[replyId];
        }
    };
    /**
     * Cleans up this QueryTracker instance.
     */
    Sirikata.QueryTracker.prototype.destroy = function() {
        SUPER.destroy.call(this);
        delete this.mPendingMessages;
    }

    /**
     * A message holds onto the header and body of a message that has been sent
     * and is awaiting a reply. In the future, this will handle timeouts and
     * resending to provide a reliable transport. Currently, the underlying
     * protocol is assumed to be reliable.
     * @constructor
     * @param {Sirikata.Protocol.Header} header Any header
     * @param {PROTO.Message} body
     * @param {function(Sirikata.Protocol.Header,string): boolean} callback
     *     Takes the new header and base64 body data; returns true if it expects
     *     more data, or false if this Message is to be discarded.
     */
    Sirikata.QueryTracker.Message = function(header, body, callback) {
        this.mHeader = header;
        this.mBody = body;
        this.mCallback = callback;
    };

    /**
     * Changes the callback for this message.
     * @param {function(Sirikata.Protocol.Header,string): boolean} callback
     *     See constructor.
     */
    Sirikata.QueryTracker.Message.prototype.setCallback = function(callback) {
        this.mCallback = callback;
    };
    /** @return {Sirikata.Protocol.Header} The header sent in this mesasge. */
    Sirikata.QueryTracker.Message.prototype.header = function() {
        return this.mHeader;
    };
    /** @return {PROTO.Message} An unencoded protocol buffer body message. */
    Sirikata.QueryTracker.Message.prototype.body = function() {
        return this.mBody;
    };
    /**
     * Received a message from the QueryTracker.
     * @param {Sirikata.Protocol.Header} header The header of the reply message
     * @param {string} body  Base64 encoded body data to be passed to callback.
     * @return {boolean} true if message is to stay in map.
     */
    Sirikata.QueryTracker.Message.prototype.receivedMessage = function(header, body) {
        if (this.mCallback && header) {
            return this.mCallback(header, body);
        }
        return false;
    };

})();
