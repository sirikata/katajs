/*  Kata Javascript Network Layer
 *  MainThread.js
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
    'katajs/core/Channel.js',
    'katajs/core/WebWorker.js'
], function() {

    /** MainThread is a class to instantiate an ObjectHost thread and hold onto
     * the multiplexed channel coming from it. This channel can be used to
     * spawn Kata.GraphicsSimulation objects, or to communicate to the OH.
     * @constructor
     */
    Kata.MainThread = function (blessed_script, blessed_class, blessed_args) {
        // FIXME this should select FakeWebWorker or WebWorker based on whether
        // the necessary objects (e.g. WebSocket) are available in WebWorkers.
        this.mObjectHostWorker = new Kata.FakeWebWorker("katajs/oh/ObjectHostWorker.js", "Kata.ObjectHostWorker",
                                                    {script : blessed_script, method : blessed_class, args : blessed_args}
                                                   );
        this.mObjectHostChannel = this.mObjectHostWorker.getChannel();
        this.mObjectHostChannel.registerListener(Kata.bind(this.receivedMessage, this));
        this.mObjectHostWorker.go();
    };

    /**
     * @return {Kata.Channel} Some channel to talk to ObjectHost. This should
     *     be multiplexed but isn't at the moment...
     */
    Kata.MainThread.prototype.getChannel = function() {
        return this.mObjectHostChannel;
    };

    /**
     * Not really useful. May be for multiplexing the OH channel?
     */
    Kata.MainThread.prototype.receivedMessage = function(channel, data) {
        //console.log("Kata.MainThread received ObjectHost message:",data);
    };

}, 'katajs/oh/MainThread.js');
