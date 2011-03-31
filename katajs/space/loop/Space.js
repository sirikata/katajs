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


Kata.require([
    'katajs/oh/SpaceConnection.js',
    'katajs/core/Time.js',
    'katajs/core/Math.uuid.js',
    'katajs/space/loop/Loc.js',
    'katajs/space/loop/EveryoneProx.js',
    'katajs/space/loop/Subscription.js',
    'katajs/core/Location.js'
], function() {

     /** A simple loopback space.  To simulate a network, the loopback
      * space delays all calls with a timeout.
      *
      * @constructor
      * @param {Kata.URL} spaceurl the URL of this space
      */
     Kata.LoopbackSpace = function(spaceurl) {
         // First try to add to central registery
         var spaceurlhost=Kata.URL.host(spaceurl);
         if (Kata.LoopbackSpace.spaces[spaceurlhost])
             Kata.warn("Overwriting static LoopbackSpace map entry for " + spaceurl);
         Kata.LoopbackSpace.spaces[spaceurlhost] = this;
         this.mID=spaceurl;
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
     Kata.LoopbackSpace.prototype.connectObject = function(id, cb, loc) {
//FIXME drh this function should take initial position
         var spaceself = this;
         setTimeout(
             function() {
                 spaceself._connectObject(id, cb, loc);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace._fakeUUIDs=100;
     Kata.LoopbackSpace.prototype._connectObject = function(id, cb, loc) {
         var uuid;
         if (Kata.DEBUG_FAKE_UUID) {
             uuid = "fake-uuid-" + Kata.LoopbackSpace._fakeUUIDs++;
         }
         else {
             uuid = Math.uuid();
         }
         var obj =
             {
                 uuid : uuid
             };
         var obj_loc = loc;//Kata.LocationIdentity(Kata.now(this.mID));
         //FIXME: update with initial position
         this.mLoc.add(uuid, obj_loc, cb.visual);
         this.mProx.addObject(uuid);
         this.mSubscription.addObject(uuid);

         this.mObjects[uuid] = cb;
         cb.connected(id, uuid, obj_loc, cb.visual); // FIXME clone these so they aren't shared
     };

    Kata.LoopbackSpace.prototype.disconnectObject = function(id) {
        var spaceself = this;
        setTimeout(
            function() {
                spaceself._disconnectObject(id);
            },
            this.netdelay
        );
    };
    Kata.LoopbackSpace.prototype._disconnectObject = function(id, cb) {
        this.mSubscription.removeObject(id);
        this.mProx.removeQuery(id);
        this.mProx.removeObject(id);
        this.mLoc.remove(id);

        delete this.mObjects[id];
    };

     Kata.LoopbackSpace.prototype.sendODPMessage = function(src_obj, src_port, dst_obj, dst_port, payload) {
         var spaceself = this;
         setTimeout(
             function() {
                 spaceself._sendODPMessage(src_obj, src_port, dst_obj, dst_port, payload);
             },
             this.netdelay
         );
     };
     Kata.LoopbackSpace.prototype._sendODPMessage = function(src_obj, src_port, dst_obj, dst_port, payload) {
         var src_cb = this.mObjects[src_obj];
         if (!src_cb) {
             Kata.warn("LoopbackSpace got message from non-existant object: " + src_obj);
             return;
         }

         var dst_cb = this.mObjects[dst_obj];
         if (!dst_cb) {
             Kata.warn("LoopbackSpace got message to non-existant object: " + dst_obj);
             return;
         }

         dst_cb.message(src_obj, src_port, dst_obj, dst_port, payload);
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

         var observed_obj = this.mLoc.lookup(observed);
         var observed_properties = {
             loc : observed_obj.loc,
             visual : observed_obj.visual
         };
         Kata.LocationCopyUnifyTime(observed_properties.loc, observed_obj.loc);
         querier_cb.prox(querier, observed, entered, observed_properties);
     };

     // Handle location (and visual) updates
     Kata.LoopbackSpace.prototype.locUpdateRequest = function(id, loc, visual) {
         var spaceself = this;

		 // until we get subscription loc updates working, I need to do this right away so gfx gets
		 // objects with initial positions set
         spaceself._locUpdateRequest(id, loc, visual);
		 /*
         setTimeout(
             function() {
                 spaceself._locUpdateRequest(id, loc, visual);
             },
             this.netdelay
         );
         */
     };
     Kata.LoopbackSpace.prototype._locUpdateRequest = function(id, loc, visual) {
         this.mLoc.update(id, loc, visual);
         var spaceself = this;
         this.mSubscription.notify(id,
                                   function(to) {
                                       var receiver_cb = spaceself.mObjects[to];
                                       receiver_cb.presenceLocUpdate(
                                           id, to,
                                           loc, visual);
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

}, 'katajs/space/loop/Space.js');
