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

Kata.require([
    'katajs/oh/Simulation.js'
], function() {

    var SUPER = Kata.Simulation.prototype;
    /** GraphicsSimulation is a wrapper around katajs. It must be instantiated
     * on the main DOM thread, using the channel to the ObjectHost thread.
     * Because there is only one main thread (and hence only one channel to the
     * ObjectHost thread), this channel should be multiplexed to allow multiple
     * simulations on the main thread.
     *
     * @constructor
     * @extends {Kata.Simulation}
     * @param {string} driver Graphics driver to use for the simulation.
     * @param {Kata.Channel} channel  Communication with the object host.
     * @param {HTMLElement} domElement  Some parent element to display inside.
     */
    Kata.GraphicsSimulation = function (driver, channel, domElement) {
        SUPER.constructor.call(this, channel);
        this.mElement = domElement;

        var cons = this.constructor;
        if (cons._drivers == undefined) {
            Kata.error("No graphics drivers available.");
        }

        drv = cons._drivers[driver];
        if (drv == undefined) {
            Kata.error('No graphics driver called "' + driver + '" available.');
        }
        this.mGFX = new drv(function(obj){},domElement);
        this.mGFX.setInputCallback(Kata.bind(this._handleInputMessage,this));
    };

    Kata.GraphicsSimulation.YFOV_DEGREES = 23.3;
    Kata.GraphicsSimulation.CAMERA_NEAR = 0.1;
    Kata.GraphicsSimulation.CAMERA_FAR = 2000.0;
    Kata.GraphicsSimulation.DRAG_THRESHOLD = 5; // pixels
    
    Kata.extend(Kata.GraphicsSimulation, SUPER);

    /** Handle receiving a cross-thread message
     * @param {Kata.Channel} channel Channel to the object host (in order to
     *     talk to controlling camera objects)
     * @param {object} data JavascriptGraphicsApi formatted messages from the
     *     object host.
     */
    Kata.GraphicsSimulation.prototype.receivedMessage = function (channel, data) {
        // FIXME gui messages share this channel
        if (data.__gui) return;
        data = Kata.ScriptProtocol.FromScript.reconstitute(data);
        SUPER.receivedMessage.apply(this, arguments);
//        console.log("Graphics received message from ObjectHost:", data, data.msg);
        this.mGFX.send(data);
    };

     /** Register a class as a type of underlying driver.
      *  @param {string} type string describing the type of driver
      *  @param {object} klass constructor for the driver
      */
     Kata.GraphicsSimulation.registerDriver = function(type, klass) {
         if (this._drivers == undefined) {
             this._drivers = {};
         }
         this._drivers[type] = klass;
     };

    /** Have the GraphicsSimulation do any static initialization that
     *  has to be performed before the simulation actually begins.
     *  For instance, this will usually involve setting up the
     *  rendering context in the DOM.  The last parameter is a
     *  callback that will be invoked when the GraphicsSimulation is
     *  preparted to start running.
     */
    Kata.GraphicsSimulation.initializeDriver = function(type) {
        if (!this._drivers || !this._drivers[type]) {
            Kata.error("Couldn't find graphics driver: " + type);
            return;
        }
        var klass = this._drivers[type];
        var new_args = new Array(arguments.length-1);
        for(var i = 1; i < arguments.length; i++)
            new_args[i-1] = arguments[i];
        klass.initialize.apply(undefined, new_args);
    };

    /**
     * handle input data from graphics driver
     */
     Kata.GraphicsSimulation.prototype._handleInputMessage = function(msg){
//         console.log("GraphicsSimulation._handleInputMessage:",msg);
         this.mChannel.sendMessage(new Kata.ScriptProtocol.ToScript.GUIMessage(msg));
     };
}, 'katajs/oh/GraphicsSimulation.js');
