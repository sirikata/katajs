/*  Kata Javascript Utilities
 *  Kata.js
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

if (typeof(Kata) == "undefined") {Kata = {};}
if (""+console.log==""+function () {}) {
	console = {};
	debug_console = false
}
else {
	debug_console = true
}
if (typeof(JSON) == "undefined") {JSON = {};}

(function() {
    /** Extends a prototype. 
    */
    Kata.extend = function(child, parent) {
        /* Doesn't allow instanceof to work. If we want this, we would make
           use "new parent.constructor" as our object. */
        for (var prop in parent) {
            child.prototype[prop] = parent[prop];
        }
        child.prototype.constructor = child;
    };
    Kata.bind = function(func, object) {
        return function() {
            return func.apply(object, arguments);
        };
    };
    if (console.log && debug_console) {
        /** Logs msg to the console, in addition to some json object.
         @param var_args  Some optional JSON or string data to log. */
        Kata.log = function(var_args) {
            console.log.apply(console, arguments);
        };
    } else {
        /** Logs msg to the console, in addition to some json object.
         @param var_args  Some optional JSON or string data to log. */
        Kata.log = console.log = function(var_args) {
            if (typeof(document)=="undefined" || typeof(window)=="undefined") {
                return;
            }
            window.status = ""+arguments[0];
            var p = document.createElement("p");
            p.style.border="1px solid black";
            p.style.margin="0";
            var marleft = "0";
            for (var i = 0; i < arguments.length; i++) {
                var msg = arguments[i];
                var div;
                if (typeof(msg) != "object" || msg.toString != Object.prototype.toString) {
                    div = document.createElement("div");
                    div.appendChild(document.createTextNode(msg));
                } else {
                    var datastr;
                    try {
                        datastr = JSON.stringify(msg, null, 4);
                    } catch (e) {
                        datastr = "{\n";
                        for (var k in msg) {
                            datastr += "    "+k+": "+msg[k]+",\n";
                        }
                        datastr += "}";
                    }
                    div = document.createElement("pre");
                    div.appendChild(document.createTextNode(datastr));
                }
                div.style.margin="0";
                div.style.padding="5px";
                div.style.overflow="auto";
                div.style.whiteSpace="pre";
                div.style.border="1px solid #ccc";
                div.style.marginLeft=marleft;
                marleft = "30px";
                p.appendChild(div);
            }
            if (document.body) {
                document.body.appendChild(p);
            }
        };
    }
    Kata.error = function(error) {
        console.log(error);
        if (typeof(console.error)!="undefined") {
            window.status = error;
            console.error && console.error(error);
            console.trace && console.trace();
        }
        throw error;
    };
})();