/*  Kata Javascript
 *  BootstrapScript.js
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
    'katajs/core/Channel.js'
], function() {
     /** A FilterChannel wraps another Channel and gives a callback a
      * chance to filter the message before passing it on to
      * listeners.
      *
      * @constructor
      * @param {Kata.Channel} channel the channel which feeds this one
      * @param {function(Kata.Channel, (string|object))} filter the filter to apply. Takes the same
      * form as a listener but returns a boolean indicating whether to
      * deliver to listeners
      */
     Kata.FilterChannel = function(channel, filter) {
         this._channel = channel;
         this._filter = filter;

         this._channel.registerListener( Kata.bind(this._filterMessage, this) );
     };
     var SUPER = Kata.Channel.prototype;
     Kata.extend(Kata.FilterChannel, SUPER);

     Kata.FilterChannel.prototype.callListeners = function (data) {
         if (!this._filter(this, data)) {
             SUPER.callListeners.apply(this, [data]);
         }
     };

     Kata.FilterChannel.prototype.sendMessage = function (data) {
         this._channel.sendMessage(data);
     };

     Kata.FilterChannel.prototype._filterMessage = function(channel, msg) {
         this.callListeners(msg);
     };

}, 'katajs/core/FilterChannel.js');
