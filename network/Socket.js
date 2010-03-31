/*  Kata Javascript Utilities
 *  Socket.js
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

(function() {

    var SUPER = Kata.Port.prototype;
    /** A socket is a two way communication channel layered over another
     * socket or port. The only difference from a Port object is this class
     * automatically subscribes itself to its parent.
     * @constructor
     * @extends {Kata.Port}
     * @param {Kata.Port} port  A parent port or socket.
     */
    Kata.Socket = function (port) {
        SUPER.constructor.call(this, port);
        this.mParentReceiver = Kata.bind(this.receivedMessage, this);
        // mService is a Port or another Socket instance.
        this.mService.addReceiver(this.mParentReceiver);
    };
    Kata.extend(Kata.Socket, SUPER);

    /** Because sockets are subscribed to their parent, it means that they need
     * to be unsubscribed at some point. Because Port instances are created by
     * services, it is the service's resposibility to clean up after them.
     * However, Sockets are created and extended by user code, and hence must
     * be cleaned up by user code.
     */
    Kata.Socket.prototype.destroy = function () {
        this.mService.removeReceiver(this.mParentReceiver);
        delete this.mService;
        delete this.mParentReceiver;
    }

})();
