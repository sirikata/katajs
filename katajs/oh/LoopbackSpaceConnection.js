/*  KataJS
 *  LoopbackSpaceConnection.js
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

Kata.include("katajs/oh/SpaceConnection.js");
Kata.include("katajs/oh/ObjectHost.js");

// See note about how connections work. Generally connection classes
// shouldn't include anything from a space implementation (and
// generally can't since the space implementation is not available.
Kata.include("katajs/space/loop/Space.js");

(function() {

     var SUPER = Kata.SpaceConnection.prototype;
     /** Kata.LoopbackSpaceConnection is an implementation of
      * Kata.SpaceConnection which connects to a local space server,
      * i.e. one running in a WebWorker in the same browser.
      *
      * @constructor
      * @param {Kata.ObjectHost} oh the owner ObjectHost.
      * @param {Kata.URL} spaceurl URL of the space to connect to
      */
     Kata.LoopbackSpaceConnection = function (oh, spaceurl) {
         SUPER.constructor.call(this, oh);

         // LoopbackSpaceConnection uses an unusual mechanism for
         // connections. Since they are local, there's no network
         // connection we can create to connect to the space.  Instead,
         // the space registers itself in a global variable (within
         // Kata.LoopbackSpace). We just lookup that object and make async
         // calls to it.
         this.mSpace = Kata.LoopbackSpace.spaces[spaceurl.host];
         this.mSpaceURL = spaceurl;
         if (!this.mSpace)
             Kata.error("Couldn't find loopback space: " + spaceurl.toString());
     };
     Kata.extend(Kata.LoopbackSpaceConnection, Kata.SpaceConnection.prototype);

     Kata.LoopbackSpaceConnection.prototype.connectObject = function(id, auth) {
         this.mSpace.connectObject(
             id,
             Kata.bind(this.connectResponse, this)
         );
     };

     Kata.LoopbackSpaceConnection.prototype.connectResponse = function(id, object, loc, bounds) {
         if (object) // FIXME real presence_id below
             this.mObjectHost.connectionResponse(id, true, {space : this.mSpaceURL, object : object}, loc, bounds);
         else
             this.mObjectHost.connectionResponse(id, false);
     };


     Kata.ObjectHost.registerProtocolHandler("loop", Kata.LoopbackSpaceConnection);
})();