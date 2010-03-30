/*  Kata Javascript Utilities
 *  WebWorker.js
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
    var WEB_WORKERS_ENABLED = false;

    function getErrorCallback(thus) {
        return function(ev) {
            thus.gotError(ev.message, ev.filename, ev.lineno);
        }
    }

    // public final class WebWorker
    if (WEB_WORKERS_ENABLED && typeof(Worker)!="undefined") {
        /** @constructor */
        Kata.WebWorker = function (jsFile, clsName, args) {
            this.mWorker = new Worker("GenericWorker.js");
            this.mWorker.onerror = getErrorCallback(this);
            this.mWorker.postMessage([Kata.scriptRoot, jsFile, clsName, args]);
            this.mChannel = new Kata.WebWorker.Channel(this.mWorker);
        }
    } else {
        /** @constructor */
        Kata.WebWorker = function (jsFile, clsName) {
            this.mChannel = new Kata.SimpleChannel;
            var clsTree = clsName.split(".");
            Kata.include(jsFile);
            var cls = self;
            for (var i = 0; cls && i < clsTree.length; i++) {
                cls = cls[clsTree[i]];
            }
            if (cls) {
                this.mChild = new cls (new Kata.SimpleChannel(this.mChannel));
            } else {
                Kata.error(clsName+" is undefined.");
            }
        }
    }

    Kata.WebWorker.prototype.getChannel = function() {
        return this.mChannel;
    }
    Kata.WebWorker.prototype.gotError = function (data,file,line) {
        console.log("ERROR at "+file+":"+line+": "+data);
    };

    function getCallback(thus) {
        return function(ev) {
            thus.callListeners(ev.data);
        };
    }
})();
(function() {
    var SUPER = Kata.Channel.prototype;
    /**
     * WebWorker.Channel is a channel that uses the postMessage function
     * and the onmessage listener defined as part of the Worker interface and
     * the DedicatedWorkerGlobalScope interface (if you pass in 'self')
     * @constructor
     */
    Kata.WebWorker.Channel = function (port) {
        SUPER.constructor.call(this);
        this.mMessagePort = port;
        this.mMessagePort.onmessage = getCallback(this);
    };
    Kata.extend(Kata.WebWorker.Channel, SUPER);

    Kata.WebWorker.Channel.prototype.sendMessage = function (data) {
        this.mMessagePort.postMessage(data);
    };

})();
