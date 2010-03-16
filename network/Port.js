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

(function() {
    Kata.Port=function (service) {
        this.mReceivers = [];
        this.mService = serv;
    };

    Kata.Port.prototype.addReceiver = function(func) {
        this.mReceivers.push(func);
    };
    Kata.Port.prototype.removeReceiver = function(func) {
        for (var i = 0; i < this.mReceivers.length; i++) {
            if (this.mReceivers[i] == func) {
                this.mReceivers.splice(i,1);
            }
        }
    };
    Kata.Port.prototype.send = function() {
        this.mService.send.apply(this.mService, arguments);
    };
    Kata.Port.prototype.deliver = function(args) {
        for (var i = 0; i < this.mReceivers.length; i++) {
            if (this.mReceivers[i].apply(this, args)) {
                break;
            }
        }
    };

})();
