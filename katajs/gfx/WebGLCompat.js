/*  katajs
 *  WebGLCompat.js
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

/** In order to ease some transitions due to the evolution of the WebGL spec,
 *  this file checks if some old features are missing and "backports" the
 *  new versions of them to provide the old version.
 */

// Typed arrays
try {
// -- Bytes
if (typeof(WebGLUnsignedByteArray) === "undefined" && typeof(Uint8Array) !== "undefined") {
    var WebGLUnsignedByteArray = Uint8Array;
}
if (typeof(WebGLByteArray) === "undefined" && typeof(Int8Array) !== "undefined") {
    var WebGLByteArray = Int8Array;
}
// -- Shorts
if (typeof(WebGLUnsignedShortArray) === "undefined" && typeof(Uint16Array) !== "undefined") {
    var WebGLUnsignedShortArray = Uint16Array;
}
if (typeof(WebGLShortArray) === "undefined" && typeof(Int16Array) !== "undefined") {
    var WebGLShortArray = Int16Array;
}
// -- Ints
if (typeof(WebGLUnsignedIntArray) === "undefined" && typeof(Uint32Array) !== "undefined") {
    var WebGLUnsignedIntArray = Uint32Array;
}
if (typeof(WebGLIntArray) === "undefined" && typeof(Int32Array) !== "undefined") {
    var WebGLIntArray = Int32Array;
}

// -- Floats
if (typeof(WebGLFloatArray) === "undefined" && typeof(Float32Array) !== "undefined") {
    var WebGLFloatArray = Float32Array;
}
if (typeof(WebGLDoubleArray) === "undefined" && typeof(Float64Array) !== "undefined") {
    var WebGLDoubleArray = Float64Array;
}
} catch (x) {
// Ignore, in this case just don't even have the necessary types
}
