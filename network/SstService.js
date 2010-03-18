/*  kata3d Javascript Utilities
 *  SstService.js
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
 *  * Neither the name of kata3d nor the names of its contributors may
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

if (typeof Sirikata == "undefined") { Sirikata = {}; }

(function() {
    var SUPER = Kata.Service.prototype;
    Sirikata.SstService=function (sst_substream, spaceid) {
        SUPER.constructor.call(this);
        sst_substream.registerListener(Kata.bind(this.receivedMessage, this));
        this.mSubstream=sst_substream;
        this.mSpaceId = spaceid;
    };
    Kata.extend(Sirikata.SstService, SUPER);

    Sirikata.SstService.prototype.setObjectReference = function(objectref) {
        this.mSubstream.objectReference = objectref;
    };

    Sirikata.SstService.prototype._createPort = function(portid) {
        return new Sirikata.SstService.Port(this, portid);
    };

    Sirikata.SstService.prototype.send = function(header, bodyunser) {
        console.log("SstService for object "+this.mSubstream.objectReference,
                    "sending header:",header,"body:",bodyunser);
        var b64stream = new PROTO.Base64Stream;
        header.SerializeToStream(b64stream);
        bodyunser.SerializeToStream(b64stream);
        this.mSubstream.sendMessage(b64stream.getString());
    };

    Sirikata.SstService.prototype.receivedMessage = function(sender, data) {
        var header = new Sirikata.Protocol.Header;
        header.ParseFromStream(new PROTO.Base64Stream(data));
        header.source_space = this.mSpaceId;
        header.destination_object = sender.objectReference;
        var port = 0;
        if (header.destination_port) {
            port = header.destination_port;
        }
        SUPER.deliver.call(this, port, [header, data]);
    };

})();
(function(){
    var SUPER = Kata.Port.prototype;
    Sirikata.SstService.Port = function(service, portid) {
        this.mPortId = portid;
        SUPER.constructor.call(this, service);
    };

    Kata.extend(Sirikata.SstService.Port, SUPER);

    Sirikata.SstService.Port.prototype.send = function(header, bodyunser) {
        header.source_port = this.mPortId;
        if (!header.destination_port) {
            header.destination_port = undefined;
        }
        if (!header.destination_object) {
            Kata.error("Unspecified destination object for message:\n"+bodyunser);
        }
        this.mService.send(header, bodyunser);
    };
    
})();
