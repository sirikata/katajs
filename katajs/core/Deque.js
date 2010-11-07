/*  katajs deque implementation
 *  Deque.js
 *
 *  Copyright (c) 2010, Daniel Reiter Horn
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
 *  * Neither the name of katajs nor the names of its contributors may
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

    Kata.Deque = function() {
        this.mSize=0;
        this.mHead=0;
        this.mArray=new Array(8);
    };


    Kata.Deque.prototype.expand = function() {
        var oldLength=this.mArray.length;
        this.mArray.length=Math.round(oldLength*1.5);
        var numWrapped=this.mSize+this.mHead-oldLength;
        for (var i=0;i<numWrapped;i++) {
            this.mArray[(i+oldLength)%this.mArray.length]=this.mArray[i];
        }
    };

    Kata.Deque.prototype.push_back=function(e) {
        if (this.mSize>=this.mArray.length) {//expand
            this.expand();
        }
        var destIndex=this.mHead+this.mSize;
        if (destIndex>=this.mArray.length) {
            this.destIndex-=this.mArray.length;
        }
        this.mSize++;
        this.mArray[destIndex]=e;
    };

    Kata.Deque.prototype.push_front=function(e) {
        if (this.mSize>=this.mArray.length) {//expand
            this.expand();
        }
        var destIndex=this.mHead;
        if (destIndex==0) {
            destIndex=this.mArray.length;
        }
        destIndex--;
        this.mHead=destIndex;
        this.mSize++;
        this.mArray[destIndex]=e;
    };

    Kata.Deque.prototype.index=function(y) {
        var destIndex=this.mHead+y;
        if (destIndex>=this.mArray.length) {
            this.destIndex-=this.mArray.length;
        }
        return this.mArray[destIndex];
    };

    Kata.Deque.prototype.back=function() {
        var destIndex=this.mHead+this.mSize-1;
        if (destIndex>=this.mArray.length) {
            this.destIndex-=this.mArray.length;
        }
        return this.mArray[destIndex];
    };

    Kata.Deque.prototype.pop_back=function() {
        if (this.mSize==0) return undefined;
        var destIndex=this.mHead+this.mSize-1;
        if (destIndex>=this.mArray.length) {
            this.destIndex-=this.mArray.length;
        }
        var retval=this.mArray[destIndex];
        this.mArray[destIndex]=null;
        this.mSize--;
        return retval;
    };


    Kata.Deque.prototype.pop_front=function(e) {
        if (this.mSize==0) return undefined;
        var retval=this.mArray[this.mHead];
        this.mArray[this.mHead]=null;
        this.mHead++;
        this.mSize-=1;
        if (this.mHead>=this.mArray.length) {
            this.mHead-=this.mArray.length;
        }
        return retval;
    };

    Kata.Deque.prototype.front=function() {
        var destIndex=this.mHead;
        return this.mArray[destIndex];
    };

    Kata.Deque.prototype.empty=function() {
        return this.mSize==0;
    };

    Kata.Deque.prototype.size=function() {
        return this.mSize;
    };

    Kata.Deque.prototype.clear=function() {
        Kata.Deque.call(this);
    };
    Kata.Deque.prototype.erase=function(index) {
        for (var i=this.mHead+index;i+1<this.mSize;++i) {
            this.mArray[i]=this.mArray[i+1];
        }
        this.pop_back();
    };

})();