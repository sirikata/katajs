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
Kata.include("katajs/space/loop/Loc.js");
Kata.include("katajs/space/loop/EveryoneProx.js");
Kata.include("katajs/space/loop/Subscription.js");

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
         this.mLoc = new Kata.Loopback.Loc();
         this.mProx = new Kata.Loopback.EveryoneProx(this);
         this.mSubscription = new Kata.Loopback.Subscription(this);
     };

     /** Static map of local spaces, used to allow
      *  LoopbackSpaceConnection to discover these spaces.
      *  See LoopbackSpaceConnection.js for details on this use.
      */
     Kata.LoopbackSpace.spaces = {};

     /** Request an object to be connected. cb is an object whose
      * fields are callbacks for particular events: connect, prox,
      * etc.
      */
     Kata.LoopbackSpace.prototype.connectObject = function(id, cb) {
         var spaceself = this;
         setTimeout(
             function() {
                 spaceself._connectObject(id, cb);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace.prototype._connectObject = function(id, cb) {
         var uuid = Math.uuid();
         var obj =
             {
                 uuid : uuid
             };

         var obj_loc = {
             pos : [0, 0, 0],
             vel : [0, 0, 0],
             acc : [0, 0, 0]
         };
         var obj_bounds = {
             min : [0, 0, 0],
             max : [0, 0, 0]
         };
         var visual = "bogus";

         this.mLoc.add(uuid, obj_loc.pos, obj_loc.vel, obj_loc.acc, obj_loc.bounds, visual);
         this.mProx.addObject(uuid);
         this.mSubscription.addObject(uuid);

         this.mObjects[uuid] = cb;
         cb.connected(id, uuid, obj_loc, obj_bounds, visual); // FIXME clone these so they aren't shared
     };

     Kata.LoopbackSpace.prototype.registerProxQuery = function(id, sa) {
         var spaceself = this;
         setTimeout(
             function() {
                 spaceself._registerProxQuery(id, sa);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace.prototype._registerProxQuery = function(id, sa) {
         this.mProx.addQuery(id);
     };

     Kata.LoopbackSpace.prototype.proxResult = function(querier, observed, entered) {
         var querier_cb = this.mObjects[querier];
         if (!querier_cb) {
             Kata.warn("LoopbackSpace got query result for non-existant object: " + querier);
             return;
         }

         var observed_loc = this.mLoc.lookup(observed);
         var observed_properties = {
             loc : {
                 pos : observed_loc.pos,
                 vel : observed_loc.vel,
                 acc : observed_loc.acc
             },
             bounds : observed_loc.bounds,
             visual : observed_loc.visual
         };
         querier_cb.prox(querier, observed, entered, observed_properties);
     };

     // Handle location (and visual) updates
     Kata.LoopbackSpace.prototype.locUpdateRequest = function(id, pos, vel, acc, bounds, visual) {
         var spaceself = this;
         setTimeout(
             function() {
                 spaceself._locUpdateRequest(id, pos, vel, acc, bounds, visual);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace.prototype._locUpdateRequest = function(id, pos, vel, acc, bounds, visual) {
         this.mLoc.update(id, pos, vel, acc, bounds, visual);
         var spaceself = this;
         this.mSubscription.notify(id,
                                   function(to) {
                                       var receiver_cb = spaceself.mObjects[to];
                                       receiver_cb.presenceLocUpdate(
                                           id, to,
                                           pos, vel, acc, bounds, visual);
                                   },
                                   true);
     };

     /** Handle subscription updates.
      * @param id the object subscribing for updates
      * @param observed the object to get updates from
      * @param enable if true, enables updates, if false disables them
      */
     Kata.LoopbackSpace.prototype.subscriptionRequest = function(id, observed, enable) {
         var spaceself = this;
         setTimeout(
             function() {
                 spaceself._subscriptionRequest(id, observed, enable);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace.prototype._subscriptionRequest = function(id, observed, enable) {
         if (enable)
             this.mSubscription.subscribe(id, observed);
         else
             this.mSubscription.unsubscribe(id, observed);
     };

     Kata.LoopbackSpace.prototype.sendMessage = function(from, to, payload) {
     };

})();
