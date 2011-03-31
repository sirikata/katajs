/*  Kata Javascript Utilities
 *  SimpleChannel.js
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
    'katajs/core/Channel.js'
], function() {

    var SUPER = Kata.Channel.prototype;
    /**
     * One half of a simple two-way communication channel. These objects are
     * usually created in pairs.
     * @constructor
     * @extends {Kata.Channel}
     * @param {Kata.SimpleChannel=} partner  The channel to pair up with.
     */
    Kata.SimpleChannel = function (partner) {
        SUPER.constructor.call(this);
        if (partner) {
            this.pair(partner);
        }
    };
    Kata.extend(Kata.SimpleChannel, SUPER);

    /**
     * Pairs this SimpleChannel with another one. Usually called by the
     * constructor.
     * @param {Kata.SimpleChannel} otherChannel  The channel to pair up with.
     */
    Kata.SimpleChannel.prototype.pair = function (otherChannel) {
        if (!(otherChannel instanceof Kata.SimpleChannel)) {
            console.error("otherChannel "+otherChannel+" is not instance of SimpleChannel");
            throw "Error in SimpleChannel.pair";
        }
        otherChannel.mPartner = this;
        this.mPartner = otherChannel;
    };
    /**
     * Sends a message to the partner SimpleChannel.
     * @param {string|object} data  Any data to be sent to the partner.
     */
    /// dbm: this is what's being used presently for local message passing (as of 7/27/10)
    Kata.SimpleChannel.prototype.sendMessage = function (data) {
        if (Kata.FAKE_WEB_WORKERS_DEBUG) {
            data = JSON.parse(JSON.stringify(data/*), 
                                             function (key, value) {
                                                 return this[key] instanceof Date ?
                                                     'Date(' + this[key] + ')' : value;
                                             }*/),
                              function (key, value) {
                                  var a;
                                  if (typeof value === 'string') {
                                      a =
                                          /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                                      if (a) {
                                          return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                                                                   +a[5], +a[6]));
                                      }
                }
                                  return value;
                              });
        }
        this.mPartner.callListeners(data);
    };

}, 'katajs/core/SimpleChannel.js');
