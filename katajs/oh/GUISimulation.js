/*  Kata Javascript Network Layer
 *  GUISimulation.js
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
"use strict";

Kata.require([
    'katajs/oh/Simulation.js'
], function() {
    var SUPER = Kata.Simulation.prototype;
    /** GUISimulation is a simple wrapper for the base Simulation
     * class which decodes GUI messages before passing them on for
     * handling, and properly ignores other messages.
     * @constructor
     * @param {Kata.Channel} channel  A channel to the object host.
     */
    Kata.GUISimulation = function (channel) {
        SUPER.constructor.call(this, channel);
    };
    Kata.extend(Kata.GUISimulation, SUPER);

    /**
     * Received a message from the object host. Override this method.
     * @param {Kata.Channel} channel  The sender. Usually equals this.mChannel.
     * @param {object} data  A message usually in JavascriptGraphicsApi format.
     */
    Kata.GUISimulation.prototype.receivedMessage = function (channel, data) {
        if (data.__gui) {
            this.handleGUIMessage(data.__gui);
        }
    };


    Kata.GUISimulation.prototype.handleGUIMessage = function (channel, data) {
    };

}, 'katajs/oh/GUISimulation.js');
