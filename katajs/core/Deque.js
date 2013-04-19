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
"use strict";

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
    ///Inserts before the given index
    Kata.Deque.prototype.insert=function(index,data) {
        if (index==0) {
            this.push_front(data);
            return;
        }
        if (index>=this.mSize) {
            this.push_back(data);
            return;
        }
        if (this.mSize>=this.mArray.length) {//expand
            this.expand();
        }
        var cur= (this.mHead+this.mSize)%this.mArray.length;
        var prev;
        for (var i=this.mSize-1;i>=index;--i) {
            prev = (this.mHead+i)%this.mArray.length;
            this.mArray[cur]=this.mArray[prev];
            cur = prev;
        }
        this.mSize++;
        this.mArray[cur]=data;
    };

    Kata.Deque.prototype.push_back=function(e) {
        if (this.mSize>=this.mArray.length) {//expand
            this.expand();
        }
        var destIndex=this.mHead+this.mSize;
        if (destIndex>=this.mArray.length) {
            destIndex-=this.mArray.length;
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
            destIndex-=this.mArray.length;
        }
        return this.mArray[destIndex];
    };

    Kata.Deque.prototype.back=function() {
        var destIndex=this.mHead+this.mSize-1;
        if (destIndex>=this.mArray.length) {
            destIndex-=this.mArray.length;
        }
        return this.mArray[destIndex];
    };

    Kata.Deque.prototype.pop_back=function() {
        if (this.mSize==0) return undefined;
        var destIndex=this.mHead+this.mSize-1;
        if (destIndex>=this.mArray.length) {
            destIndex-=this.mArray.length;
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
        var size = this.mSize;
        var head = this.mHead;
        var len = this.mArray.length;
        for (var i=index;i+1<size;++i) {
            this.mArray[(i+head)%len]=this.mArray[(i+1+head)%len];
        }
        this.pop_back();
    };
    var checkContents=function(d,l) {
        var error=false;
        for (var i=0;i<l.length;++i) {
            if (d.index(i)!=l[i]) {
                error=true;
            }
        }
        if (error) {
            Kata.log(JSON.stringify(d)+"!="+JSON.stringify(l));
        }
    };
    var test = function () {
        var d0 = new Kata.Deque();
        d0.push_back(5);
        d0.push_back(6);
        d0.push_back(7);
        d0.push_back(8);
        d0.push_front(4);
        d0.push_front(3);
        d0.push_front(2);
        d0.push_front(1);
        checkContents(d0,[1,2,3,4,5,6,7,8]);
        d0.insert(0,0);
        checkContents(d0,[0,1,2,3,4,5,6,7,8]);
        d0.insert(9,9);
        checkContents(d0,[0,1,2,3,4,5,6,7,8,9]);
        d0.insert(8,7.5);
        checkContents(d0,[0,1,2,3,4,5,6,7,7.5,8,9]);
        d0.insert(1,0.5);
        checkContents(d0,[0,0.5,1,2,3,4,5,6,7,7.5,8,9]);
        d0.insert(3,1.5);
        checkContents(d0,[0,0.5,1,1.5,2,3,4,5,6,7,7.5,8,9]);
        d0.erase(3);
        checkContents(d0,[0,0.5,1,2,3,4,5,6,7,7.5,8,9]);
        d0.pop_front();
        checkContents(d0,[0.5,1,2,3,4,5,6,7,7.5,8,9]);
        d0.erase(8);
        checkContents(d0,[0.5,1,2,3,4,5,6,7,8,9]);        
        d0.insert(6,5.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6,7,8,9]);        
        d0.insert(7,6.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,6,7,8,9]);        
        d0.insert(8,7.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,6,7,8,9]);        
        d0.insert(9,8.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,6,7,8,9]);        
        d0.insert(10,9.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,6,7,8,9]);        
        d0.insert(11,10.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,6,7,8,9]);        
        d0.insert(12,11.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,6,7,8,9]);        
        d0.insert(13,12.5);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,6,7,8,9]);
        d0.erase(17);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,6,7,8]);
        d0.erase(15);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,6,8]);
        d0.erase(14);
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,8]);
        d0.pop_back();
        checkContents(d0,[0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(0);
        checkContents(d0,[0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(-1);
        checkContents(d0,[-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(-2);
        checkContents(d0,[-2,-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(-3);
        checkContents(d0,[-3,-2,-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(-4);
        checkContents(d0,[-4,-3,-2,-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(-5);
        checkContents(d0,[-5,-4,-3,-2,-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_front(-6);
        checkContents(d0,[-6,-5,-4,-3,-2,-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5]);
        d0.push_back(13.5);
        checkContents(d0,[-6,-5,-4,-3,-2,-1,0,0.5,1,2,3,4,5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.5]);
        d0.clear();
        checkContents(d0,[]);
    };
    test();
})();
