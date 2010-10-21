/*  Kata Javascript Network Layer
 *  ObjectHostWorker.js
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
    'katajs/oh/ObjectHost.js'
], function() {

    /** A worker thread to instantiate an ObjectHost and manage the channel to
     * the main thread and the graphics system (which may be multiplexed?).
     * This class is only ever created by Kata.MainThread.
     * @constructor
     * @param {Kata.Channel=} graphicsChannel A channel to Kata.MainThread.
     */
    Kata.ObjectHostWorker = function (graphicsChannel, blessed_args) {
        this.mObjectHost = new Kata.ObjectHost(blessed_args.script, blessed_args.method, blessed_args.args);

        this.mObjectHost.registerSimulation(graphicsChannel, "graphics");

        // Physics not implemented yet...
        //this.mPhysicsWorker = new WebWorker("PhysicsSimulation.js", "PhysicsSimulation");
        //var physicsChannel = new WebWorkerChannel(this.mPhysicsWorker);
        //this.mObjectHost.registerSimulation(physicsChannel, "physics");
    };

}, 'katajs/oh/ObjectHostWorker.js');
