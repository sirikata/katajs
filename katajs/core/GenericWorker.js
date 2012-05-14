/*  Kata WebWorkers wrapper script
 *  GenericWorker.js
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
"use strict";

/** Wrapper to handle entry from a Worker thread the same as if workers are
 * disabled. Uses Kata.include to include dependent files.
 */
self.onmessage = function (ev) {
    self.onmessage = function(){};
    var data = ev.data;

    // Bootstrapping root of source tree.
    // This may not be necessary if importscripts uses relative paths.
    var scriptroot = data[0];
    var queryString = data[5] || "";
    try {//FIXME: should we do this
        importScripts(scriptroot+"katajs.compiled.js"+queryString);
    } catch (e) {
        try {
            Kata.log("Exception loading katajs.compiled.js", e);
        } catch (ex) {}
    }
    if (typeof(Kata)==="undefined") {
        try {
            importScripts(scriptroot+"katajs/core/Core.js"+queryString);
        } catch (e) {
            throw "Failed to import katajs/core/Core.js at scriptroot "+scriptroot+": "+e;
        }
    }
    Kata.scriptRoot = scriptroot;
    Kata.queryString = queryString;
    Kata.bootstrapWorker=data[1];
    Kata.evalInclude("katajs/core/WebWorker.js");
    // Fetch classname to instanciate and arguments.
    var jsFile = data[2];
    var clsName = data[3].split(".");
    var args = data[4];
    Kata.evalInclude(jsFile);
    // Our class name can be in a namespace heirarchy.
    var cls = self;
    for (var i = 0; i < clsName.length; i++) {
        cls = cls[clsName[i]];
    }
    // We don't use the return value--but using 'new' here makes a unique this.
    new cls (new Kata.WebWorker.Channel(self), args);
}
