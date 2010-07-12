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

network_debug = false
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
        };
        Kata.eval=Kata.include;
        Kata.defer = function (f){if (f) f();};
    } else if (typeof(document) != "undefined" && document.write) {
        var scripttags = document.getElementsByTagName("script");
        var headTag = document.getElementsByTagName("head")[0];
        for (var i = 0; i < scripttags.length; i++) {
            var src = scripttags[i].getAttribute("src");
            if (src) {
                var rootindex = src.indexOf("katajs/core/Core.js");
                if (rootindex != -1) {
                    var sroot = src.substr(0, rootindex);
                    if (sroot.length > 0 && sroot.slice(-1) != '/')
                        sroot = sroot + '/';
                    Kata.scriptRoot = sroot;
                }
            }
        }
        Kata.defer = 
            (function() { 
                 var deferList=[];
                 return function (f) {
                     if (f) {
                         deferList.push(f);
                     }else {
                         for (var i=0;i<deferList.length;++i) {
                             deferList[i]();
                             Kata.include=Kata.evalInclude;//flip it back
                         }
                     }
                 };})();
        Kata.resolveDeferredHeaders=function() {
            Kata.defer(null);
        };
        Kata.alreadyIncluded = function(scriptfile) {
            if (includedscripts[scriptfile]) {
                return;
            }
            includedscripts[scriptfile] = true;
        };
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
            document.write("<script type='text/javascript' src='"+
                Kata.scriptRoot+scriptfile+"'></scr"+"ipt>");
            
            //console.log("importing script "+scriptfile+"...");
        };
        Kata.evalInclude = function (scriptfile) {
            if (includedscripts[scriptfile]) return;
            includedscripts[scriptfile]=true;
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
        };
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

    /** Sets the status on the window if possible (i.e. if called from the
     *  original thread instead of a Web Worker.
     */
    Kata.setStatus = function(msg) {
        if (typeof(window) == "undefined")
            return;
        window.status = msg;
    };

    // Named (the string) somewhat ridiculously to avoid naming conflicts.
    // This makes it safe to always filter this type of message on every
    // thread.
    var __magic_debug_msg_string = "__magic_debug_msg_string";

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
        // Worker thread
        if (typeof(window) == "undefined") {
            // Worker thread
            self.postMessage({
                msg : __magic_debug_msg_string,
                debug : "error",
                contents : error
            });
            throw error;
        }
        // Main thread
        console.log(error);
        if (typeof(console.error)!="undefined") {
            Kata.setStatus(error);
            console.error && console.error(error);
            console.trace && console.trace();
        }
//        throw error;
    };

    /** Log a warning.
     *
     *  @param {string} note If supplied, this note will be reported
     *         with the rest of the information.
     *  @param {string} type If supplied, is used as a prefix to .
     */
    Kata.warn = function(note, type) {
        if (typeof(type) == "undefined" || !type)
            type = "";

        // Worker thread
        if (typeof(window) == "undefined") {
            // Worker thread
            self.postMessage({
                msg : __magic_debug_msg_string,
                debug : "warn",
                type : type,
                contents : note
            });
            return;
        }

        var msg = null;
        if (type && note)
            msg = type + ": " + note;
        else if (type)
            msg = type;
        else if (note)
            msg = note;

        // Main thread
        console.log(msg);
        Kata.setStatus(msg);
        console.trace && console.trace();
    };

    /** Leaves a note for developers that they've hit an unimplemented
     *  method.  Usually this means functionality has been stubbed out,
     *  but not added.
     *
     *  @param {string} note If supplied, this note will be reported
     *         with the rest of the information.
     */
    Kata.notImplemented = function(note) {
        Kata.warn(note, "notImplemented");
    };

    /** Tries to handle debug messages from other threads.  This allows
     *  Web Worker threads to access the logging functionality available
     *  to the main thread.
     */
    Kata.debugMessage = function(data) {
        if (data.msg != __magic_debug_msg_string)
            return false;

        // We'll always return true after this since we know somebody
        // was using the magic debug string.  Naming collisions are unlikely
        // due to crazy value of the string.

        // If you add to this list, be careful that your handler either
        // a) chains properly or b) checks if you are in the main thread,
        // e.g. by checking for window.
        switch (data.debug) {
        case "error":
            Kata.error(data.contents);
            break;
        case "warn":
            Kata.warn(data.contents, data.type);
            break;
        default:
            // Somebody probably meant to get a real error...
            Kata.error("Unknown debug message type: " + data.debug);
            break;
        }
        return true;
    };
})();
