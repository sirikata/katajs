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

if (0) {
    // JSDoc hack
    /** Top-level namespace for KataJS.
     * @constructor
     */
    Kata = function(){};
}
if (typeof(Kata) == "undefined") {Kata = {};}
if (typeof(console) == "undefined") {
	console = {};
	debug_console = false;
} else {
	debug_console = true;
}
if (typeof(JSON) == "undefined") {JSON = {};}

(function() {
    var includedscripts = {"Core.js":true};

    /** @define {string} Root directory of scripts. Inferred by any "script"
     tags pointing to Core.js. */
    Kata.scriptRoot="";
    if (Kata.precompiled) {
        /** Use Kata.include to fetch dependent files. Ignores duplicates.
         * @param {string} scriptfile  A script to include only once.
         */
        Kata.include = function(scriptfile) {};
    } else if (typeof(importScripts) != "undefined") {
        /** Use Kata.include to fetch dependent files. Ignores duplicates.
         * @param {string} scriptfile  A script to include only once.
         *
         * This version uses "importscripts" as defined in the Web Worker API.
         */
        Kata.include = function(scriptfile) {
            if (includedscripts[scriptfile]) {
                return;
            }
            includedscripts[scriptfile] = true;
            importScripts(Kata.scriptRoot+scriptfile);
        }
    } else if (typeof(document) != "undefined" && document.write) {
        var scripttags = document.getElementsByTagName("script");
        var headTag = document.getElementsByTagName("head")[0];
        for (var i = 0; i < scripttags.length; i++) {
            var src = scripttags[i].getAttribute("src");
            if (src) {
                var rootindex = src.indexOf("/Core.js");
                if (rootindex != -1) {
                    Kata.scriptRoot = src.substr(0, rootindex+1);
                }
            }
        }
        /** Use Kata.include to fetch dependent files. Ignores duplicates.
         * @param {string} scriptfile  A script to include only once.
         *
         * This version inserts a "script" tag into the DOM.
         */
        Kata.include = function(scriptfile) {
            if (includedscripts[scriptfile]) {
                return;
            }
            includedscripts[scriptfile] = true;
            /*
            var scriptTag = document.createElement("script");
            scriptTag.setAttribute("src",Kata.scriptRoot+scriptfile);
            scriptTag.setAttribute("type","text/javascript");
            headTag.appendChild(scriptTag);
            */
            /*
            document.write("<script type='text/javascript' src='"+
                Kata.scriptRoot+scriptfile+"'></scr"+"ipt>");
            */
            //console.log("importing script "+scriptfile+"...");
            var xhr = new XMLHttpRequest();
            xhr.open("GET", Kata.scriptRoot+scriptfile, false);
            xhr.send();
            if (xhr.readyState==4 &&
                (xhr.status==0 || xhr.status==200)) {
                with(self){ // ie hack?
                    self.eval(xhr.responseText);
                }
            } else {
                console.log("Unable to load script file "+scriptfile+
                    ": status is "+xhr.status+" "+xhr.statusText);
                console.log("content type is "+
                    xhr.getResponseHeader("Content-Type"));
            }
            //console.log("done importing script "+scriptfile);
        }
    } else {
        // Running without dom?
    }
    /** Extends a class prototype by copying functions from the parent protoype
     *  into the child prototype . This style of inheritence does not use the
     *  __proto__ chain, so operations such as "instanceof" will not work.
     *
     * @param {Function} childcons  The constructor of the child class.
     * @param {Object} parent  The *prototype* of the parent class. The parent
     *     prototype is often stored in a "SUPER" variable in the local scope.
    */
    Kata.extend = function(childcons, parent) {
        /* Doesn't allow instanceof to work. If we want this, we would make
           use "new parent.constructor" as our object. */
        for (var prop in parent) {
            childcons.prototype[prop] = parent[prop];
        }
        childcons.prototype.constructor = childcons;
    };
    /** Returns a function that binds the passed function to an object.
     *  Useful for all cases where you need to pass a function argument, but
     *  you expect 'this' to be correctly set.
     *
     *  @param {function(this:Object,...[*])} func  A function object to bind.
     *  @param {Object} object  Instance of some class to become 'this'.
     *  @return {function(...[*])}  A new function that wraps func.apply()
     */
    Kata.bind = function(func, object) {
        return function() {
            return func.apply(object, arguments);
        };
    };
    if (console.log && debug_console) {
        /** Logs msg to the console, in addition to some json object.
         * @param {...(object|string)} var_args  Some optional JSON data to log.
         */
        Kata.log = function(var_args) {
            console.log.apply(console, arguments);
        };
    } else {
        /** Logs msg to the console, in addition to some json object.
         * @param {...(object|string)} var_args  Logs some optional JSON data.
         */
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
    /** Throws a fatal error (up to the point of entry from the browser.
     * 
     * @note  This uses 'throw' which is poorly supported in some debuggers.
     * In some cases, it may be preferrable to deliberately reference an
     * undefined variable or another runtime error to produce a stacktrace.
     * 
     * @param {string} error  A message to report to the console.
     *     This string is thrown.
     */
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
