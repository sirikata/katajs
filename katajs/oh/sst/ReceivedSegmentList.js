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
    // Insert (or update) a now valid range of bytes in the
    // stream. This updates our list, merging segments if necessary.
Kata.ReceivedSegmentList.prototype.insert = function(offset64, length) {
    // Simple case: empty list we can just insert directly
    
    var length64 = typeof(length)==typeof(offset64)?length:PROTO.I64.fromNumber(length);
    if (this.mSegments.empty()) {
        this.mSegments.push_back(SegmentRange(offset64, length64));
        return;
    }
    
    // Might be able to insert it at the front, which the following loop
    // doesn't catch properly
    var offsetPlusLength64 = offset64.add(length64);
    if (!(EndByte(mSegments.front()).less(offsetPlusLength64))) {//(offset+length) <= EndByte(mSegments.front())) {
            var merge_first = !offsetPlusLength64.less(StartByte(mSegments.front()));//(offset+length) >= StartByte(mSegments.front());
            if (merge_first) {
                // Could be pure overlap. Only need to do anything if this
                // extends the starting point of the segment to be earlier
                if (offset64.less(StartByte(mSegments.front()))) {
                    mSegments.front()[LENGTH] = Length(mSegments.front()).add(mSegments.front()[START_BYTE].sub(offset64));
                    mSegments.front()[START_BYTE] = offset64;
                }
            }
            else {
                // No merge, just add a new one
                mSegments.push_front(SegmentRange(offset64, length64));
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
            if (i+1<=dequeSize)
                next_it = this.mSegments.index(i+1);
            // If the segments start byte is in the current segment,
            // we've got some overlap

            if ((!StartByte(it).less(offset64)) && offset64.less(EndByte(it))) {//offset >= StartByte(*it) && offset < EndByte(*it)) {
                // Currently we only handle complete overlap. Since we
                // don't ever re-segment things currently, this should
                // be fine. However, we could have merged, so the
                // complete overlap on this inserted segment could
                // only cover a part of the segment we overlap, so we
                // still have to be careful with this assertion
                if (EndByte.less(offsetPlusLength64)) {
                    Kata.error("ASSERT FAILED: offset "+offset64.toString()+"+ length "+length64.toString()+"<= EndByte(*it)"+EndByte(it).toString());
                }
                // Nothing to do since it's already registered
                return;
            }

            // Otherwise we're looking for a place to insert between
            // other segments, and then possibly merging. We need to
            // have overlap of an empty region, i.e. between the
            // current and next segments.
            if ((!offset.less(EndByte(it))) &&//offset >= EndByte(*it) &&
                (next_it === null || (!StartByte(next_it).less(offsetPlusLength64))))//(next_it == mSegments.end() || (offset+length) <= StartByte(*next_it)))
            {
                var merge_previous = (offset64.equals(EndByte(it)));
                var merge_next = (next_it !== null && (offsetPlusLength64.equals(StartByte(next_it))));
                if (merge_previous) {
                    // Merge previous, might also need to merge next
                    if (merge_next) {
                        // Crosses all three, merge into first, remove second
                        it[LENGTH] = next_it[LENGTH].add(StartByte(next_it).sub(StartByte(it)));
                        mSegments.erase(i+1);
                    }
                    else {
                        // Crosses just the two, merge in and no insert/remove
                        it[LENGTH] = length64.add(offset64.sub(StartByte(it)));
                    }
                }
                else if (merge_next) {
                    // Or only merge next. Need to use start from
                    // inserted segment and combine their lengths
                    next_it[LENGTH] = next_it[LENGTH].add(StartByte(next_it).sub(offset64));
                    next_it[START_BYTE] = offset64;
                }
                else {
                    // No merging, just insert (before next_it).
                    mSegments.insert(i+1, SegmentRange(offset64, length64));
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
Kata.ReceivedSegmentList.prototype.readyRange(nextStartByte64, skipCheckLength64) {
        // Start looking at our data from after the skip data
        var skipStartByte64 = nextStartByte64.add(skipCheckLength64);
        // In case the skip data covers any of our segments, pop
        // things off the front of the list as long as they are
        // completely covered.
        while(!this.mSegments.empty() && !(skipStartByte64.less(EndByte(this.mSegments.front()))))//EndByte(mSegments.front()) <= skipStartByte)
            mSegments.pop_front();

        // If we don't have any ready segments, we can only account for the
        // skipped data. Otherwise, we're guaranteed only partial coverage,
        // contiguous, or doesn't reach the first segment. First, handle no
        // ready segments and non-contiguous since it's simple -- the start of
        // the first data we know about is beyond the start byte.
        if (mSegments.empty() ||
            (skipStartByte64.less(StartByte(mSegments.front()))))
        {
            return SegmentRange(nextStartByte64, skipCheckLength64);
        }

        // Then we only have overlap or just contiguous, in which case
        // we span from the start of the skipData (i.e. nextStartByte)
        // to the end of the next segment.
        var ready = mSegments.front();
        mSegments.pop_front();
        // The next segment shouldn't be contiguous with the ready
        // range. Note >, not >= since == would imply it is
        // contiguous. This is really just a sanity check on the
        // SegmentRange insertion code.
        if (!(mSegments.empty() || EndByte(ready).less(StartByte(mSegments.front())) )) {
            Kata.error("ASSERT FAILED: mSegments.empty() || mSegments.front().first > EndByte(ready)");
        }
        return SegmentRange(nextStartByte64, EndByte(ready).sub(nextStartByte64));
    };

    Kata.ReceivedSegmentList.prototype.empty=function(){
        return this.mSegments.empty();
    };
},'katajs/oh/sst/ReceivedSegmentList.js'); // class ReceivedSegmentList
