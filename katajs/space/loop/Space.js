/*  KataJS
 *  Space.js
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
Kata.include("katajs/core/Math.uuid.js");

(function() {

     /** A simple loopback space.  To simulate a network, the loopback
      * space delays all calls with a timeout.
      *
      * @constructor
      * @param {Kata.URL} spaceurl the URL of this space
      */
     Kata.LoopbackSpace = function(spaceurl) {
         // First try to add to central registery
         if (Kata.LoopbackSpace.spaces[spaceurl.host])
             Kata.warn("Overwriting static LoopbackSpace map entry for " + spaceurl);
         Kata.LoopbackSpace.spaces[spaceurl.host] = this;

         this.netdelay = 10; // Constant delay, in milliseconds

         this.mObjects = {};
     };

     /** Static map of local spaces, used to allow
      *  LoopbackSpaceConnection to discover these spaces.
      *  See LoopbackSpaceConnection.js for details on this use.
      */
     Kata.LoopbackSpace.spaces = {};

     /** Request an object to be connected, and call cb on completion.
      */
     Kata.LoopbackSpace.prototype.connectObject = function(id, cb) {
         self = this;
         setTimeout(
             function() {
                 self._connectObject(id, cb);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace.prototype._connectObject = function(id, cb) {
         var uuid = Math.uuid();
         var obj =
             {
                 uuid : uuid,
                 loc : {
                     pos : [0, 0, 0],
                     vel : [0, 0, 0],
                     acc : [0, 0, 0]
                 },
                 bounds : {
                     min : [0, 0, 0],
                     max : [0, 0, 0]
                 }
             };
         this.mObjects[uuid] = obj;
         var obj_loc = obj.loc; // FIXME clone
         var obj_bounds = obj.bounds; // FIXME clone
         cb(id, uuid, obj_loc, obj_bounds);
     };

})();