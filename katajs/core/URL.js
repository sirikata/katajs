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

Kata.require([
], function() {
    
     /** The URL class provides utilities for operating on a URL.  The
      * constructor accepts a string URL or a Kata.URL.
      *
      * The components of the URL are available via global accessor functions to access 
      * the protocol, host, and (possibly) port.
      *
      * @constructor
      */
     Kata.URL = function(s){
         return s;
    };
    /**
     * @param {Kata.URL} url
     * Global function to seek the protocol from a given url
     */
     Kata.URL.protocol=function(url) {
         var colon = url.indexOf("://");
         if (colon == -1) {
             Kata.error("Invalid URL: " + url);
         }
         return url.substr(0, colon);         
    };
    Kata.URL._hostAndPort=function(url) {
        var colon = url.indexOf("://");
        if (colon == -1) {
            Kata.error("Invalid URL: " + url);
            colon=0;
        }else colon+=3;
        var slash = url.indexOf("/",colon);
        if (slash != -1)
            return url.substr(colon, slash-colon);
        else
            return url.substr(colon);
    };
    Kata.URL.host=function(url) {
        url=Kata.URL._hostAndPort(url);
        var colon=url.indexOf(":");
        if (colon==-1)
            return url;
        return url.substr(0,colon);
    };
    Kata.URL.port=function(url) {
        url=Kata.URL._hostAndPort(url);
        var colon=url.indexOf(":");
        if (colon==-1)
            return undefined;
        var port_str = url.substr(colon+1);
        return parseInt(port_str);
    };
    Kata.URL.resource=function(url) {
        var colon = url.indexOf("://");
        if (colon == -1) {
            Kata.error("Invalid URL: " + url);
        }
        var slash = url.indexOf("/",colon+3);
        if (slash==-1)
            return "";
        return url.substr(slash);
    };
    Kata.URL.equals=function(a,b) {
        return a==b;
    };
     
}, 'katajs/core/URL.js');
