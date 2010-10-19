/*  KataJS
 *  Subscription.js
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

     /** The Subscription service provides a simple mechanism for
      * subscription to individual objects for updates.
      * @constructor
      * @param space The parent Loopback.Space for this Subscription service.
      */
     Kata.Loopback.Subscription = function(space) {
         this.mSpace = space;
         this.mSubscribers = {};
     };

     /** Add an object to be tracked for subscriptions, i.e. others
      * should be able to subscribe to it for updates.
      * @param id the object to be tracked
      */
     Kata.Loopback.Subscription.prototype.addObject = function(id) {
         this.mSubscribers[id] = {};
     };

    /** Remove an object from subscription tracking. This removes it
     * both as a subscriber and from all subscribers list of
     * subscribees.
     * @param id the object that should no longer be tracked.
     */
    Kata.Loopback.Subscription.prototype.removeObject = function(id) {
        delete this.mSubscribers[id];

        for(var sub in this.mSubscribers)
            delete this.mSubscribers[sub][id];
    };

     /** Subscribe the object with the given id for updates from observed.
      * @param id the ID of the subscriber
      * @param observed the ID of the object to receive updates from
      */
     Kata.Loopback.Subscription.prototype.subscribe = function(id, observed) {
         if (this.mSubscribers[observed])
             this.mSubscribers[observed][id] = id;
     };

     /** Unsubscribe the object with the given id for updates from observed.
      * @param id the ID of the subscriber
      * @param observed the ID of the object to stop receiving updates from
      */
     Kata.Loopback.Subscription.prototype.unsubscribe = function(id, observed) {
         if (this.mSubscribers[observed])
             delete this.mSubscribers[observed][id];
     };

     /** Sends an update (payload) to all subscribers of the specified object.
      * @param observed object whose subscribers should receive the update
      * @param cb function to invoke; should take one parameter: the notified object
      * @param self if true, send the update back to the observed object as well
      */
     Kata.Loopback.Subscription.prototype.notify = function(observed, cb, self) {
         var subscribers = this.mSubscribers[observed];
         for(var subscriber in subscribers)
             cb(subscriber);
         if (self)
             cb(observed);
     };

}, 'katajs/space/loop/Subscription.js');
