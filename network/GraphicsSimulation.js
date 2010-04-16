/*  Kata Javascript Network Layer
 *  GraphicsSimulation.js
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
Kata.include("Simulation.js");

(function() {

    var SUPER = Kata.Simulation.prototype;
    /** GraphicsSimulation is a wrapper around katajs. It must be instantiated
     * on the main DOM thread, using the channel to the ObjectHost thread.
     * Because there is only one main thread (and hence only one channel to the
     * ObjectHost thread), this channel should be multiplexed to allow multiple
     * simulations on the main thread.
     * 
     * @constructor
     * @extends {Kata.Simulation}
     * @param {Kata.Channel} channel  Communication with the object host.
     * @param {HTMLElement} domElement  Some parent element to display inside.
     */
    Kata.GraphicsSimulation = function (channel, domElement) {
        SUPER.constructor.call(this, channel);
        this.mElement = domElement;
//        this.mGFX = new TextGraphics(function(obj){},domElement.parentNode);
        this.mGFX = new KatajsGraphics(function(obj){},document.body);
    };
    Kata.extend(Kata.GraphicsSimulation, SUPER);

    /** Handle receiving a cross-thread message
     * @param {Kata.Channel} channel Channel to the object host (in order to
     *     talk to controlling camera objects)
     * @param {object} data JavascriptGraphicsApi formatted messages from the
     *     object host.
     */
    Kata.GraphicsSimulation.prototype.receivedMessage = function (channel, data) {
        SUPER.receivedMessage.apply(this, arguments);
        console.log("Graphics received message from ObjectHost:", data);
        this.mGFX.send(data);
    };

})();
