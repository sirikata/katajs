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

Kata.include("katajs/core/FilterChannel.js");
Kata.include("katajs/core/MessageDispatcher.js");

(function() {
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
      * @param {} args additional arguments passed by the creating
      * object
      */
     Kata.BootstrapScript = function(channel,args) {
         this.mChannel = channel;

         Kata.include(args.realScript);

         // Try to find the class
         var clsTree = args.realClass.split(".");
         var cls = self;
         for (var i = 0; cls && i < clsTree.length; i++) {
             cls = cls[clsTree[i]];
         }

         // Create a filtered channel, so we get first crack at any messages
         var filtered_channel = new Kata.FilterChannel(channel, Kata.bind(this.receiveMessage, this));
         this.mScript = new cls(filtered_channel, args.realArgs);

         // Setup dispatcher and register handlers
         var handlers = {};
         var msgTypes = Kata.ScriptProtocol.ToScript.Types;
         handlers[msgTypes.Connected] = Kata.bind(this._handleConnected, this);
         handlers[msgTypes.ConnectionFailed] = Kata.bind(this._handleConnectFailed, this);
         handlers[msgTypes.Disconnected] = Kata.bind(this._handleDisconnect, this);
         this.mMessageDispatcher = new Kata.MessageDispatcher(handlers);

     };

     Kata.BootstrapScript.prototype.receiveMessage = function(channel, msg) {
         return this.mMessageDispatcher.dispatch(channel, msg);
     };

     Kata.BootstrapScript.prototype._handleConnected = function(msg) {
         Kata.warn("Connected.");
     };

     Kata.BootstrapScript.prototype._handleConnectFailed = function(msg) {
         Kata.warn("Connection failed.");
     };

     Kata.BootstrapScript.prototype._handleDisconnect = function(msg) {
         Kata.warn("Disconnected.");
     };

 })();
