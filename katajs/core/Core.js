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

network_debug = false;
if (0) {
    // JSDoc hack
    /** Top-level namespace for KataJS.
     * @namespace
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

/** @define {string} Root directory of scripts. Inferred by any "script"
  tags pointing to Core.js. */
if (!Kata.scriptRoot) { Kata.scriptRoot=""; }
if (!Kata.queryString) { Kata.queryString=""; }
(function() {
    var includedscripts = Kata.closureIncluded || {"katajs/core/Core.js":true};
    var loadedDeps = {"katajs/core/Core.js":true};

    var deferred = {};
    var depsPending = {};
    Kata._currentScript = [];

    Kata.getCurrentScript = function() {
        return Kata._currentScript[Kata._currentScript.length - 1];
    };

    function runNewCurrentScript (scriptfile, body) {
        Kata._currentScript.push(scriptfile);
        try {
            if (body) {
                body();
            }
        } finally {
            if (Kata.getCurrentScript() != scriptfile) Kata.log('Error11: ' +scriptfile+ ' != '+Kata.getCurrentScript(), Kata._currentScript);
            Kata._currentScript.pop();
            if (scriptfile) {
                Kata.setIncluded(scriptfile);
            }
        }
    }

    function orderedRequire(depList) {
        function runRequire(i) {
            return function() {
                delete depsPending[depList[i]];
                Kata.include(depList[i]);
            };
        }
        for (var which = 0; which < depList.length; which++) {
            while(includedscripts[depList[which]])
                depList.splice(which, 1);
        }
        for (var which = 0; which < depList.length - 1; which++) {
            deferred[depList[which]] = deferred[depList[which]] || [];
            deferred[depList[which]].push(runRequire(which + 1));
            depsPending[depList[which + 1]] = true;
        }
        if (depList.length) {
            if (!depsPending[depList[0]]) {
                Kata.include(depList[0]);
            }
        }
    }

    Kata.require = function(deps, body, provide) {
        // FIXME: What to do if provide argument is typo'ed?
        if (provide && provide in loadedDeps) {
            Kata.warn("JS file "+provide+" included twice.");
            return;
        }
        if (depsPending[provide]) {
            return;
        }
        //Kata.log("Requiring: provide="+provide+"; deps="+deps);
        var i;
        var unfinishedDeps = {};
        var remainingDeps = 0;
        for (i = 0;i < deps.length; i++) {
            if (deps[i].push) {
                for (var j = 0; j < deps[i].length; j++) {
                    if (!loadedDeps[deps[i][j]] && !(deps[i][j] in unfinishedDeps)) {
                        unfinishedDeps[deps[i][j]] = true;
                        remainingDeps++;
                    }
                }
            } else {
                if (!loadedDeps[deps[i]] && !(deps[i] in unfinishedDeps)) {
                    unfinishedDeps[deps[i]] = true;
                    remainingDeps++;
                }
            }
        }
        function runDep(finished) {
            if (unfinishedDeps[finished]) {
                delete unfinishedDeps[finished];
                remainingDeps--;
                //Kata.log("Finished "+finished+" for "+provide, remainingDeps);
                if (remainingDeps == 0) {
                    if (provide) {
                        delete depsPending[provide];
                    }
                    //Kata.log("*** running "+provide);
                    runNewCurrentScript(provide, body);
                }
            }
        }
        if (remainingDeps) {
            if (provide) {
                depsPending[provide] = true;
            }
            for (i in unfinishedDeps) {
                deferred[i] = deferred[i] || [];
                deferred[i].push(runDep);
            }
            for (i = 0;i < deps.length; i++) {
                if (deps[i].push) {
                    orderedRequire(deps[i]);
                } else if (!depsPending[deps[i]]) {
                    Kata.include(deps[i]);
                }
            }
        } else {
            body();
            Kata.setIncluded(provide);
        }
    };

    Kata.defer = function (f){if (f) Kata.require([], f, null);};

    Kata.setIncluded = function(provide) {
        if (!provide) {
            return;
        }
        if (depsPending[provide]) {
            return;
        }
        if (deferred[provide]) {
            var deferList = deferred[provide];
            delete deferred[provide];
            for (var i = 0; i < deferList.length; i++) {
                deferList[i](provide);
            }
        }
        loadedDeps[provide] = true;
    };

    if (typeof(importScripts) != "undefined") {
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
            runNewCurrentScript(scriptfile, 
                function() {
                    try {
                        importScripts(Kata.scriptRoot+scriptfile+Kata.queryString);
                    } catch (e) {
                        Kata.log("Error in importScripts("+Kata.scriptRoot+scriptfile+")");
                        throw e;
                    }
                });
        };
        Kata.evalInclude = Kata.include;
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
        window.pendingScripts = {};
        var pendingId = 1;
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
            var scriptTag, textNode;

            scriptTag = document.createElement("script");
            scriptTag.src = Kata.scriptRoot+scriptfile+Kata.queryString;
            scriptTag.type = "text/javascript";

            var scriptContent = function(){
                if (Kata.getCurrentScript()) Kata.log('Error: '+scriptfile+' != '+Kata.getCurrentScript(), Kata._currentScript);
                //Kata.log('===END LOAD+++ '+scriptfile);
                Kata.setIncluded(scriptfile);
            };
            scriptTag.addEventListener("load", scriptContent, true);
            headTag.appendChild(scriptTag);
        };
        Kata.evalInclude = Kata.include;
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
        childcons.prototype.SUPER = parent;
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
        if (arguments.length==2) {
            delete arguments;
            return function() {
                return func.apply(object, arguments);
            };            
        }else {
            var args=new Array(arguments.length-2);
            for (var i=2;i<arguments.length;++i) {
                args[i-2]=arguments[i];
            }
            delete arguments;
            return function () {
                var argLen=arguments.length;
                var newarglist=new Array(argLen);
                for (var i=0;i<argLen;++i){
                    newarglist[i]=arguments[i];
                }
                return func.apply(object,args.concat(newarglist));
            };
        }
    };

    Kata.stringify = function(msg, level) {
        if (!level) {
            level = "";
        }
        var end = level + "}";
        level += "    ";
        var datastr;
        if (typeof(msg)!="object" || msg === null) {
            return "" + msg;
        }
        datastr = "{\n";
        for (var k in msg) {
            datastr += level+k+": "+Kata.stringify(msg[k], level)+",\n";
        }
        datastr += end;
        return datastr;
    };

    if (console.log && console.log.apply && debug_console) {
        /** Logs msg to the console, in addition to some json object.
         * @param {...(object|string)} var_args  Some optional JSON data to log.
         */
        Kata.log = function(var_args) {
            console.log.apply(console, arguments);
        };
    } else if (typeof(document)=="undefined" || typeof(window)=="undefined") {
        /** Logs msg to the parent web worker, in addition to some json object.
         * @param {...(object|string)} var_args  Logs some optional JSON data.
         */
        Kata.log = console.log = function(var_args) {
            var args = [];
            for (var i = 0; i < arguments.length; i++) {
                args[i] = arguments[i];
                if (typeof(args[i])=="object") {
                    args[i] = Kata.stringify(args[i]);
                } else if (typeof(args[i])!="string") {
                    args[i] = "" + args[i];
                }
            }
            self.postMessage({
                msg : __magic_debug_msg_string,
                debug : "log",
                contents : args
            });
        };
    } else if (debug_console) {
        /** Logs msg to the console, in addition to some json object.
         * @param {...(object|string)} var_args  Logs some optional JSON data.
         */
        Kata.log = console.log = function(var_args) {
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
                    datastr = Kata.stringify(msg);
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
    } else {
        Kata.log = console.log = function() {
        }
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
            console.trace && console.trace();
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

    var nextDebugId = 1001;

    /** Tries to handle debug messages from other threads.  This allows
     *  Web Worker threads to access the logging functionality available
     *  to the main thread.
     */
    Kata.debugMessage = function(channel, data) {
        if (data === undefined || data === null || data.msg != __magic_debug_msg_string)
            return false;
        var debugId = 0;
        if (channel) {
            if (!channel.__debug_id) {
                channel.__debug_id = nextDebugId++;
            }
            debugId = channel.__debug_id;
        }
        debugId = "<" + debugId + ">";

        // We'll always return true after this since we know somebody
        // was using the magic debug string.  Naming collisions are unlikely
        // due to crazy value of the string.

        // If you add to this list, be careful that your handler either
        // a) chains properly or b) checks if you are in the main thread,
        // e.g. by checking for window.
        switch (data.debug) {
        case "error":
            Kata.log(debugId+" "+data.contents);
            break;
        case "warn":
            Kata.log(debugId + data.type + ": " + data.contents);
            break;
        case "log":
            data.contents.splice(0, 0, debugId);
            Kata.log.apply(self, data.contents);
            break;
        default:
            // Somebody probably meant to get a real error...
            Kata.error(debugId+" "+"Unknown debug message type: " + data.debug);
            break;
        }
        return true;
    };
     
})();
