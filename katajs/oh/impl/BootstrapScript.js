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
    'katajs/core/FilterChannel.js',
    'katajs/core/MessageDispatcher.js',
    'katajs/oh/Presence.js',
    'katajs/core/URL.js',
    'katajs/oh/impl/ScriptProtocol.js'
], function() {
     /** Bootstraps an object's script, enabling it to communicate
      *  with the HostedObject it was instantiated for.  This also
      *  sets up creation/destruction of Presences and makes sure they
      *  get to handle events before the script itself.
      *
      *  Since this is just a bootstrap, the real data for
      *  constructing the script is contained in the args parameter,
      *  in args.realScript, args.realClass, and args.realArgs.
      *
      * @constructor
      * @param {Kata.Channel} channel the channel used to communicate
      * with the HostedObject this script belongs to
      * @param {Array} args additional arguments passed by the creating
      * object
      */
     Kata.BootstrapScript = function(channel,args) {
         this.mChannel = channel;

         // Setup dispatcher and register handlers
         var handlers = {};
         var msgTypes = Kata.ScriptProtocol.ToScript.Types;
         handlers[msgTypes.Connected] = Kata.bind(this._handleConnected, this);
         handlers[msgTypes.ConnectionFailed] = Kata.bind(this._handleConnectFailed, this);
         handlers[msgTypes.Disconnected] = Kata.bind(this._handleDisconnect, this);
         this.mMessageDispatcher = new Kata.MessageDispatcher(handlers);

         this.mPresences = {};

         // Create a filtered channel, so we get first crack at any messages
         var filtered_channel = new Kata.FilterChannel(channel, Kata.bind(this.receiveMessage, this));

         this.mPendingScriptLoad = [];
         this.mScriptLoading = true;

         var thus = this;

         Kata.require(
             [args.realScript],
             function() {
                 thus._onFinishedLoading(filtered_channel, args);
             });

     };

     Kata.BootstrapScript.prototype._onFinishedLoading = function(filtered_channel, args) {
         this.mScriptLoading = false;
         // Try to find the class
         var clsTree = args.realClass.split(".");
         var cls = self;
         for (var i = 0; cls && i < clsTree.length; i++) {
             cls = cls[clsTree[i]];
         }
         // And finally, in case the script constructor does anything synchronously, make the script creation the final step
         if (!cls) {
             Kata.error("Class "+args.realClass+" from file "+args.realScript+" could not be found!");
             return;
         }
         this.mScript = new cls(filtered_channel, args.realArgs);
         for (var i = 0; i < this.mPendingScriptLoad.length; i++) {
             this.receiveMessage(this.mPendingScriptLoad[i][0], this.mPendingScriptLoad[i][1]);
         }
     };

     Kata.BootstrapScript.prototype.receiveMessage = function(channel, msg) {
         if (this.mScriptLoading) {
             this.mPendingScriptLoad.push([channel, msg]);
             return true; // FIXME: How do we know what messages the script would have supported?
         } else {
             return this.mMessageDispatcher.dispatch(channel, msg);
         }
     };

     Kata.BootstrapScript.prototype._handleConnected = function(channel, msg) {
         var presence = new Kata.Presence(this.mScript, Kata.URL(msg.space), msg.id, msg.loc, msg.visual);

         this.mPresences[msg.space] = presence;
         this.mScript.newPresence(presence);
     };

     Kata.BootstrapScript.prototype._handleConnectFailed = function(channel, msg) {
         this.mScript.connectFailure(msg.space, msg.reason);
     };

     Kata.BootstrapScript.prototype._handleDisconnect = function(channel, msg) {
         var invalidated = this.mPresences[msg.space];
         if (!invalidated) return;

         delete this.mPresences[msg.space];
         this.mScript.presenceInvalidated(invalidated, "Disconnected.");
     };

}, "katajs/oh/impl/BootstrapScript.js");
