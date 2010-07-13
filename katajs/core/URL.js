/*  KataJS
 *  URL.js
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

(function() {

     /** The URL class provides utilities for operating on a URL.  The
      * constructor accepts a string URL or a Kata.URL.
      *
      * The components of the URL are available in the fields
      * protocol, host, and (possibly) port.
      *
      * @constructor
      */
     Kata.URL = function(url) {
         // If its a URL object, just copy its fields
         if (url.protocol && url.host) {
             this.protocol = url.protocol;
             this.host = url.host;
             if (url.port)
                 this.port = url.port;
         }
         else { // Parse string URL
             var colon = url.indexOf("://");
             if (colon == -1) {
                 Kata.error("Invalid URL: " + url);
             }
             this.protocol = url.substr(0, colon);

             var no_proto = url.substr(colon+3);
             var slash = no_proto.indexOf("/");
             if (slash != -1)
                 no_proto = no_proto.substr(0, slash);
             colon = no_proto.indexOf(":");

             if (colon == -1) {
                 this.host = no_proto;
             } else {
                 this.host = no_proto.substr(0, colon);
                 this.port = no_proto.substr(colon+1);
             }
         }
     };

     Kata.URL.prototype.toString = function() {
         var as_string = this.protocol + "://" + this.host;
         if (this.port)
             as_string = as_string + ":" +  this.port;
         return as_string;
     };
})();