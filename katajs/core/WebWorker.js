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


Kata.require([
    'katajs/core/SimpleChannel.js'
], function() {
    /** @variable {boolean} If true, uses Workers on supported Javascript
     * engines. If false, never uses workers, and runs code synchronously.
     */
    // In WebKit, debugging webworkers breaks nested workers.
    if (Kata.WEB_WORKERS_ENABLED === undefined) {
        Kata.WEB_WORKERS_ENABLED = true; //typeof(importScripts)==='undefined';        
    }
    
    if (Kata.FAKE_WEB_WORKERS_DEBUG === undefined) {//turns on if serialization happens for the fake workers. Set to true for now, so we test things adequately, but we want to turn it off for deployment if fake workers are used
        Kata.FAKE_WEB_WORKERS_DEBUG = true; //typeof(importScripts)==='undefined';        
    }
    if (Kata.WEB_WORKERS_BOOTSTRAP_SCRIPT === undefined) {
        Kata.WEB_WORKERS_BOOTSTRAP_SCRIPT = false; //typeof(importScripts)==='undefined';        
    }

    // Always provide Kata.FakeWebWorker so we'll have a uniform interface in
    // case we need to use not use real WebWorkers, e.g. if a browser does not
    // provide WebSocket access to WebWorkers.

    /**
     * WebWorker is a class to create another subprocess, and manage the
     * bootstrapping process, in this case when Workers are disabled.
     * To avoid race conditions, the code is not executed until you call
     * the go() method on this WebWorker object.
     * @constructor
     * @param {string} jsFile  An initial javascript file to be imported.
     * @param {string} clsName  A dot-separated path to the class from
     *     "self" (the root object). Actual classes can not be sent across
     *     the thread boundary, which is why this needs the name.
     * @param {*} args  Primitive data to instantiate the class with.
     */
    Kata.FakeWebWorker = function (jsFile, clsName, args) {
        this.mChannel = new Kata.SimpleChannel;
        this.mArgs = args;
        this.mClassName = clsName;
        this.mJSFile = jsFile;
        if (network_debug) console.log("new webworker");
    };
    /** Runs the WebWorker. At this point, it is possible to receive a
     *  message synchronously, so make sure to set up all listeners before
     *  calling the go method.
     */
    Kata.FakeWebWorker.prototype.go = function() {
        var opposingChannel=new Kata.SimpleChannel(this.mChannel);
        if (!this.mClassName || !this.mArgs) {
            Kata.error("WebWorker.go() called twice");
            return;
        }
        var args = this.mArgs;
        var clsName = this.mClassName;
        var clsTree = clsName.split(".");
        delete this.mClassName;
        delete this.mArgs;
        Kata.require(
            [this.mJSFile],
            function() {
                var cls = self;
                for (var i = 0; cls && i < clsTree.length; i++) {
                    cls = cls[clsTree[i]];
                }
                if (!cls) {
                    Kata.error(clsName+" is undefined:" + this.mJSFile);
                }
                if (network_debug) console.log("going!");
                this.mChild = new cls (
                    opposingChannel,
                    args);
            });
    };

    /**
     * @return {Kata.Channel} The Channel to correspond with the worker.
     * You should subscribe listeners to this channel before executing, but
     * you cannot send any messages until you have called the go() method.
     */
    Kata.FakeWebWorker.prototype.getChannel = function() {
        return this.mChannel;
    };
    /**
     * Report an error sent from the worker. This is the only way for error
     * information to be propegated to the master thread.
     *
     * @param data  Some error message
     * @param file  Javascript filename
     * @param line  Javascript line number
     */
    Kata.FakeWebWorker.prototype.gotError = function (data,file,line) {
        Kata.error("ERROR at "+file+":"+line+": "+data);
    };

    // Define a Channel for FakeWebWorker.

    function getCallback(thus) {
        return function(ev) {
            thus.callListeners(ev.data);
        };
    }

    var SUPER = Kata.Channel.prototype;
    /**
     * WebWorker.Channel is a channel that uses the postMessage function
     * and the onmessage listener defined as part of the Worker interface and
     * the DedicatedWorkerGlobalScope interface (if you pass in 'self')
     * @constructor
     * @extends {Kata.Channel}
     * @param {DedicatedWorkerGlobalScope|Worker} port  Object implementing the
     *     MessagePort interface (see the Web Workers specification).
     */
    Kata.FakeWebWorker.Channel = function (port) {
        SUPER.constructor.call(this);
        this.mMessagePort = port;
        this.mMessagePort.onmessage = getCallback(this);
    };
    Kata.extend(Kata.FakeWebWorker.Channel, SUPER);

    /**
     * @return {string|object} Some data to be sent across the thread boundary.
     */
    Kata.FakeWebWorker.Channel.prototype.sendMessage = function (data) {
        this.mMessagePort.postMessage(data);
    };


    // And finally, figure out what to do about WebWorker.  If possible, use
    // native WebWorkers.  If not, just alias FakeWebWorker.  In both cases,
    // the FakeWebWorker channel class is reusable.

    function getErrorCallback(thus) {
        return function(ev) {
            thus.gotError(ev.message, ev.filename, ev.lineno);
        };
    }

    if (Kata.WEB_WORKERS_ENABLED && typeof(Worker)!="undefined") {
        /**
         * WebWorker is a class to create another subprocess, and manage the
         * bootstrapping process when Workers are enabled.
         * To avoid race conditions, the code is not executed until you call
         * the go() method on this WebWorker object.
         * @see GenericWorker.js
         * @constructor
         * @param {string} jsFile  An initial javascript file to be imported.
         * @param {string} clsName  A dot-separated path to the class from
         *     "self" (the root object). Actual classes can not be sent across
         *     the thread boundary, which is why this needs the name.
         * @param {*} args  Primitive data to instantiate the class with.
         */
        Kata.WebWorker = function (jsFile, clsName, args) {
            if (Kata.bootstrapWorker===undefined)
                this.mWorker = new Worker(Kata.scriptRoot+"katajs/core/GenericWorker.js"+Kata.queryString);
            else
                this.mWorker = new Worker(Kata.bootstrapWorker);
            this.mWorker.onerror = getErrorCallback(this);
            this.mInitialMessage = [
                Kata.scriptRoot,
                Kata.bootstrapWorker===undefined?undefined:Kata.bootstrapWorker,
                jsFile,
                clsName,
                args,
                Kata.queryString];
            this.mChannel = new Kata.WebWorker.Channel(this.mWorker);
        };
        /** Runs the WebWorker. At this point, it is possible to receive a
         *  message synchronously, so make sure to set up all listeners before
         *  calling the go method.
         */
        Kata.WebWorker.prototype.go = function() {
            var initMsg = this.mInitialMessage;
            delete this.mInitialMessage;
            if (!(Kata.bootstrapWorker===undefined))
                this.mWorker.postMessage(Kata.scriptRoot+"katajs/core/GenericWorker.js"+Kata.queryString);            
            this.mWorker.postMessage(initMsg);
        };

        Kata.WebWorker.prototype.getChannel = Kata.FakeWebWorker.prototype.getChannel;
        Kata.WebWorker.prototype.gotError = Kata.FakeWebWorker.prototype.gotError;

        Kata.WebWorker.Channel = Kata.FakeWebWorker.Channel;
    } else {
        Kata.WebWorker = Kata.FakeWebWorker;
    }
}, 'katajs/core/WebWorker.js');
