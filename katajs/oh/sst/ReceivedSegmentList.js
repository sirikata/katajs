Kata.require([
    'katajs/core/Deque.js'
], function() {
var LENGTH=1;
var START_BYTE=0;
function StartByte(sr) {
    return sr[START_BYTE];
}
function Length(sr) {
    return sr[LENGTH];
}
Kata.ReceivedSegmentListLength = Length;
function EndByte(sr) {
    return sr[START_BYTE].add(sr[LENGTH]);
}

function SegmentRange(offset,length){
    return [offset,length];
}
// Tracks segments that have been received in a stream, handling
// merging them so we can deliver as much data in each callback as
// possible.
Kata.ReceivedSegmentList = function() {
    //@type {Kata.Deque} holding individual SegmentRange pairs (array of size 2)
    this.mSegments = new Kata.Deque(); 
        
    
};
//returns true if the list matches exactly the received segment list... all numbers are converted to I64 [[5,3],[10,5]]
Kata.ReceivedSegmentList.prototype.checkEquality = function(listToCompareTo) {
    var size = this.mSegments.size();
    if (size!=listToCompareTo.length) return false;
    for (var i=0;i<size;++i) {
        var segment = this.mSegments.index(i);
        var sublist = listToCompareTo[i];
        if (segment.length!=sublist.length)
            return false;
        for(var j=0;j<sublist.length;++j) {
            var slj = sublist[j];
            var sgj = segment[j];
            if (typeof(slj)===typeof(1)) {
                slj = PROTO.I64.fromNumber(slj);
            }
            if (!sgj.equals(slj)) {
                return false;   
            }
        }
    }
    return true;    
};
var codePaths = 0;
    // Insert (or update) a now valid range of bytes in the
    // stream. This updates our list, merging segments if necessary.
Kata.ReceivedSegmentList.prototype.insert = function(offset64, length) {
    // Simple case: empty list we can just insert directly
    
    var length64 = typeof(length)==typeof(offset64)?length:PROTO.I64.fromNumber(length);
    if (this.mSegments.empty()) {
        codePaths|=1;
        this.mSegments.push_back(SegmentRange(offset64, length64));
        return;
    }
    
    // Might be able to insert it at the front, which the following loop
    // doesn't catch properly
    var offsetPlusLength64 = offset64.add(length64);
    if (!(EndByte(this.mSegments.front()).less(offsetPlusLength64))) {//(offset+length) <= EndByte(mSegments.front())) {
            var merge_first = !offsetPlusLength64.less(StartByte(this.mSegments.front()));//(offset+length) >= StartByte(mSegments.front());
            if (merge_first) {
                // Could be pure overlap. Only need to do anything if this
                // extends the starting point of the segment to be earlier
                if (offset64.less(StartByte(this.mSegments.front()))) {
                    codePaths|=2;
                    this.mSegments.front()[LENGTH] = Length(this.mSegments.front()).add(this.mSegments.front()[START_BYTE].sub(offset64));
                    this.mSegments.front()[START_BYTE] = offset64;
                }else {
                    codePaths|=4;                    
                }
            }
            else {
                codePaths|=8;
                // No merge, just add a new one
                this.mSegments.push_front(SegmentRange(offset64, length64));
            }
            // Either way, we've used this update, so we can skip the rest.
            return;
        }

        // Figure out what entry we we can insert after
        var dequeSize = this.mSegments.size();
        for (var i=0;true;++i) {
            if (i>=dequeSize) {
                Kata.error("Out of bounds on deque when tracking received segments");
            }
            var it = this.mSegments.index(i);
            var next_it = null;
            if (i+1<dequeSize){
                codePaths|=16;               
                next_it = this.mSegments.index(i+1);
            }
            // If the segments start byte is in the current segment,
            // we've got some overlap

            // Otherwise we're looking for a place to insert between
            // other segments, and then possibly merging. We need to
            // have overlap of an empty region, i.e. between the
            // current and next segments.
            if ((!offset64.less(StartByte(it))) &&//offset >= StartByte(*it) &&
                (next_it === null || (offset64.less(StartByte(next_it)))))//(next_it == mSegments.end() || (offset < StartByte(*next_it)))
            {
                var merge_previous = (!EndByte(it).less(offset64));
                var merge_next = (next_it !== null && !(offsetPlusLength64.less(StartByte(next_it))));
                var modified_index = null;
                if (merge_previous) {
                    // Merge previous, might also need to merge next
                    if (merge_next) {
                        codePaths|=32;
                        // Crosses all three, merge into first, remove second
                        var cand0=next_it[LENGTH].add(StartByte(next_it).sub(StartByte(it)));
                        var cand1=offsetPlusLength64.sub(StartByte(it));
                        
                        it[LENGTH] = cand0.less(cand1)?cand1:cand0;
                        this.mSegments.erase(i+1);
                        modified_index=i;
                    }
                    else {
                        codePaths|=64;               
                        // Crosses just the two, merge in and no insert/remove
                        it[LENGTH] = length64.add(offset64.sub(StartByte(it)));
                        modified_index=i;
                    }
                }
                else if (merge_next) {
                    codePaths|=128;               
                    // Or only merge next. Need to use start from
                    // inserted segment and combine their lengths
                    var cand0 = next_it[LENGTH].add(StartByte(next_it).sub(offset64));
                    var cand1 = length64;
                    next_it[LENGTH] = cand0.less(cand1)?cand1:cand0;
                    next_it[START_BYTE] = offset64;
                    modified_index=i+1;
                }
                else {
                    codePaths|=256;               
                    // No merging, just insert (before next_it).
                    this.mSegments.insert(i+1, SegmentRange(offset64, length64));
                    modified_index=i+1;
                }
                if (merge_next) {
                    while (modified_index+1<this.mSegments.size()) {
                        next_it = this.mSegments.index(modified_index+1);
                        if (!offsetPlusLength64.less(StartByte(next_it))) {
                            var next_end_byte = EndByte(next_it);
                            if (offsetPlusLength64.less(next_end_byte)) {
                                codePaths|=512;
                                this.mSegments.index(modified_index)[LENGTH] = next_end_byte.sub(this.mSegments.index(modified_index)[START_BYTE]);
                            }else {
                                codePaths|=1024;                                
                            }
                            this.mSegments.erase(modified_index+1);
                        }else {
                            codePaths|=2048;
                            break;
                        }
                    }
                }
                return;
            }

            // Otherwise, we need to keep moving along to find the
            // right spot
        }
    };

    // Get the range of ready bytes given that we have a specific next
    // expected byte. skipCheckLength lets you indicate that you know
    // you've already added a certain number of bytes that don't need
    // to be accounted for here because you just received them. This
    // also *removes this data* from the segment list so it should
    // only be called when you're going to deliver data.
Kata.ReceivedSegmentList.prototype.readyRange=function(nextStartByte64, skipCheckLength) {
        var skipCheckLength64 = PROTO.I64.fromNumber(skipCheckLength);
        // Start looking at our data from after the skip data
        var skipStartByte64 = nextStartByte64.add(skipCheckLength64);
        // In case the skip data covers any of our segments, pop
        // things off the front of the list as long as they are
        // completely covered.
        while(!this.mSegments.empty() && !(skipStartByte64.less(EndByte(this.mSegments.front()))))//EndByte(mSegments.front()) <= skipStartByte)
            this.mSegments.pop_front();

        // If we don't have any ready segments, we can only account for the
        // skipped data. Otherwise, we're guaranteed only partial coverage,
        // contiguous, or doesn't reach the first segment. First, handle no
        // ready segments and non-contiguous since it's simple -- the start of
        // the first data we know about is beyond the start byte.
        if (this.mSegments.empty() ||
            (skipStartByte64.less(StartByte(this.mSegments.front()))))
        {
            return SegmentRange(nextStartByte64, skipCheckLength64);
        }

        // Then we only have overlap or just contiguous, in which case
        // we span from the start of the skipData (i.e. nextStartByte)
        // to the end of the next segment.
        var ready = this.mSegments.front();
        this.mSegments.pop_front();
        // The next segment shouldn't be contiguous with the ready
        // range. Note >, not >= since == would imply it is
        // contiguous. This is really just a sanity check on the
        // SegmentRange insertion code.
        if (!(this.mSegments.empty() || EndByte(ready).less(StartByte(this.mSegments.front())) )) {
            Kata.error("ASSERT FAILED: mSegments.empty() || mSegments.front().first > EndByte(ready)");
        }
        return SegmentRange(nextStartByte64, EndByte(ready).sub(nextStartByte64));
    };

    Kata.ReceivedSegmentList.prototype.empty=function(){
        return this.mSegments.empty();
    };
    function test () {

        function check(sl,l){
            if (!sl.checkEquality(l)) {
                Kata.log(JSON.stringify(sl)+"!="+JSON.stringify(l));
            }
        }
        var sl = new Kata.ReceivedSegmentList();
        check(sl,[]);
        sl.insert(PROTO.I64.fromNumber(8),4);
        check(sl,[[8,4]]);
        sl.insert(PROTO.I64.fromNumber(16),4);
        check(sl,[[8,4],[16,4]]);
        sl.insert(PROTO.I64.fromNumber(4),6);
        check(sl,[[4,8],[16,4]]);
        sl.insert(PROTO.I64.fromNumber(10),4);
        check(sl,[[4,10],[16,4]]);
        sl.insert(PROTO.I64.fromNumber(15),4);
        check(sl,[[4,10],[15,5]]);
        sl.insert(PROTO.I64.fromNumber(10),8);
        check(sl,[[4,16]]);
        sl.insert(PROTO.I64.fromNumber(24),1);
        check(sl,[[4,16],[24,1]]);
        sl.insert(PROTO.I64.fromNumber(25),1);
        check(sl,[[4,16],[24,2]]);
        sl.insert(PROTO.I64.fromNumber(28),2);
        check(sl,[[4,16],[24,2],[28,2]]);
        sl.insert(PROTO.I64.fromNumber(18),14);
        check(sl,[[4,28]]);
        sl.insert(PROTO.I64.fromNumber(36),4);
        check(sl,[[4,28],[36,4]]);
        sl.insert(PROTO.I64.fromNumber(48),4);
        check(sl,[[4,28],[36,4],[48,4]]);
        sl.insert(PROTO.I64.fromNumber(30),20);              
        check(sl,[[4,48]]);
        sl.insert(PROTO.I64.fromNumber(4),4);              
        check(sl,[[4,48]]);
        sl.insert(PROTO.I64.fromNumber(1),2);              
        check(sl,[[1,2],[4,48]]);
        sl.insert(PROTO.I64.fromNumber(3),1);              
        check(sl,[[1,51]]);
        sl.insert(PROTO.I64.fromNumber(0),1);              
        check(sl,[[0,52]]);

        sl.insert(PROTO.I64.fromNumber(64),32);              
        check(sl,[[0,52],[64,32]]);
        sl.insert(PROTO.I64.fromNumber(128),32);              
        check(sl,[[0,52],[64,32],[128,32]]);

        sl.insert(PROTO.I64.fromNumber(62),128);              
        check(sl,[[0,52],[62,128]]);
        if (codePaths!=2047) {            
            Kata.log("RSL test failed to test all code paths:"+codePaths);
        }
    }
    test();
},'katajs/oh/sst/ReceivedSegmentList.js'); // class ReceivedSegmentList
