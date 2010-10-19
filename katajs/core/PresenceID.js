/*  Kata Javascript Utilities
 *  PresenceID.js
 *
 *  Copyright (c) 2010, Ewen Cheslack-Postava
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
    'katajs/core/SpaceID.js',
    'katajs/core/ObjectID.js'
], function() {

    /** PresenceID is just a combination of SpaceID and ObjectID, giving a fully
     * qualified name for an object in a space.
     * @constructor
     */
    Kata.PresenceID = function() {
        if (arguments.length == 1) {
            if (arguments[0].mSpace && arguments[0].mObject) {
                this.mSpace = arguments[0].mSpace;
                this.mObject = arguments[0].mObject;
            }
            else {
                throw "Invalid PresenceID constructor arguments.";
            }
        }
        else if (arguments.length == 2 && arguments[0] && arguments[1]) {
            this.mSpace = arguments[0];
            this.mObject = arguments[1];
        }
        else {
            throw "Invalid PresenceID constructor arguments.";
        }
    };

    Kata.PresenceID.prototype.space = function() {
        return this.mSpace;
    };

    Kata.PresenceID.prototype.object = function() {
        return this.mObject;
    };

    Kata.PresenceID.prototype.toString = function() {
        return 'PresenceID(' + this.mSpace.toString() + ':' + this.mObject.toString() + ')';
    };

    Kata.PresenceID.nil = function() {
        return new Kata.PresenceID(Kata.SpaceID.nil(), Kata.ObjectID.nil());
    };

    Kata.PresenceID.any = function() {
        return new Kata.PresenceID(Kata.SpaceID.any(), Kata.ObjectID.any());
    };

}, 'katajs/core/PresenceID.js');
