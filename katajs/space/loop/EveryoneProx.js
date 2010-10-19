/*  KataJS
 *  EveryoneProx.js
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
], function() {

     if (typeof(Kata.Loopback) == "undefined") { Kata.Loopback = {}; }

     /** A simple prox implementation that returns everyone to all queriers. */
     Kata.Loopback.EveryoneProx = function(space) {
         this.mSpace = space;

         this.mObjects = {};
         this.mQueriers = {};
     };

     Kata.Loopback.EveryoneProx.prototype.addObject = function(uuid) {
         if (this.mObjects[uuid]) return;

         this.mObjects[uuid] = uuid;

         for(var querier in this.mQueriers) {
             if (querier == uuid) continue;
             this.mSpace.proxResult(querier, uuid, true);
         }
     };

     Kata.Loopback.EveryoneProx.prototype.removeObject = function(uuid) {
         if (!this.mObjects[uuid]) return;

         delete this.mObjects[uuid];

         for(var querier in this.mQueriers) {
             if (querier == uuid) continue;
             this.mSpace.proxResult(querier, uuid, false);
         }
     };

     Kata.Loopback.EveryoneProx.prototype.addQuery = function(querier) {
         if (this.mQueriers[querier]) return;

         this.mQueriers[querier] = querier;

         for(var seen in this.mObjects) {
             if (querier == seen) continue;
             this.mSpace.proxResult(querier, seen, true);
         }
     };

     Kata.Loopback.EveryoneProx.prototype.removeQuery = function(querier) {
         if (this.mQueriers[querier])
             delete this.mQueriers[querier];
     };

}, 'katajs/space/loop/EveryoneProx.js');
