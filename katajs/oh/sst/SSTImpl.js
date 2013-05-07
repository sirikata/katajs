/*  katajs SST over ODP implementation
 *  SSTImpl.js
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

Kata.require([
    'katajs/core/Deque.js',
    'katajs/oh/sst/ReceivedSegmentList.js',
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/SSTHeader.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/ObjectMessage.pbj.js']
], function() {
    function mapEmpty(m) {
        for (var i in m) {
            return false;
        }
        return true;
    }
var SECONDS_TO_TIMEOUT_SST = 300;
function KataTrace(thus,name,args) {
    return;
    if (true||!thus) {
       thus = Kata.SST.Stream;
    }
    if (!thus.traceLog) {
        thus.traceLog={
            
        };
    }
    if (name in thus.traceLog) {
        thus.traceLog[name]++;        
    }else {
        thus.traceLog[name]=1;        
    }
    if (thus.traceLog[name]<5||thus.traceLog[name]%100==0){
        var logStr =thus.traceLog[name]+" Called "+name+"("; 
        for (var i=0;i<args.length;++i) {
            logStr+=args[i]+",";
        }
        console.log(logStr+")");
    }

}
function nopArrayClass(){}
nopArrayClass.prototype.push=function(a){}
var AAaconnectedACount=new nopArrayClass();
var AAdisconnectedACount=new nopArrayClass();
var AAconnectedACount=new nopArrayClass();
var AAconnectedBCount=new nopArrayClass();
var AAconnectedDCount=new nopArrayClass();
var AApendingDisconnectedDCount=new nopArrayClass();
var AAdisconnectedDCount=new nopArrayClass();
var AAdisconnectedBCount=new nopArrayClass();
var AAdisconnectedCCount=new nopArrayClass();
var AApendingDisconnectedACount=new nopArrayClass();
var AApendingDisconnectedBCount=new nopArrayClass();
var AApendingDisconnectedCCount=new nopArrayClass();

var KataDequePushBack = function(x,y){x.push_back(y);};
var KataDequePushFront = function(x,y){return x.push_front(y);};
var KataDequePopBack = function(x){return x.pop_back();};
var KataDequePopFront = function(x){return x.pop_front();};
var KataDequeBack = function(x){return x.back();};
var KataDequeFront = function(x){return x.front();};
var KataDequeLength = function(x){return x.size();};
var KataDequeEmpty = function(x){return x.empty();};
var KataDequeIndex = function(x,y){return x.index(y);};
var KataDequeClear = function(x){return x.clear();};
var KataDequeErase = function(x,index) {return x.erase(index);};
if (typeof(Kata.SST) == "undefined") {Kata.SST = {};}
if (typeof(Kata.SST.Impl) == "undefined") {Kata.SST.Impl = {};}






/**
 * @constructor
*/
Kata.SST.ObjectMessageDispatcher = function() {
    this.mObjectMessageRecipients = {};
};

// Registration and unregistration for object messages destined for the space
Kata.SST.ObjectMessageDispatcher.prototype.registerObjectMessageRecipient = function(port, oid, recipient) {
    this.mObjectMessageRecipients[port] = recipient;
    console.log("Registering Listener:{");
    for (port in this.mObjectMessageRecipients) {
        var conn =         this.mObjectMessageRecipients[port];
        var transmit_seqno=JSON.stringify(conn.mTransmitSequenceNumber);
        console.log(oid+":"+port+" -> "+transmit_seqno+","+conn.mLocalChannelID);
    }
    console.log("}:Registering Listener");
};
Kata.SST.ObjectMessageDispatcher.prototype.unregisterObjectMessageRecipient = function(port, recipient) {
    var currentRecipient = this.mObjectMessageRecipients[port];
    if (currentRecipient != recipient) {
        Kata.log("Unregistering wrong recipient for port "+port);
    } else {
        delete this.mObjectMessageRecipients[port];
    }
};
Kata.SST.ObjectMessageDispatcher.prototype.dispatchMessage = function(msg) {
    if (msg.dest_port in this.mObjectMessageRecipients) {
        var recipient = this.mObjectMessageRecipients[msg.dest_port];
        // BaseDatagramLayer
        return recipient.receiveMessageRaw(msg);
    }
    return false;
};

/**
 * @constructor
 * @param {!EndPointType} endPoint The end point object (must have .id field)
 * @param {number} port
*/

Kata.SST.EndPoint = function(endPoint, port) {
    /**
     * The object to communicate to. Must sport a .id field so EndPoints may be sorted 
     * @type {!EndPointType}
     */
    this.endPoint=endPoint;
    /**
     * The port on the object to communicate to
     * @type {number}
     */
    this.port=port;
};

Kata.SST.EndPoint.prototype.uid=function() {
    return ""+this.endPoint+":"+this.port;
};

Kata.SST.EndPoint.prototype.toString=Kata.SST.EndPoint.prototype.uid;

Kata.SST.EndPoint.prototype.objectId=function() {
    return this.endPoint;
};

/** 
 * @constructor
 * @param {!ObjectMessageRouter} router
 * @param {!ObjectMessageDispatcher} dispatcher
 */
Kata.SST.Impl.BaseDatagramLayer=function(router,dispatcher, context) {
    /**
     * The place to send messages on the wire
     * @type {!ObjectMessageRouter}
     */
    this.mRouter=router;
    /**
     * The place where messages come from the wire
     * @type {!ObjectMessageDispatcher}
     */
    this.mDispatcher=dispatcher;
    this.mContext=context;
    this.mMinAvailableChannels=1;
    this.mMinAvailablePorts=2049;
    this.mAvailableChannels=[];
    this.mAvailablePorts=[];
};


/**
 * The map from object id's to end points
 */
var sDatagramLayerMap={};

/**
 * map from Kata.SST.EndPoint::uid() to function
 */
var sListeningConnectionsCallbackMapSST={};

/**
 * @param {!Kata.SST.EndPoint} endPoint The end point object (must have .uid() and .objectId() functions)
 */
var getDatagramLayerSST = function(endPoint) {
    var id=endPoint.objectId();
    if (id in sDatagramLayerMap) {
        return sDatagramLayerMap[id];
    }
    return null;
};
var destroyDatagramLayerSST=function(objectId) {
    if (objectId in sDatagramLayerMap) {
        delete sDatagramLayerMap[objectId];
        return true;
    }
    return false;
};
/**
 * @param {!Kata.SST.EndPoint} endPoint The end point object (must have .uid() and .objectId() functions)
 * @param {!ObjectMessageRouter} router The place where messages may be sent to the wire
 * @param {!ObjectMessageDispatcher} dispatcher The place where messages may be returned from the wire
 */
Kata.SST.createBaseDatagramLayer = function(endPoint,router,dispatcher) {
    var id=endPoint.objectId();
    if (id  in sDatagramLayerMap){
        return sDatagramLayerMap[id];
    }
    return (sDatagramLayerMap[id]=new Kata.SST.Impl.BaseDatagramLayer(router,dispatcher));
};

/**
 * @param {!string} objectId The ID of the object from the space objectUUID 
 * This function destroys the datagram layer so futuer communications to the object ID do not get sent out along this connection path 
 * and a new one is created instead
 */
Kata.SST.destroyBaseDatagramLayer = function(objectId) {
    return destroyDatagramLayerSST(objectId);
};

Kata.SST.getBaseDatagramLayer = function(endPoint) {
    var id=endPoint.objectId();
    if (id  in sDatagramLayerMap){
        return sDatagramLayerMap[id];
    }
    return undefined;
}

/**
 * @param {!Kata.SST.EndPoint} listeningEndPoint The end point that wishes to receive messages from the ObjectMessageDispatcher (must have .uid() and .objectId() functions)
 * @returns whether a baseDatagramLayer to register for was available
 */
var listenBaseDatagramLayerSST = function(listeningEndPoint){
    var id= listeningEndPoint.objectId();
    var baseDatagramLayer=sDatagramLayerMap[id];
    if (baseDatagramLayer) {
        baseDatagramLayer.mDispatcher.registerObjectMessageRecipient(listeningEndPoint.port,listeningEndPoint.endPoint,baseDatagramLayer);
        return true;
    }else return false;
};

/**
 * @returns {Context} the space context of this item
 */
Kata.SST.Impl.BaseDatagramLayer.prototype.context=function() {
    return this.mContext;
};

/**
 * @param {!Kata.SST.EndPoint} src
 * @param {!Kata.SST.EndPoint} dst
 * @param {Array} data
 * @returns {boolean} route success
 */
Kata.SST.Impl.BaseDatagramLayer.prototype.send=function(src,dest,data) {
    var objectMessage=new Sirikata.Protocol.Object.ObjectMessage();
    objectMessage.source_object=src.objectId();
    objectMessage.source_port=src.port;
    objectMessage.dest_object=dest.objectId();
    objectMessage.dest_port=dest.port;
    objectMessage.unique = PROTO.I64.fromNumber(0);
    objectMessage.payload=data;
    return this.mRouter.route(objectMessage);
};

/**
 * @param {!Sirikata.Protocol.Object.ObjectMessage} msg 
*/
Kata.SST.Impl.BaseDatagramLayer.prototype.receiveMessage=Kata.SST.Impl.BaseDatagramLayer.prototype.receiveMessageRaw=function(msg)  {
    return connectionHandleReceiveSST(this,
                            new Kata.SST.EndPoint(msg.source_object, msg.source_port),
                            new Kata.SST.EndPoint(msg.dest_object, msg.dest_port),
                            msg.payload);
};
Kata.SST.Impl.BaseDatagramLayer.prototype.dispatcher=function() {
    return this.mDispatcher;
};

Kata.SST.Impl.BaseDatagramLayer.prototype.getAvailablePort=function() {
    var len=this.mAvailablePorts.length;
    if (len) {
        var retval=this.mAvailablePorts[len-1];
        this.mAvailabePorts.length=len-1;
    }
    return this.mMinAvailablePorts++;
};
Kata.SST.Impl.BaseDatagramLayer.prototype.releasePort=function(port) {
    if (port<=2048)
        return;
    if (port+1==this.mMinAvailablePorts) {
        --this.mMinAvailablePorts;
    }else {
        this.mAvailablePorts[this.mAvailablePorts.length]=port;
    }
};
Kata.SST.Impl.BaseDatagramLayer.prototype.getAvailableChannel=function() {
    var len=this.mAvailableChannels.length;
    if (len) {
        var retval=this.mAvailableChannels[len-1];
        this.mAvailabeChannels.length=len-1;
    }
    return this.mMinAvailableChannels++;
};
Kata.SST.Impl.BaseDatagramLayer.prototype.releaseChannel=function(channel) {
    if (channel+1==this.mMinAvailableChannels) {
        --this.mMinAvailableChannels;
    }else {
        this.mAvailableChannels[this.mAvailableChannels.length]=channel;
    }
};

Kata.SST.SUCCESS = 0;
Kata.SST.FAILURE = -1;
/**
 * @param {Array} data
 * @param {PROTO.I64} channelSeqNum,
 * @param {PROTO.I64} ackSequenceNum
 */
Kata.SST.Impl.ChannelSegment = function(data,channelSeqNum,ackSequenceNum){
    /**
     * @type {Array}
     */
    this.mBuffer=data;
    /**
     * @type PROTO.I64
     */
    this.mChannelSequenceNumber=channelSeqNum;
    /**
     * @type PROTO.I64    
     */
    this.mAckSequenceNumber=ackSequenceNum;
    /**
     * @type Date
     */
    this.mTransmitTime=null;
    /**
     * @type Date
     */
    this.mAckTime=null;
};

/**
 * @param {Date} ackTime
 */
Kata.SST.Impl.ChannelSegment.prototype.setAckTime=function(ackTime) {
        this.mAckTime=ackTime;
};

var SST_BASE_CWND=10;
var SST_BASE_SSTHRESH=32768;
var gUniqueName=0;
/**
 * @param {!Kata.SST.EndPoint} localEndPoint 
 * @param {!Kata.SST.EndPoint} remoteEndPoint 
 */
Kata.SST.Connection = function(localEndPoint,remoteEndPoint, callback){
    var endPointUid = localEndPoint.uid();
    if (endPointUid in sConnectionMapSST) {
        Kata.log("mConnectionMap.find failed for " +localEndPoint.uid());
    }
    
    sConnectionMapSST[endPointUid] = this;
    this.mConnectionReturnCallback = callback;
    this.mUniqueName=gUniqueName++;
    KataTrace(this,"Kata.SST.Connection",arguments);
    /**
     * @type {!Kata.SST.EndPoint}
     */
    this.mLocalEndPoint=localEndPoint;
    /**
     * @type {!Kata.SST.EndPoint}
     */
    this.mRemoteEndPoint=remoteEndPoint;
    /**
     * @type {number}
     */
    this.mState=CONNECTION_DISCONNECTED_SST;
    /**
     * @type {number}
     */
    this.mRemoteChannelID=0;
    /**
     * @type {number}
     */
    this.mLocalChannelID=1;
    /**
     * @type {!PROTO.I64}
     */
    this.mTransmitSequenceNumber=PROTO.I64.ONE;
    /**
     * @type {!PROTO.I64}
     */
    this.mLastReceivedSequenceNumber=PROTO.I64.ONE;

    /**
     * Maps LSID->[[]] array of uint8array
     */
    this.mPartialReadDatagrams={};
    /**
     * @type {number}
     */
    this.mNumStreams=0;
    /**
     * @type {number}
     */
    this.mCwnd=SST_BASE_CWND;
    this.mSSThresh = SST_BASE_SSTHRESH;
    /**
     * @type {number}
     */
    this.mRTOMilliseconds=5000; // Intentionally > 1 second. Do not change.
    /**
     * @type {boolean}
     */
    this.mFirstRTO=true;
    /**
     * @type {Date}
     */
    this.mLastTransmitTime=Date.now();
    /**
     * @type {number}
     */
    this.mNumInitialRetransmissionAttempts=0;
    /**
     * @type {boolean}
     */
    this.mInSendingMode=true;
    this.mCheckAliveTimer = setInterval(Kata.bind(this.checkIfAlive,this),300000);

    this.mServiceTimer = null;
    this.mServiceTimerExpiresTime=0;
    this.mServiceConnectionNoReturn = Kata.bind(this.serviceConnection,this);

    /**
     * @type{!Kata.SST.Impl.BaseDatagramLayer}
     */
    this.mDatagramLayer=getDatagramLayerSST(localEndPoint);
    this.mDatagramLayer.dispatcher().registerObjectMessageRecipient(localEndPoint.port,localEndPoint.endPoint,this);
    /**
     * @type {!map} Map from LSID to Stream
     */
    this.mOutgoingSubstreamMap={};
    /**
     * @type {!map} Map from LSID to Stream
     */
    this.mIncomingSubstreamMap={};

    /**
     * @type {!map} Map from port to StreamReturnCallbackFunction==void(int, boost::shared_ptr< Stream<UUID> ) 
     */
    this.mListeningStreamsCallbackMap={};
    /**
     * @type {!map} Map from port to readDatagramCallback== void(Array)
     */
    this.mReadDatagramCallbacks={};
    /**
     * @type {!KataDeque} Deque of Kata.SST.Impl.ChannelSegment
     */
    this.mQueuedSegments=new Kata.Deque();
    /**
     * @type {!KataDeque} Deque of Kata.SST.Impl.ChannelSegment
     */
    this.mOutstandingSegments=new Kata.Deque();

};

  /**
    Returns the local endpoint to which this connection is bound.

    @return the local endpoint.
  */
Kata.SST.Connection.prototype.localEndPoint=function()  {
    return this.mLocalEndPoint;
};

  /**
    Returns the remote endpoint to which this connection is bound.

    @return the remote endpoint.
  */
Kata.SST.Connection.prototype.remoteEndPoint=function()  {
    return this.mRemoteEndPoint;
};


Kata.SST.Connection.prototype.getContext=function() {
    return this.mDatagramLayer.context();
};

/**
 * @param {Sirikata.Protocol.SST.SSTChannelHeader} sstMsg 
 * @returns {boolean} whether send actually fires off a packet.
 */
Kata.SST.Connection.prototype.sendSSTChannelPacket=function(sstMsg){
    if (this.mState==CONNECTION_DISCONNECTED_SST) return false;
    var buffer=sstMsg.SerializeToArray();
    return this.mDatagramLayer.send(this.mLocalEndPoint,this.mRemoteEndPoint,buffer);
};
Kata.SST.Connection.prototype.scheduleConnectionService=function (after) {
    if (!after) after=0;
    if (this.mInSendingMode) {
        if (!((!KataDequeEmpty(this.mQueuedSegments)) && KataDequeLength(this.mOutstandingSegments) <= this.mCwnd)) {
            Kata.error("ASSERTION FAILED: For our current approach, we should never service in\nsending mode unless we're going to be able to send some\ndata. The correctness of the servicing depends on this since\nyou need to pass through the loop below at least once to\nadjust some properties (e.g. sending mode).");
        }
        
    }
    if (this.mState==CONNECTION_DISCONNECTED_SST) {
        Kata.error("Attempted to schedule connection service that was already disconnected");        
        return;
    }
    var needs_scheduling = false;
    var now = Date.now();
    if (this.mServiceTimer===null) {
        needs_scheduling=true;
    }else if(this.mServiceTimer!==null && this.mServiceTimerExpiresTime > now+after) {
        needs_scheduling = true;
        // No need to check success because we're using a strand and we can
        // only get here if timer->expiresFromNow() is positive.
        clearTimeout(this.mServiceTimer);
        this.mServiceTimer = null;    
    }

    if (needs_scheduling) {
        setTimeout(this.mServiceConnectionNoReturn,after);
        this.mServiceTimerExpiresTime = now+after;
    }
};

/**
 * @param {Date} curTime
 * @returns {boolean}
 */
Kata.SST.Connection.prototype.serviceConnection=function () {
    this.mServiceTimer=null;//we got called back
    var curTime = Date.now();

    // Special case: if we've gotten back into serviceConnection while
    // we're waiting for the connection to get setup, we can just
    // clear out the outstanding connection packet. Normally
    // outstanding packets would get cleared by not being in sending
    // mode, but we never change out of sending mode during connection
    // setup.
    if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
        KataDequeClear(this.mOutstandingSegments);
    }


    // should start from ssthresh, the slow start lower threshold, but starting
    // from 1 for now. Still need to implement slow start.
    if (this.mState == CONNECTION_DISCONNECTED_SST) {
        setTimeout(Kata.bind(this.cleanup,this),0);
        return false;
    }
    else if (this.mState == CONNECTION_PENDING_DISCONNECT_SST) {
        if (KataDequeEmpty(this.mQueuedSegments)) {
            setTimeout(Kata.bind(this.cleanup,this),0);
            this.mState = CONNECTION_DISCONNECTED_SST;
            return false;
        }else {
            if (!this.mInSendingMode) {
                Kata.warn("Empty deque but not in sending mode for disconnected stream");
            }
        }
    }
    // For the connection, we are in one of two modes: sending or
    // waiting for acks. Sending mode essentially just means we have
    // some packets to send and we've got room in the congestion
    // window, so we're going to be able to push out at least one more
    // packet. Otherwise, we're just waiting for a timeout on the
    // packets to guess that they have been lost, causing the window
    // size to adjust (or nothing is going on with the connection).

    if (this.mInSendingMode) {

      // NOTE: For our current approach, we should never service in
      // sending mode unless we're going to be able to send some
      // data. The correctness of the servicing depends on this since
      // you need to pass through the loop below at least once to
      // adjust some properties (e.g. sending mode).
        if (!((!KataDequeEmpty(this.mQueuedSegments)) && KataDequeLength(this.mOutstandingSegments) <= this.mCwnd)) {
            Kata.error("ASSERTION FAILED: For our current approach, we should never service in\nsending mode unless we're going to be able to send some\ndata. The correctness of the servicing depends on this since\nyou need to pass through the loop below at least once to\nadjust some properties (e.g. sending mode).");
        }
        for (var i=0; (!KataDequeEmpty(this.mQueuedSegments))&& KataDequeLength(this.mOutstandingSegments) <= this.mCwnd; ++i ) {
            var segment = KataDequeFront(this.mQueuedSegments);
	        var sstMsg=new Sirikata.Protocol.SST.SSTChannelHeader();
	        sstMsg.channel_id = this.mRemoteChannelID;
	        sstMsg.transmit_sequence_number = segment.mChannelSequenceNumber;
	        sstMsg.ack_count = 1;
	        sstMsg.ack_sequence_number = segment.mAckSequenceNumber;
            
	        sstMsg.payload = segment.mBuffer;
            this.sendSSTChannelPacket(sstMsg);
            
	        segment.mTransmitTime = curTime;
	        KataDequePushBack(this.mOutstandingSegments,segment);
            
            
	        this.mLastTransmitTime = curTime;
            // If we're setting up the connection, we hold ourselves in
            // sending mode and keep the initial connection packet in
            // the queue so it will get retransmitted if we don't hear
            // back from the other side. Otherwise, we're going to have
            // either filled up the congestion window or run out of
            // packets to send by the time we exit.
            if (this.mState != CONNECTION_PENDING_CONNECT_SST || this.mNumInitialRetransmissionAttempts > 5) {
                this.mInSendingMode = false;
                KataDequePopFront(this.mQueuedSegments);
            }
            // Stop sending packets after the first one if we're setting
            // up the connection since we'll just keep sending the first
            // (unpoppped) packet over and over until the window is
            // filled otherwise.
            if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
                this.mNumInitialRetransmissionAttempts++;
                break;
            }
            
        }


      // After sending, we need to decide when to schedule servicing
      // next. During normal operation, we can end up in two states
      // where we would enter serviceConnection in sending mode and
      // exit here: either we sent all our queued packets and have
      // space in the congestion window or we had to stop because the
      // window was full. In both cases, we need to set a timeout
      // after which we assume packets were dropped. If we get an ack
      // in the meantime, it puts us back in sending mode and
      // schedules servicing immediately, effectively resetting that
      // timer.
      //
      // Even when starting up, we're essentially in the same state --
      // we need to use our current backoff and test for drops. In
      // this case we'll hold ourselves in sending mode (see in the
      // loop above), keeping us from adjusting the congestion window,
      // but we still use the timeout to detect the drop, in that case
      // forcing a retransmit of the connect packet.
      //
      // So essentially, no matter what, if we came through servicing
      // in sending mode, we just use a timeout-drop-detector and
      // other events will trigger us to service earlier if necessary.

      // During startup, RTO hasn't been estimated so we need to have
      // a backoff mechanism to allow for RTTs longer than our initial
      // guess.
      if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
          // Use numattempts - 1 because we've already incremented
          // here. This way we start out with a factor of 2^0 = 1
          // instead of a factor of 2^1 = 2.
          this.scheduleConnectionService(this.mRTOMilliseconds*Math.pow(2.0,(this.mNumInitialRetransmissionAttempts-1)));
      }
      else {
          // Otherwise, just wait the expected RTT time, plus more to
          // account for jitter.
          this.scheduleConnectionService(this.mRTOMilliseconds*2);
        }
    }
    else {
        
        // If we are not in sending mode, then we had a timeout after
        // previous sends.

        // In the case of enough failures during connect, we just have
        // to give up.
        
        if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
            
            setTimeout(Kata.bind(this.cleanup,this),0);
            return false; //the connection was unable to contact the other endpoint.
        }

        // Otherwise, adjust the congestion window if we have
        // outstanding packets left.
        if (KataDequeLength(this.mOutstandingSegments) > 0) {
            // This is a non-standard approach, but since this is the only
            // indication of drops we currently use, it balances between the two
            // backoff approaches normally used. Normally on a retransmission
            // timeout we would set ssthresh = cwnd / 2 and cwnd = base_cwnd
            // on. However, we don't detect triple duplicate acks, where we
            // would only do backoff of ssthresh = cwnd / 2 and cwnd =
            // ssthresh. We need to have *some* indication of when to back off
            // in which way, so we decide based on what kind of growth we're
            // currently in -- we'll only fully back off if we detect a problem
            // during slow start (but not the first one since that's expected to
            // fail)
            var old_ssthresh = this.mSSThresh;
            this.mSSThresh =  this.mCwnd/2>SST_BASE_CWND*2?this.mCwnd/2:SST_BASE_CWND*2;
            
            if (this.mCwnd >= old_ssthresh || old_ssthresh == SST_BASE_SSTHRESH) {// linear growth, light back off
                this.mCwnd = this.mSSThresh;
                //SILOG(sst, insane, this << " RTO LINEAR - cwnd " << mCwnd << " ssthresh " << mSSThresh << "   state " << mState << " rto " << mRTOMicroseconds);
            }
            else {// slow start exponential growth, aggressive back off
                this.mCwnd = SST_BASE_CWND;
                //SILOG(sst, insane, this << " RTO SS - cwnd " << mCwnd << " ssthresh " << mSSThresh << "   state " << mState << " rto " << mRTOMicroseconds);
            }

            // Back off on the timeout as well since the congestion
            // could cause additional delays. It should recover
            // quickly if it really is lower still
            if (this.mRTOMilliseconds < 20000)
                this.mRTOMilliseconds *= 2;

            KataDequeClear(this.mOutstandingSegments);
            // We can't just clear outstanding segments because we could have *a
            // lot* queued up, and we need to get back to the dropped data. This
            // isn't ideal since it affects all streams (which will all now see
            // drops) but it gets the other stream back on track.
            KataDequeClear(this.mQueuedSegments);
        }

        // And if we have anything to send, put ourselves back into
        // sending mode and schedule servicing. Outstanding segments
        // should be empty, so we're guaranteed to send at least one
        // packet.
        if (!KataDequeEmpty(this.mQueuedSegments)) {
            this.mInSendingMode = true;
            this.scheduleConnectionService();
        }
    }

    return true;
};

var sConnectionMapSST = {};



var MAX_DATAGRAM_SIZE_SST=1000;
var MAX_PAYLOAD_SIZE_SST=1300;
var MAX_QUEUED_SEGMENTS_SST=300;
var CC_ALPHA_SST=0.8;

var CONNECTION_DISCONNECTED_SST = 1;      // no network connectivity for this connection.
                              // It has either never been connected or has
                              // been fully disconnected.
var CONNECTION_PENDING_CONNECT_SST = 2;   // this connection is in the process of setting
                              // up a connection. The connection setup will be
                              // complete (or fail with an error) when the
                              // application-specified callback is invoked.
var CONNECTION_PENDING_RECEIVE_CONNECT_SST = 3;// connection received an initial
                                              // channel negotiation request, but the
                                              // negotiation has not completed yet.

var CONNECTION_CONNECTED_SST=4;           // The connection is connected to a remote end
                              // point.
var CONNECTION_PENDING_DISCONNECT_SST=5;  // The connection is in the process of
                              // disconnecting from the remote end point.

var getConnectionSST = function(endPoint) {
    var endPointUid=endPoint.uid();
    return sConnectionMapSST[endPointUid];
}

/** Creates a connection for the application to a remote
 *    endpoint. The EndPoint argument specifies the location of the remote
 *    endpoint. It is templatized to enable it to refer to either IP
 *   addresses and ports, or object identifiers. The
 *   ConnectionReturnCallbackFunction returns a reference-counted, shared-
 *   pointer of the Connection that was created. The constructor may or
 *   may not actually synchronize with the remote endpoint. Instead the
 *   synchronization may be done when the first stream is created.
 * 
 *   @EndPoint A templatized argument specifying the remote end-point to
 *             which this connection is connected.
 *
 *   @ConnectionReturnCallbackFunction A callback function which will be
 *             called once the connection is created and will provide  a
 *             reference-counted, shared-pointer to the  connection.
 *             ConnectionReturnCallbackFunction should have the signature
 *             void (boost::shared_ptr<Connection>). If the boost::shared_ptr argument
 *             is NULL, the connection setup failed.
 * @param {!Kata.SST.EndPoint} localEndPoint
 * @param {!Kata.SST.EndPoint} remoteEndPoint
 * @param {!function(status, connection)} cb the connection return callback if a connection is successful
 * @returns false if it's not possible to create this connection, e.g. if another connection
 *     is already using the same local endpoint; true otherwise.
 */
var createConnectionSST = function(localEndPoint,remoteEndPoint,cb){

    var conn =  new Kata.SST.Connection(localEndPoint, remoteEndPoint, cb);
    
    conn.setState(CONNECTION_PENDING_CONNECT_SST);


    var channelid=getDatagramLayerSST(localEndPoint).getAvailableChannel();
    var payload=[
        ((channelid>>24)&255),
        ((channelid>>16)&255),
        ((channelid>>8)&255),
        channelid&255
    ];

    conn.setLocalChannelID(channelid);
    conn.sendDataWithAutoAck(payload,false/*not an ack*/);


    return true;
};

/**
 * @param cb StreamReturnCallbackFunction void(int, boost::shared_ptr< Stream<UUID> )
 * @returns whether the listening port could be bound
 */
var connectionListenSST = function(cb,listeningEndPoint) {
    var retval=listenBaseDatagramLayerSST(listeningEndPoint);
    if (!retval)return false;
    var listeningEndPointId=listeningEndPoint.uid();
    if (listeningEndPointId in sListeningConnectionsCallbackMapSST){
        Kata.error("Someone already listening at the end point "+JSON.stringify(listeningEndPoint));
        return false;
    }
    sListeningConnectionsCallbackMapSST[listeningEndPointId]=cb;
    return true;
};
    function connectionUnlistenSST(ep) {
        var id = ep.uid();
        if (id in  sListeningConnectionsCallbackMapSST) {
            delete sListeningConnectionsCallbackMapSST[id];
        }
    }

/**
 * FIXME actually allow reuse
 */
Kata.SST.Connection.prototype.getNewLSID=function(){
    return ++this.mNumStreams;
};
Kata.SST.Connection.prototype.releaseLSID=function(lsid){
    
};

/**
 * @param {!number} port 16 bit port on which to listen
 * @param {function(status,Kata.SST.Stream)} scb StreamReturnCallbackFunction == void(int, boost::shared_ptr< Stream<UUID> >)
 */
Kata.SST.Connection.prototype.listenStream=function(port,scb){
    KataTrace(this,"listenStream ",arguments);
  this.mListeningStreamsCallbackMap[port]=scb;
};
  /** Creates a stream on top of this connection. The function also queues
     up any initial data that needs to be sent on the stream. The function
     does not return a stream immediately since stream  creation might
     take some time and yet fail in the end. So the function returns without
     synchronizing with the remote host. Instead the callback function
     provides a reference-counted,  shared-pointer to the stream.
     If this connection hasn't synchronized with the remote endpoint yet,
     this function will also take care of doing that.

     @data A pointer to the initial data buffer that needs to be sent on
           this stream. Having this pointer removes the need for the
           application to enqueue data until the stream is actually
           created.
    @port The length of the data buffer.
    @StreamReturnCallbackFunction A callback function which will be
                                 called once the stream is created and
                                 the initial data queued up (or actually
                                 sent?). The function will provide a
                                 reference counted, shared pointer to the
                                 connection. StreamReturnCallbackFunction
                                 should have the signature void (int,boost::shared_ptr<Stream>).
  * @param {function(status,Kata.SST.Stream)} cb StreamReturnCallbackFunction == void(int, boost::shared_ptr< Stream<UUID> >) 
  * @param {Array} initial_data array of uint8 values of initial data
  * @param {number} local_port uint16 local port 
  * @param {number} remote_port uint16 local port 
  * @param {number} parentLSID stream identifier uint16 (undefined if created from scratch) 
  */


Kata.SST.Connection.prototype.stream=function (cb, initial_data, 
                      local_port, remote_port, parentLSID) {
    if (parentLSID===undefined){
        parentLSID=0;
    }
    var usid = Math.uuid();
    var lsid = this.getNewLSID();

    var stream = new Kata.SST.Stream(parentLSID, this, local_port, remote_port,  usid, lsid, cb);

	stream.init(initial_data, false, 0, 0);

    this.mOutgoingSubstreamMap[lsid]=stream;
    return stream;
};

var streamHeaderTypeIsAckSST = function(data){
    var stream_msg = new Sirikata.Protocol.SST.SSTStreamHeader();
    var parsed = stream_msg.ParseFromArray(data);
    return stream_msg.type==Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK;
};

  // Implicit version, used when including ack info in self-generated packet,
  // i.e. not in response to packet from other endpoint
  Kata.SST.Connection.prototype.sendDataWithAutoAck=function(data, isAck) {
      return this.sendData(data, isAck, this.mLastReceivedSequenceNumber);
  };
/**
 * Explicit version, used when acking direct response to a packet
 * @param {Array} data Array of uint8 data
 * @returns {PROTO.I64} sequence number of sent data
 */
Kata.SST.Connection.prototype.sendData=function(data, sstStreamHeaderTypeIsAck, ack_seqno){

    if (data.length > MAX_PAYLOAD_SIZE_SST){
        Kata.log("Data longer than MAX_PAYLOAD_SIZE OF "+MAX_PAYLOAD_SIZE_SST);
    }
    if (sstStreamHeaderTypeIsAck===undefined){
        Kata.log("sendData not setting whether it is an ack");
    }
    if (this.mState===CONNECTION_DISCONNECTED_SST) {
        Kata.error("Trying to send data on connection that is closed");
        return this.mTransmitSequenceNumber;
    }
    var transmitSequenceNumber =  this.mTransmitSequenceNumber;


    if ( sstStreamHeaderTypeIsAck ) {
      var sstMsg=new Sirikata.Protocol.SST.SSTChannelHeader();
      sstMsg.channel_id= this.mRemoteChannelID;
      sstMsg.transmit_sequence_number=this.mTransmitSequenceNumber;
      sstMsg.ack_count=1;
      sstMsg.ack_sequence_number=ack_seqno;

      sstMsg.payload=data;

      this.sendSSTChannelPacket(sstMsg);
    }else {
      if (KataDequeLength(this.mQueuedSegments) < MAX_QUEUED_SEGMENTS_SST) {
	      KataDequePushBack(this.mQueuedSegments,new Kata.SST.Impl.ChannelSegment(data,
                                                               this.mTransmitSequenceNumber,
                                                               ack_seqno) );
          if (KataDequeLength(this.mOutstandingSegments) <= this.mCwnd) {
              this.mInSendingMode = true;
              this.scheduleConnectionService();
          }
      }
    }    

    this.mTransmitSequenceNumber=this.mTransmitSequenceNumber.unsigned_add(PROTO.I64.ONE);

    return transmitSequenceNumber;
};

Kata.SST.Connection.prototype.setState=function(state) {
    this.mState=state;
};

/**
 * @param {number} channelID 
 */
Kata.SST.Connection.prototype.setLocalChannelID=function(channelID) {
    this.mLocalChannelID = channelID;
};

/**
 * @param {number} channelID 
 */
Kata.SST.Connection.prototype.setRemoteChannelID=function(channelID) {
    this.mRemoteChannelID = channelID;
};

/**
 * @param {PROTO.I64} receivedAckNum
 * @returns {boolean} if the item was found
 */
Kata.SST.Connection.prototype.markAcknowledgedPacket=function(receivedAckNum){
    var len=KataDequeLength(this.mOutstandingSegments);
    for (var i = 0; i < KataDequeLength(this.mOutstandingSegments); i++) {
        var segment=KataDequeIndex(this.mOutstandingSegments,i);
        if (!segment) {
            KataDequeErase(this.mOutstandingSegments,i);
            i--;
            continue;
        }
        if (segment.mChannelSequenceNumber.equals(receivedAckNum)) {
	        segment.mAckTime = Date.now();//FIXME DRH port
            if (this.mFirstRTO) {
                this.mRTOMilliseconds = (segment.mAckTime - segment.mTransmitTime);
                this.mFirstRTO=false;
            }
            else {
                this.mRTOMilliseconds = CC_ALPHA_SST * this.mRTOMilliseconds +
                    (1.0-CC_ALPHA_SST) * (segment.mAckTime - segment.mTransmitTime);
            }
            KataDequeErase(this.mOutstandingSegments,i);//FIXME expensive
            if (this.mCwnd <= this.mSSThresh) {
                
                // Slow start exponential growth, bump for every acked packet
                this.mCwnd += 1;
            }else {                
                // regular growth
                if (Math.random()*this.mCwnd<1)
                    this.mCwnd += 1;
            }
            // We freed up some space in the window. If we have
            // something left to send, trigger servicing
            if (!KataDequeEmpty(this.mQueuedSegments)) {
                this.mInSendingMode=true;               
                this.scheduleConnectionService();
            }
            return;
        }
    }
};

/**
 * @param {Sirikata.Protocol.Object.ObjectMessage} object_message the data to be received
 * DRH deleted
Kata.SST.Connection.prototype.receiveMessage=function(object_message) {
    var recv_buff = object_message.payload;
    var received_msg = new Sirikata.Protocol.SST.SSTChannelHeader;
    received_msg.ParseFromArray(recv_buff);

    this.mLastReceivedSequenceNumber = received_msg.transmit_sequence_number;

    var receivedAckNum = received_msg.ack_sequence_number;

    this.markAcknowledgedPacket(receivedAckNum);

    if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
        this.mState = CONNECTION_CONNECTED_SST;
        var originalListeningEndPoint=new Kata.SST.EndPoint(this.mRemoteEndPoint.endPoint, this.mRemoteEndPoint.port);
        
        this.setRemoteChannelID(received_msg.payload[0]*256+received_msg.payload[1]);
        
        this.mRemoteEndPoint.port = received_msg.payload[2]*256+received_msg.payload[3];
        
        this.sendData( [], false );//false means not an ack
        var localEndPointId=this.mLocalEndPoint.uid();
        var connectionCallback=sConnectionReturnCallbackMapSST[localEndPointId];
        if (connectionCallback)
        {
            delete sConnectionReturnCallbackMapSST[localEndPointId];
            connectionCallback(Kata.SST.SUCCESS, this);
        }
    }
    else if (this.mState == CONNECTION_PENDING_RECEIVE_CONNECT_SST) {
      this.mState = CONNECTION_CONNECTED_SST;
    }
    else if (this.mState == CONNECTION_CONNECTED_SST) {
        if (received_msg.payload && received_msg.payload.length > 0) {
	        this.parsePacket(received_msg, object_message.source_port, object_message.dest_port);
        }
    }

    // We always say we handled this since we were explicitly listening on this port
    return true;
};
*/

/**
 * @param{!Protcol.SST.SSTChannelHeader} received_channel_msg
 */
Kata.SST.Connection.prototype.parsePacket=function(received_channel_msg) {
    KataTrace(this,"parsePacket",arguments);
    var received_stream_msg = new Sirikata.Protocol.SST.SSTStreamHeader();
    
    var parsed = received_stream_msg.ParseFromArray(received_channel_msg.payload);
    if (!parsed) {
        return false;
    }
    // Easiest to default handled to true here since most of these are trivially
    // handled, they don't require any resources so as long as we look at them
    // we're good. DATA packets are the only ones we need to be careful
    // about. INIT and REPLY can receive data, but we should never have an issue
    // with them as they are the first data, so we'll always have buffer space
    // for them.
    var handled = true;

    if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.INIT) {
      this.handleInitPacket(received_channel_msg, received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.REPLY) {
      this.handleReplyPacket(received_channel_msg, received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATA) {
      handled = this.handleDataPacket(received_channel_msg, received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK) {
      this.handleAckPacket(received_channel_msg, received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATAGRAM) {
      this.handleDatagram(received_channel_msg, received_stream_msg);
    }
    return handled;
};
/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 * @returns {string} a textual description of the header
 */
Kata.SST.Connection.prototype.headerToStringDebug=function(received_stream_msg) {
    return this.mLocalEndPoint+"-> "+this.mRemoteEndPoint+" LSID:"+received_stream_msg.lsid;
};

/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */
Kata.SST.Connection.prototype.handleInitPacket=function (received_channel_msg, received_stream_msg) {//
    KataTrace(this,"handleInitPacket",arguments);
    var incomingLsid = received_stream_msg.lsid;
    
    if (!(incomingLsid in this.mIncomingSubstreamMap)){
        var listeningStreamsCallback=this.mListeningStreamsCallbackMap[received_stream_msg.dest_port];
      if (listeningStreamsCallback)
      {
        //create a new stream
        var usid = Math.uuid();
        var newLSID = this.getNewLSID();

        var stream = new Kata.SST.Stream (received_stream_msg.psid, this,
                                     received_stream_msg.dest_port,
                                     received_stream_msg.src_port,
                                     usid, newLSID, null);
         stream.init( [], true, incomingLsid, received_channel_msg.transmit_sequence_number);
        this.mOutgoingSubstreamMap[newLSID] = stream;
        this.mIncomingSubstreamMap[incomingLsid] = stream;

        listeningStreamsCallback(0, stream);

        stream.receiveData(received_channel_msg, received_stream_msg, received_stream_msg.payload,
                            received_stream_msg.bsn);
        stream.receiveAck(received_stream_msg, received_channel_msg.ack_sequence_number);
      }
      else {
        Kata.log("Not listening to streams at: " + this.headerToStringDebug(received_stream_msg));
      }
    }else {
        Kata.log("Init message for connected stream"+this.headerToStringDebug(received_stream_msg));
        // Re-reply to the init since we either dropped or were too slow.
        this.mIncomingSubstreamMap[incomingLsid].sendReplyPacket([], incomingLsid, received_channel_msg.transmit_sequence_number);
    }
};




/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */
Kata.SST.Connection.prototype.handleReplyPacket=function(received_channel_msg, received_stream_msg) {
    KataTrace(this,"handleReplyPacket",arguments);
    var incomingLsid = received_stream_msg.lsid;
    
    if (!this.mIncomingSubstreamMap[incomingLsid]) {
      var initiatingLSID = received_stream_msg.rsid;
      var outgoingSubstream=this.mOutgoingSubstreamMap[initiatingLSID];
      if (outgoingSubstream) {
        var stream = outgoingSubstream;
        this.mIncomingSubstreamMap[incomingLsid] = stream;
        stream.initRemoteLSID(incomingLsid);
        if (stream.mStreamReturnCallback){
          KataTrace(this,"handleReplyPacket::ReturnSuccess",arguments);
          stream.mStreamReturnCallback(Kata.SST.SUCCESS, stream);
        }
        stream.receiveData(received_channel_msg, received_stream_msg, received_stream_msg.payload,
                           received_stream_msg.bsn);
        stream.receiveAck(received_stream_msg,received_channel_msg.ack_sequence_number);          
      }
      else {
        Kata.log("Received reply packet for unknown stream\n"+this.headerToStringDebug(received_stream_msg));
      }
    }else {
        Kata.log("Received reply packet for already connected stream\n"+this.headerToStringDebug(received_stream_msg));
    }
};
/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */

Kata.SST.Connection.prototype.handleDataPacket=function(received_channel_msg, received_stream_msg) {
    var incomingLsid = received_stream_msg.lsid;
    var stream_ptr=this.mIncomingSubstreamMap[incomingLsid];
    
    if (stream_ptr) {

	    var stored = stream_ptr.receiveData(received_channel_msg, received_stream_msg,
			                                received_stream_msg.payload,
			                                received_stream_msg.bsn
			                             );
        stream_ptr.receiveAck(received_stream_msg,received_channel_msg.ack_sequence_number);
        return stored;
    }
    // Not sure what to do here if we don't have the stream -- indicate failure
    // and block progress or just allow things to progress?
    Kata.log("Handle data packet without any connection data ");
    return true;
};

/**
 * @param {!Sirikata.Protocol.SST.SSTChannelHeader} received_channel_msg
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */
Kata.SST.Connection.prototype.handleAckPacket=function(received_channel_msg,
		                                      received_stream_msg) 
{
    //printf("ACK received : offset = %d\n", (int)received_channel_msg->ack_sequence_number() );
    var incomingLsid = received_stream_msg.lsid;
    var stream_ptr=this.mIncomingSubstreamMap[incomingLsid];  
    if (stream_ptr) {
        
        stream_ptr.receiveAck( received_stream_msg,
			                   received_channel_msg.ack_sequence_number);
    }
};
/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */
Kata.SST.Connection.prototype.handleDatagram=function(received_channel_msg, received_stream_msg) {
    var msg_flags = received_stream_msg.flags;
    if (msg_flags & Sirikata.Protocol.SST.SSTStreamHeader.CONTINUES) {
        if (!(received_stream_msg.lsid in this.mPartialReadDatagrams)) {
            this.mPartialReadDatagrams[received_stream_msg.lsid]=[];
        }
        this.mPartialReadDatagrams[received_stream_msg.lsid].push(received_stream_msg.payload);
    }else {
        // Extract dispatch information
        var dest_port = received_stream_msg.dest_port;
        var datagramCallbacks=[];
        if (dest_port in this.mReadDatagramCallbacks) {
            datagramCallbacks = this.mReadDatagramCallbacks[dest_port];
        }
        var numDatagramCallbacks=datagramCallbacks.length;        
        // The datagram is all here, just deliver
        var it = this.mPartialReadDatagrams[received_stream_msg.lsid];
        if (it) {
            // Had previous partial packets
            // FIXME this should be more efficient
            var full_payload=[];
            var itlen=it.length;
            for(var ppi=0;ppi<itlen;++ppi)
              full_payload = Array.concat(full_payload ,it[ppi]);
        
            full_payload = full_payload + received_stream_msg.payload;
            delete this.mPartialReadDatagrams[it];
            for (var i=0 ; i < numDatagramCallbacks; i++) {
                datagramCallbacks[i](full_payload);
            }
          }
          else {
              // Only this part, no need to aggregate into single buffer
              for (var i=0 ; i < numDatagramCallbacks; i++) {
                  datagramCallbacks[i](received_stream_msg.payload);
              }
          }
    }
    
    // And ack

    var sstMsg=new Sirikata.Protocol.SST.SSTChannelHeader();
    sstMsg.channel_id=this.mRemoteChannelID;
    sstMsg.transmit_sequence_number=this.mTransmitSequenceNumber;
    sstMsg.ack_count=1;
    sstMsg.ack_sequence_number=received_channel_msg.transmit_sequence_number;

    this.sendSSTChannelPacket(sstMsg);

    this.mTransmitSequenceNumber=this.mTransmitSequenceNumber.unsigned_add(PROTO.I64.ONE);
};
Kata.SST.Connection.prototype.receiveMessageRaw=function(object_message) {
    var recv_buff = object_message.payload;
    var received_msg = new Sirikata.Protocol.SST.SSTChannelHeader();
    var parsed = received_msg.ParseFromArray(recv_buff);
    return parsed&&this.receiveMessage(received_msg);    
}
Kata.SST.Connection.prototype.receiveMessage=function(received_msg) {
    var ack_seqno = received_msg.transmit_sequence_number;
    this.mLastReceivedSequenceNumber = ack_seqno;

    var receivedAckNum = received_msg.ack_sequence_number;

    this.markAcknowledgedPacket(receivedAckNum);
    var handled = false;
    if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
        if (received_msg.payload.length===8) {//the initial packeg must contain only the length and channel id
            this.mState = CONNECTION_CONNECTED_SST;

      // During connection, we don't allow the initial connection request packet
      // out of the queued segments (normally once it has been sent and is in
      // the outstanding packet list, it is removed from the queue). See the
      // note in serviceConnection. Because of this, we still have it queued. To
      // avoid retransmitting it, pop it off now.
      // Sanity check that the front segment *is* the first packet (which must
      // be the initial connection request).
            if (KataDequeFront(this.mQueuedSegments).mChannelSequenceNumber.toNumber()!==1) {
                Kata.error("ASSERTION FAILED: Initial packet must belong to channel sequence number 1");
            }
	        KataDequePopFront(this.mQueuedSegments);
            var originalListeningEndPoint=new Kata.SST.EndPoint(this.mRemoteEndPoint.endPoint, this.mRemoteEndPoint.port);
            if (received_msg.payload.length>=8) {
                this.setRemoteChannelID(received_msg.payload[0]*(256*65536)+received_msg.payload[1]*65536+received_msg.payload[2]*256+received_msg.payload[3]);
                
                this.mRemoteEndPoint.port = (received_msg.payload[4]*(256*65536)+received_msg.payload[5]*65536+received_msg.payload[6]*256+received_msg.payload[7]);
            }

            this.sendData( [], false, ack_seqno );//false means not an ack
            var localEndPointId=this.mLocalEndPoint.uid();
            var connectionCallback=this.mConnectionReturnCallback;
            //Kata.log("Initial packet received "+received_msg.payload.length+ "rchan id "+this.mRemoteChannelID+" port "+this.mRemoteEndPoint.port+" cb "+connectionCallback);
            if (connectionCallback)
            {
                KataTrace(this,"Kata.SST.Connection.prototype.receiveMessage::fallbackCallback",arguments);
                this.mConnectionReturnCallback = null;
                connectionCallback(Kata.SST.SUCCESS, this);
            }
            handled=true;
        }else {
            Kata.log("FLAW AVOIDED: remaining in pending connect mode");
        }
    }
    else if (this.mState == CONNECTION_PENDING_RECEIVE_CONNECT_SST||this.mState == CONNECTION_CONNECTED_SST) {
        // Handle these two cases together because we may get reordering of the
        // initial packets (after a channel is created, usually both the final
        // connection setup packet and the first stream init are sent out right
        // away, and can get reordered). By handling together, we ensure we get
        // the stream marked as connected and handle any data which might be
        // included.

        // If we got any new packet, even if something got reordered, assume
        // we're connected

        if (this.mState == CONNECTION_PENDING_RECEIVE_CONNECT_SST) {
            this.mState = CONNECTION_CONNECTED_SST;
            handled=true;
        }
        if (received_msg.payload && received_msg.payload.length > 0) {
            
            if (received_msg.payload.length==8) {

                var a = received_msg.payload[0]*(256*65536)+received_msg.payload[1]*65536+received_msg.payload[2]*256+received_msg.payload[3];
            
                var b = (received_msg.payload[4]*(256*65536)+received_msg.payload[5]*65536+received_msg.payload[6]*256+received_msg.payload[7]);
                if (a===this.mRemoteEndPoint.port&&b===this.mRemoteChannelID) {
                    Kata.log("Initial handshake: ignore following parsing errors:");
                }else {
                    Kata.error("Strange data in packet: seems to be initial handshake item, but doesn't match");                    
                }
                try {
                    handled = true;
	                handled = this.parsePacket(received_msg);                    
                } catch (x) {
                    console.log("Nonfatal error "+x);
                }
                console.log("Ignore previous error");
            }else {
	            handled = this.parsePacket(received_msg);                
            }
        }else {
            // Need to ack still so the other side can clear out of their
            // outstanding packet list
            // FIXME this is a an ack packet and we'd leave it empty except that
            // would create an infinite ack loop between the nodes with this
            // code. Instead, fill in bogus data, which will get the ack
            // processed, get passed to the other branch above, and be unhandled
            // since it isn't parsed properly. Maybe do equivalent of
            // sendAckPacket, but make it not depend on the stream?
            this.sendData([0x58,0x58], true, ack_seqno);
            handled = true;
        }
    }
    if (handled) {
        this.mLastReceviedSequenceNumber = ack_seqno;
    }

    // We always say we handled this since we were explicitly listening on this port
    return true;
};
/**
 * @param {Kata.SST.Stream} stream the stream which to erase from the outgoing substream map
 */
Kata.SST.Connection.prototype.eraseDisconnectedStream=function(stream) {
    if (!(stream.mLSID in this.mOutgoingSubstreamMap)) {
        Kata.warn("Unable to remove stream from outgoing map "+stream.mRemoteLSID+"/"+stream.mLSID);
    }else {
        delete this.mOutgoingSubstreamMap[stream.mLSID];
    }
    if (!(stream.mRemoteLSID in this.mIncomingSubstreamMap)) {
        Kata.warn("Unable to remove stream from incoming map "+stream.mRemoteLSID+"/"+stream.mLSID);
    }else {
        delete this.mIncomingSubstreamMap[stream.mRemoteLSID];
    }
    if (mapEmpty(this.mOutgoingSubstreamMap)||mapEmpty(this.mIncomingSubstreamMap)) {
        this.close(true);
    }
};

//DRH Port stop
/**
 * FIXME: how do you get this thing called?!
 */
Kata.SST.Connection.prototype.finalize=function() {
    //printf("Connection on %s getting destroyed\n", mLocalEndPoint.endPoint.readableHexData().c_str());

    this.mDatagramLayer.dispatcher().unregisterObjectMessageRecipient(this.mLocalEndPoint.port, this);


    if (this.mState != CONNECTION_DISCONNECTED_SST) {
      // Setting mState to CONNECTION_DISCONNECTED implies close() is being
      //called from the destructor.
      this.mState = CONNECTION_DISCONNECTED_SST;
      this.close(true);


    }
};
/**
 * FIXME: is this correct shutdown procedure?
 */
var closeConnectionsSST = function() {
  sConnectionMapSST={};  
};


Kata.SST.Connection.prototype.checkIfAlive= function() {
    if (mapEmpty(this.mOutgoingSubstreamMap)&&mapEmpty(this.mIncomignSubstreamMap)) {
        this.close(true);
    }
    //it's an interval, so we don't need to reset it nicely
};
Kata.SST.Connection.prototype.cleanup= function() {
    var connState = this.mState;
    if (this.mCheckAliveTimer!==undefined) {
        clearInterval(this.mCheckAliveTimer);        
        this.mCheckAliveTimer=undefined;
    }

    connectionUnlistenSST(this.mLocalEndPoint);
    if (connState == CONNECTION_PENDING_CONNECT_SST || connState == CONNECTION_DISCONNECTED_SST) {
      //Deal with the connection not getting connected with the remote endpoint.
      //This is in contrast to the case where the connection got connected, but
      //the connection's root stream was unable to do so.

      var cb = null;
      var localEndPoint=this.mLocalEndPoint;
      var localEndPointId=localEndPoint.uid();        
      //if (localEndPointId in sConnectionReturnCallbackMapSST) {
      //cb = sConnectionReturnCallbackMapSST[localEndPointId];
      //}

      var failed_conn = this;
      if (sConnectionMapSST[localEndPointId]===this)
          delete sConnectionMapSST[localEndPointId];
      else
          Kata.log("Avoided error deleting newer SST from connection map");
        
      this.mState = CONNECTION_DISCONNECTED_SST;
      if (connState == CONNECTION_PENDING_CONNECT_SST && cb)
        cb(Kata.SST.FAILURE, failed_conn);
    }
  };
   Kata.SST.Connection.prototype.finalCleanup= function() {
      connectionUnlistenSST(this.mLocalEndPoint);
      this.mDatagramLayer.releaseChannel(this.mLocalChannelID);
       if (this.mCheckAliveTimer!==undefined) {
           clearInterval(this.mCheckAliveTimer);        
           this.mCheckAliveTimer=undefined;
       }
   };


  /** Sends the specified data buffer using best-effort datagrams on the
     underlying connection. This may be done using an ephemeral stream
     on top of the underlying connection or some other mechanism (e.g.
     datagram packets sent directly on the underlying  connection).

   *  @param {Array} data the buffer to send
   *  @param {number} local_port the source port
   *  @param {number} remote_port the destination port
   *  @param {function(errCode,buffer)} DatagramSendDoneCallback a callback of type
                                     void (int errCode, void*)
                                     which is called when queuing
                                     the datagram failed or succeeded.
                                     'errCode' contains SUCCESS or FAILURE
                                     while the 'void*' argument is a pointer
                                     to the buffer that was being sent.

   *  @return false if there's an immediate failure while enqueuing the datagram; true, otherwise.
  */
Kata.SST.Connection.prototype.datagram=function(data, local_port, remote_port,cb) {
    var currOffset = 0;

    if (this.mState == CONNECTION_DISCONNECTED_SST
     || this.mState == CONNECTION_PENDING_DISCONNECT_SST)
    {
      if (cb) {
        cb(Kata.SST.FAILURE, data);
      }
      return false;
    }

    var lsid = this.getNewLSID();
    var length=data.length;   

    while (currOffset < length) {
        // Because the header is variable size, we have to have this
        // somewhat annoying logic to ensure we come in under the
        // budget.  We start out with an extra 28 bytes as buffer.
        // Hopefully this is usually enough, and is based on the
        // current required header fields, their sizes, and overhead
        // from protocol buffers encoding.  In the worst case, we end
        // up being too large and have to iterate, working with less
        // data over time.
        var header_buffer = 28;
        while(true) {
            var buffLen;
            var continues=true;
            if (length-currOffset > (MAX_PAYLOAD_SIZE_SST-header_buffer)) {
                buffLen = MAX_PAYLOAD_SIZE_SST-header_buffer;
                continues = true;
            }
            else {
                buffLen = length-currOffset;
                continues = false;
            }

            var sstMsg=new Sirikata.Protocol.SST.SSTStreamHeader();
            sstMsg.lsid= lsid ;
            sstMsg.type=Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATAGRAM;
            var flags=0;
            if (continues) {
                flags = flags | Sirikata.Protocol.SST.SSTStreamHeader.CONTINUES;
            }
            sstMsg.flags=flags;  
            sstMsg.window=10;

            sstMsg.src_port=local_port;
            sstMsg.dest_port=remote_port;

            sstMsg.payload = data.slice(currOffset,currOffset+buffLen);

            var buffer = sstMsg.SerializeToArray();

            // If we're not within the payload size, we need to
            // increase our buffer space and try again
            if (buffer.length > MAX_PAYLOAD_SIZE_SST) {
                header_buffer += 10;
                continue;
            }

            this.sendDataWithAutoAck(  buffer, false );

            currOffset += buffLen;
            // If we got to the send, we can break out of the loop
            break;
        }
    }

    if (cb) {
      //invoke the callback function
      cb(Kata.SST.SUCCESS, data);
    }
    return true;
  };

  /**
    Register a callback which will be called when there is a datagram
    available to be read.

  *  @param {number} port the local port on which to listen for datagrams.
  *  @param {function(datagramBuffer)} ReadDatagramCallback a function of type "void (uint8*, int)"
           which will be called when a datagram is available. The
           "uint8*" field will be filled up with the received datagram,
           while the 'int' field will contain its size.
  *  @return true if the callback was successfully registered.
  */
Kata.SST.Connection.prototype.registerReadDatagramCallback=function(port, cb) {
    if (!(port in this.mReadDatagramCallbacks)) {
      this.mReadDatagramCallbacks[port] = [];
    }

    this.mReadDatagramCallbacks[port].push(cb);

    return true;
  };

  /**
    Register a callback which will be called when there is a new
    datagram available to be read. In other words, datagrams we have
    seen previously will not trigger this callback.

    @param ReadDatagramCallback a function of type "void (uint8*, int)"
           which will be called when a datagram is available. The
           "uint8*" field will be filled up with the received datagram,
           while the 'int' field will contain its size.
    @return true if the callback was successfully registered.
  */
Kata.SST.Connection.prototype.registerReadOrderedDatagramCallback=function( cb )  {
    throw "UNIMPLEMENTED"
    //return false;
};

  /**  Closes the connection.

    *  @param {boolean} force if true, the connection is closed forcibly and
             immediately. Otherwise, the connection is closed
             gracefully and all outstanding packets are sent and
             acknowledged. Note that even in the latter case,
             the function returns without synchronizing with the
             remote end point.
  */
Kata.SST.Connection.prototype.close=function( force) {
    /* (this.mState != CONNECTION_DISCONNECTED_SST) implies close() wasnt called
       through the destructor. */
    if (force && this.mState != CONNECTION_DISCONNECTED_SST) {//FIXME DRH: do we need to compare force here
      var localEndPointId = this.mLocalEndPoint.uid();
      if (sConnectionMapSST[localEndPointId]===this) {
          delete sConnectionMapSST[localEndPointId];          
      } else {
          Kata.log("Avoided error deleting nonmatching connection map") ;
      }
          
    }

    if (force) {
      this.mState = CONNECTION_DISCONNECTED_SST;
    }
    else  {
      this.mState = CONNECTION_PENDING_DISCONNECT_SST;
    }
  };

/**
 *  @param {!Kata.SST.EndPoint} remoteEndPoint
 *  @param {!Kata.SST.EndPoint} localEndPoint 
 *  @param {!Array} recvBuffer
 */
var connectionHandleReceiveSST = function(datagramLayer, remoteEndPoint,localEndPoint,recvBuffer){

    var localEndPointId=localEndPoint.uid();
    // Active connection
    var whichLocalConnection = sConnectionMapSST[localEndPointId];
    // or listening for one
    var listeningConnection = sListeningConnectionsCallbackMapSST[localEndPointId];

    if (!whichLocalConnection && !listeningConnection) {
        Kata.log("whichLocal and listening are both null for "+localEndPointId);
        return false;
    }

    var received_msg = new Sirikata.Protocol.SST.SSTChannelHeader();
    var parsed = received_msg.ParseFromArray(recvBuffer);

    var channelID = received_msg.channel_id;

    if (whichLocalConnection) {
      if (channelID == 0) {
              /*Someone's already connected at this port. Either don't reply or
               send back a request rejected message. */
          
              Kata.log("Someone's already connected at this port on object " 
                   + localEndPoint.endPoint.uid());
              return true;
      }
      
      whichLocalConnection.receiveParsedMessage(parsed);
    }
    else if (channelID == 0) {
      /* it's a new channel request negotiation protocol
         packet ; allocate a new channel.*/
        if (listeningConnection) {
            var received_payload = received_msg.payload;

            var availableChannel=datagramLayer.getAvailableChannel();
            var availablePort=datagramLayer.getAvailablePort();

            var newLocalEndPoint=new Kata.SST.EndPoint(localEndPoint.endPoint, 
                                              availablePort);
            var conn = new Kata.SST.Connection(newLocalEndPoint, remoteEndPoint);

                conn.listenStream(newLocalEndPoint.port,
                              sListeningConnectionsCallbackMapSST[localEndPoint]);
            sConnectionMapSST[newLocalEndPoint.uid()] = conn;

            conn.setLocalChannelID(availableChannel);
            conn.setRemoteChannelID(received_payload[0]*(65536*256)+65536*received_payload[1]+256*received_payload[2]+received_payload[3]);
            conn.setState(CONNECTION_PENDING_RECEIVE_CONNECT_SST);
            
            conn.sendData([
                              (availableChannel>>24)&255,
                              (availableChannel>>16)&255,
                              (availableChannel>>8)&255,
                              availableChannel&255,
                              (availablePort>>24)&255,
                              (availablePort>>16)&255,
                              (availablePort>>8)&255,
                              availablePort&255
                          ],
                          false/*not an ack*/,received_msg.transmit_sequence_number);
      }
      else {
        Kata.log("Got non-init message on port we're listening on: "+localEndPointId);
      }
    }
    return true;
};

var StreamBuffer = function(data, offset) {
    /**
     * @type {Date} 
     */
    this.mTransmitTime=null;
    /**
     * @type {Date} 
     */
    this.mAckTime=null;
    /**
     * @type {Array} uint8 data array
     */
    this.mBuffer=data;
    
    /**
     * @type {number} Length
     */
    this.mOffset=offset;
};

var MAX_PAYLOAD_SIZE_STREAM_SST=1000;
var MAX_QUEUE_LENGTH_STREAM_SST=4000000;
var MAX_RECEIVE_WINDOW_STREAM_SST=10000;
var FL_ALPHA_STREAM_SST=0.8;
var INV_FL_ALPHA_STREAM_SST=1.0-FL_ALPHA_STREAM_SST;
var MAX_INIT_RETRANSMISSIONS_STREAM_SST=5;
var DISCONNECTED_STREAM_SST = 1;
var CONNECTED_STREAM_SST=2;
var PENDING_DISCONNECT_STREAM_SST=3;
var PENDING_CONNECT_STREAM_SST=4;
var NOT_FINISHED_CONSTRUCTING_CALL_INIT=5;
var sStreamReturnCallbackMapSST={};

/**
 * @param {!Kata.SST.EndPoint} localEndPoint
 * @param {!Kata.SST.EndPoint} remoteEndPoint
 * @param {function(status,Kata.SST.Stream)} cb StreamReturnCallbackFunction ==  void(int, boost::shared_ptr< Stream<UUID> >)
 * @returns bool whether the stream can connect
 */
Kata.SST.connectStream = function(localEndPoint,remoteEndPoint,cb) {
    var localEndPointId=localEndPoint.uid();
    if (sStreamReturnCallbackMapSST[localEndPointId]) {
        return false;
    }
    sStreamReturnCallbackMapSST[localEndPointId]=cb;
    
    return createConnectionSST(localEndPoint,remoteEndPoint,connectionCreatedStreamSST);
};


  /**
    Start listening for top-level streams on the specified end-point. When
    a new top-level stream connects at the given endpoint, the specified
    callback function is invoked handing the object a top-level stream.
    @param cb the callback function invoked when a new stream is created
    @param {Kata.SST.EndPoint} listeningEndPoint the endpoint where SST will accept new incoming
           streams.
    @return false, if its not possible to listen to this endpoint (e.g. if listen
            has already been called on this endpoint); true otherwise.
  */
Kata.SST.listenStream = function(cb, listeningEndPoint) {
    return connectionListenSST(cb, listeningEndPoint);
};


/**
 * @param {number} parentLSID
 * @param {!Kata.SST.Connection} conn
 * @param {number} local_port
 * @param {number} remote_port
 * @param {string} usid 
 * @param {number} lsid
 * @param {Array} initial_data
 * @param {boolean} remotelyInitiated
 * @param {number} remoteLSID
 * @param {function(number,Kata.SST.Stream)} cb StreamReturnCallbackFunction ==  void(int, boost::shared_ptr< Stream<UUID> >)
 */
//		 remotelyInitiated, remoteLSID, 
Kata.SST.Stream = function(parentLSID, conn,
		 local_port, remote_port,
		 usid, lsid, cb){
    KataTrace(this,"Kata.SST.Stream(constructor)",arguments);
    /**
     * @type {number} state from CONNECTION_*_STREAM_SST enum
     */
    this.mState = NOT_FINISHED_CONSTRUCTING_CALL_INIT;
    
    /**
     * @type {number} uint16 port
     */
    this.mLocalPort=local_port;
    /**
     * @type {number} uint16 port
     */
    this.mRemotePort = remote_port;
    /**
     * @type {number} lower stream uint16 id for parent stream
     */
    this.mParentLSID=parentLSID;
    /**
     * @type {Kata.SST.Connection}
     */
    this.mConnection=conn;
    /**
     * @type {string} UUID for the stream
     */
    this.mUSID=usid;
    /**
     * @type {number} uint16 
     */
    this.mLSID=lsid;
    /**
     * @type {number} uint16 
     */
    this.mRemoteLSID=-1;
    /**
     * @type{bool}
     */
    this.mFirstRTO = true;
    /**
     * @type {number} milliseconds 
     */
    this.mStreamRTOMilliseconds=2000; // Intentionally > 1 second. Do not change.
    /**
     * @type {number}
     */
    this.mTransmitWindowSize=MAX_RECEIVE_WINDOW_STREAM_SST;
    /**
     * @type {number}
     */
    this.mReceiveWindowSize=MAX_RECEIVE_WINDOW_STREAM_SST;
    /**
     * @type {number}
     */
    this.mNumOutstandingBytes=0;
    /**
     * @type {number}
     */
    this.mNextByteExpected=PROTO.I64.ZERO;
    /**
     * @type {number}
     */
    this.mLastContiguousByteReceived=PROTO.I64.fromNumber(-1);
    /**
     * @type {Date}
     */
    this.mLastSendTime=null;
    /**
     * @type {Date}
     */
    this.mLastReceiveTime=null;
    /**
     * @type {function(status,Kata.SST.Stream)} for new streams arriving at this port
     */
    this.mStreamReturnCallback=cb;
    /**
     * @type {boolean} FIXME: not sure why this replicated data from mState
     */
    this.mConnected=false;
    this.mKeepAliveCallback = Kata.bind(this.sendKeepAlive,this);
    this.mKeepAliveTimer = null;
    this.mServiceTimer = null;
    this.mServiceTimerExpiresTime=0;
    this.mServiceStreamNoReturn = Kata.bind(this.serviceStream,this);
    this.mIsAsyncServicing=false;
    this.mInitialData = [];

/**
 * @type {Array} of uint8
 */
    this.mReceiveBuffer=[];
/**
 * @type {!KataDeque} deque of StreamBuffer data that is queued
 */
    this.mQueuedBuffers=new Kata.Deque();

    /**
     * @type {Hash} FIXME maps int64 to buffer.... need to carefully consider int64
     */
    this.mWaitingForAcks={};
    this.mUnackedGraveyard={};
    /**
     * @type {Kata.ReceivedSegmentList} keeps track of which segments have been recevied and can be acked and which ranges are ready for the app to view
     */
    this.mReceivedSegments = new Kata.ReceivedSegmentList();
/**
 * @type {number} size of the StreamBuffer deque in bytes
 */
    this.mCurrentQueueLength=0;
/*
    if (remotelyInitiated){
        this.sendReplyPacket(this.mInitialData,remoteLSID);
    }else {
        this.sendInitPacket(this.mInitialData);
    }
*/
/**
 * @type {number} number of retransmissions of initial data
 */
    this.mNumInitRetransmissions =1;
    this.mNumBytesSent=PROTO.I64.fromNumber(0);
/*
    if (initial_data.length>this.mInitialData.length){
        this.write(initial_data.slice(this.mInitialData.length,initial_data.length));
    }
*/
};
Kata.SST.Stream.prototype.initRemoteLSID=function(remoteLSID) {
    this.mRemoteLSID = remoteLSID;
};

/**
 * @param {!Array} initial_data
 * @param {boolean} remotelyInitiated
 * @param {number} remoteLSID 
 * @param {PROTO.I64?} ack_seqno (only reqired when stream remotely initiaed)
 */
Kata.SST.Stream.prototype.init=function(initial_data,remotelyInitiated, remoteLSID, ack_seqno) {
    this.mNumInitRetransmissions = 1;
    if (remotelyInitiated) {
        this.mRemoteLSID = remoteLSID;
        this.mConnected = true;
        this.mState = CONNECTED_STREAM_SST;        
    }else {
        this.mConnected=false;
        this.mState = PENDING_CONNECT_STREAM_SST;                
    }
    var remainingData=null;
    if (initial_data.length<=MAX_PAYLOAD_SIZE_SST) {
        this.mInitialData = initial_data.slice(0);        
    }else {
        this.mInitialData = initial_data.slice(0,MAX_PAYLOAD_SIZE_SST);                
        remainingData = initial_data.slice(MAX_PAYLOAD_SIZE_SST);
    }
    var numBytesBuffered = this.mInitialData.length;
    if (remotelyInitiated) {
        this.sendReplyPacket(this.mInitialData,remoteLSID,ack_seqno);
    }else {
        this.sendInitPacket(this.mInitialData);
    }
    this.mBytesSent = this.mInitialData.length;
    if (remainingData!==null) {
        var writeval = this.write(remainingData);
        numBytesBuffered+=writeval;
    }
    this.mKeepAliveTimer = setTimeout(this.mKeepAliveCallback,60000);
    return numBytesBuffered;
};

Kata.SST.Stream.prototype.finalize=function() {
    this.close(true);
};

/** Simple wrapper to send a datagram on this stream's underlying connection. */
Kata.SST.Stream.prototype.datagram = function(data, local_port, remote_port,cb) {
    return this.mConnection.datagram(data, local_port, remote_port, cb);
};

  /**
    Start listening for child streams on the specified port. A remote stream
    can only create child streams under this stream if this stream is listening
    on the port specified for the child stream.
    @param {function(status,Kata.SST.Stream)} scb the callback function invoked when a new stream is created
    @param {number} port the endpoint where SST will accept new incoming
           streams.
  */
Kata.SST.Stream.prototype.listenSubstream=function(port, scb) {
    this.mConnection.listenStream(port, scb);
};




  /** Writes data bytes to the stream. If not all bytes can be transmitted
     immediately, they are queued locally until ready to transmit.
     @param {Array} data the buffer containing the bytes to be written
     @return the number of bytes written or enqueued, or -1 if an error
             occurred
  */
Kata.SST.Stream.prototype.write=function(data) {
    if (this.mState == DISCONNECTED_STREAM_SST || this.mState == PENDING_DISCONNECT_STREAM_SST) {
      return -1;
    }
    var len = data.length;

    var count = 0;
    // We only need to schedule servicing when the packet queue
    // goes from empty to non-empty since we should already be working
    // on sending data if it wasn't
    var was_empty = KataDequeEmpty(this.mQueuedBuffers);


    if (len <= MAX_PAYLOAD_SIZE_STREAM_SST) {
        if (this.mCurrentQueueLength+len > MAX_QUEUE_LENGTH_STREAM_SST) {
            return 0;
        }
        KataDequePushBack(this.mQueuedBuffers,new StreamBuffer(data, this.mNumBytesSent));
        this.mCurrentQueueLength += len;
        this.mNumBytesSent = this.mNumBytesSent.unsigned_add(PROTO.I64.fromNumber(len));
        if (was_empty) {
            this.scheduleStreamService();
        }
        
        return len;
    }
    else {
      var currOffset = 0;
      while (currOffset < len) {
        var buffLen = (len-currOffset > MAX_PAYLOAD_SIZE_STREAM_SST) ?
                      MAX_PAYLOAD_SIZE_STREAM_SST :
                      (len-currOffset);

        if (this.mCurrentQueueLength + buffLen > MAX_QUEUE_LENGTH_STREAM_SST) {
          break;
        }

        KataDequePushBack(this.mQueuedBuffers.push_back,new StreamBuffer(data.slice(currOffset, currOffset+buffLen), this.mNumBytesSent));
        currOffset += buffLen;
        this.mCurrentQueueLength += buffLen;
        this.mNumBytesSent = this.mNumBytesSent.unsigned_add(PROTO.I64.fromNumber(buffLen));

        count++;
      }
      if (was_empty && currOffset > 0)
          this.scheduleStreamService();

      return currOffset;
    }
};

Kata.SST.Stream.prototype.sendKeepAlive=function() {
    if (this.mState == DISCONNECTED_STREAM_SST || this.mState == PENDING_DISCONNECT_STREAM_SST) {
      close(true);
      return;
    }

    var buf=[];

    this.write(buf);

    this.mKeepAliveTimer=setTimeout(this.mKeepAliveCallback,60000);//60 second timeout
  };

  /**
    Register a callback which will be called when there are bytes to be
    read from the stream.

    @param ReadCallback a function of type "void (uint8*, int)" which will
           be called when data is available. The "uint8*" field will be filled
           up with the received data, while the 'int' field will contain
           the size of the data.
    @return true if the callback was successfully registered.
  */
  Kata.SST.Stream.prototype.registerReadCallback=function( ReadCallback) {
    this.mReadCallback = ReadCallback;

    this.sendToApp(0);

    return true;
  };

  /* Close this stream. If the 'force' parameter is 'false',
     all outstanding data is sent and acknowledged before the stream is closed.
     Otherwise, the stream is closed immediately and outstanding data may be lost.
     Note that in the former case, the function will still return immediately, changing
     the state of the connection PENDING_DISCONNECT without necessarily talking to the
     remote endpoint.
     @param force use false if the stream should be gracefully closed, true otherwise.
     @return  true if the stream was successfully closed.

  */
Kata.SST.Stream.prototype.close=function(force) {
    if (this.mKeepAliveTimer!==undefined) {
        clearTimeout(this.mKeepAliveTimer);
        this.mKeepAliveTimer=undefined;
    }

    if (force) {
        this.mConnected = false;
        if (this.mConnection)
            this.mConnection.eraseDisconnectedStream(this);
        this.mState = DISCONNECTED_STREAM_SST;
        AAdisconnectedBCount.push(this);
        return true;
    }
    else if (this.mState!=DISCONNECTED_STREAM_SST) {
        AApendingDisconnectedBCount.push(this);
        this.mState = PENDING_DISCONNECT_STREAM_SST;
        this.scheduleStreamService();

        return true;
    }else return false;
};

  /**
    Sets the priority of this stream.
    As in the original SST interface, this implementation gives strict preference to
    streams with higher priority over streams with lower priority, but it divides
    available transmit bandwidth evenly among streams with the same priority level.
    All streams have a default priority level of zero.
    @param the new priority level of the stream.
  */
 Kata.SST.Stream.prototype.setPriority=function(pri) {

 };

  /**Returns the stream's current priority level.
    @return the stream's current priority level
  */
Kata.SST.Stream.prototype.priority=function() {
    return 0;
}

  /** Returns the top-level connection that created this stream.
     @return a pointer to the connection that created this stream.
  */
Kata.SST.Stream.prototype.connection=function() {
    return this.mConnection;
};

  /** Creates a child stream. The function also queues up
     any initial data that needs to be sent on the child stream. The function does not
     return a stream immediately since stream creation might take some time and
     yet fail in the end. So the function returns without synchronizing with the
     remote host. Instead the callback function provides a reference-counted,
     shared-pointer to the stream. If this connection hasn't synchronized with
     the remote endpoint yet, this function will also take care of doing that.

     @param {Array} data A pointer to the initial data buffer that needs to be sent on this stream.
         Having this pointer removes the need for the application to enqueue data
         until the stream is actually created.
     @param {number} port The length of the data buffer.
     @param local_port the local port to which the child stream will be bound.
     @param remote_port the remote port to which the child stream should connect.
     @param cb StreamReturnCallbackFunction A callback function which will be called once the
                                  stream is created and the initial data queued up
                                  (or actually sent?). The function will provide  a
                                  reference counted, shared pointer to the  connection.
  */
Kata.SST.Stream.prototype.createChildStream=function (cb, data,local_port,remote_port)
  {
    this.mConnection.stream(cb, data, local_port, remote_port, this.mParentLSID);
  };

  /**
    Returns the local endpoint to which this connection is bound.

    @return the local endpoint.
  */
Kata.SST.Stream.prototype.localEndPoint=function()  {
    return new Kata.SST.EndPoint(this.mConnection.localEndPoint().endPoint, this.mLocalPort);
};

  /**
    Returns the remote endpoint to which this connection is bound.

    @return the remote endpoint.
  */
Kata.SST.Stream.prototype.remoteEndPoint=function()  {
    return new Kata.SST.EndPoint(this.mConnection.remoteEndPoint().endPoint, this.mRemotePort);
};

////Private Functions
/**
 * @param {number} errCode
 * @param {!Kata.SST.Connection} c
 */
var connectionCreatedStreamSST = function( errCode, c) {
    KataTrace(this,"connectionCreatedStreamSST",arguments);
    //boost::mutex::scoped_lock lock(mStreamCreationMutex.getMutex());
    var localEndPoint=c.mLocalEndPoint;
    var localEndPointId=localEndPoint.uid();
    var cb = sStreamReturnCallbackMapSST[localEndPointId];
    delete sStreamReturnCallbackMapSST[localEndPointId];

    if(!cb){
      Kata.error("Callback not defined for connectionCreatedStreamSST, "+localEndPointId);
    }
    if (errCode != Kata.SST.SUCCESS) {

      cb(Kata.SST.FAILURE, null );
      return;
    }
    //Empty array? the original code has some sort of pointless loop on 1505 that makes an array of size 0
    c.stream(cb, new Array(), localEndPoint.port, c.mRemoteEndPoint.port);
};

Kata.SST.Stream.prototype.scheduleStreamService=function (after) {
    if (!after) after=0;
    if (this.mState===DISCONNECTED_STREAM_SST||this.mConnection.mState===CONNECTION_DISCONNECTED_SST) {
        Kata.error("Attempted to schedule stream service that was already disconnected");        
        if (this.mState!==DISCONNECTED_STREAM_SST)
            this.close(true);
        return;
    }

    var needs_scheduling = false;
    var nowPlusAfter = Date.now()+after;
    if (this.mServiceTimer===null) {
        needs_scheduling=true;
    }else if(this.mServiceTimer!==null && this.mServiceTimerExpiresTime > nowPlusAfter) {
        needs_scheduling = true;
        // No need to check success because we're using a strand and we can
        // only get here if timer->expiresFromNow() is positive.
        clearTimeout(this.mServiceTimer);
        this.mServiceTimer = null;    
    }

    if (needs_scheduling) {
        setTimeout(this.mServiceStreamNoReturn,after);
        this.mServiceTimerExpiresTime = nowPlusAfter;
    }
};

/**
 * @param {Date} curTime 
 * @return false only if this is the root stream of a connection and it was
 *  unable to connect. In that case, the connection for this stream needs to
 *  be closed and the 'false' return value is an indication of this for
 *  the underlying connection.
 */
Kata.SST.Stream.prototype.serviceStream=function() {
    var baseCb = null;
    var conn = this.mConnection;
    
    var curTime= Date.now();
     if ((curTime - this.mLastReceiveTime)>SECONDS_TO_TIMEOUT_SST*1000 && this.mLastReceiveTime!==null) {
         this.close(true);
         return true;
     }
     if (this.mState == DISCONNECTED_STREAM_SST) {
         return true;
     }
    //console.log(curTime+" Servicing Stream"+this.mConnection.mLocalEndPoint.uid());
    if (this.mState != CONNECTED_STREAM_SST && this.mState != PENDING_DISCONNECT_STREAM_SST) {

      if (!this.mConnected && this.mNumInitRetransmissions < MAX_INIT_RETRANSMISSIONS_STREAM_SST ) {
/*
        if ( this.mLastSendTime && (curTime.getTime() - this.mLastSendTime.getTime()) < 2*this.mStreamRTOMilliseconds) {
          return true;
        }
*/
        this.sendInitPacket(this.mInitialData);

        this.mLastSendTime = curTime;

        this.mNumInitRetransmissions++;
//p     this.mStreamRTOMilliseconds = (this.mStreamRTOMilliseconds * 2);
        return true;
      }

      this.mInitialDataLength = 0;

      if (!this.mConnected) {
        var retVal=true;
        // If this is the root stream that failed to connect, close the
        // connection associated with it as well.
        var localUid = this.mConnection.mLocalEndPoint.uid();
        baseCb = sStreamReturnCallbackMapSST[localUid];
        delete sStreamReturnCallbackMapSST[localUid];

        if (this.mParentLSID == 0) {
            conn.close(true);
            retVal=false;
        }

        //send back an error to the app by calling mStreamReturnCallback
        //with an error code.
        if (this.mStreamReturnCallback) {
          KataTrace(this,"Kata.SST.Stream.serviceStream::Failure",arguments);
          this.mStreamReturnCallback(Kata.SST.FAILURE, null );              
        }
        this.mStreamReturnCallback=null;
          AAdisconnectedCCount.push(this);
        if (baseCb) {
            baseCb(Kata.SST.FAILURE,null);
        }
        conn.eraseDisconnectedStream(this);
        this.mState=DISCONNECTED_STREAM_SST;

        if (!retVal) {
            setTimeout(Kata.bind(this.mConnection.cleanup,this.mConnection),0);
        }
        return false;
      }
      else {
          AAconnectedACount.push(this);
          this.mState = CONNECTED_STREAM_SST;
          // Schedule another servicing immediately in case any other operations
          // should occur, e.g. sending data which was added after the initial
          // connection request.
          this.scheduleStreamService();
      }
    }
    else {

        //if the stream has been waiting for an ACK for > 2*mStreamRTOMicroseconds,
        //resend the unacked packets. We don't actually check if we
        //have anything to ack here, that happens in resendUnackedPackets. Also,
        //'resending' really just means sticking them back at the front of
        //mQueuedBuffers, so the code that follows and actually sends data will
        //ensure that we trigger a re-servicing sometime in the future.

        if ( this.mLastSendTime!==null
             && (curTime - this.mLastSendTime) > 2*this.mStreamRTOMilliseconds)
        {
          this.resendUnackedPackets();
          this.mLastSendTime = curTime;
        }
        if (this.mState == PENDING_DISCONNECT_STREAM_SST &&
            KataDequeEmpty(this.mQueuedBuffers)  &&
            mapEmpty(this.mWaitingForAcks) )
        {
            this.mState = DISCONNECTED_STREAM_SST;
            AAdisconnectedACount.push(this);
            this.mConnection.eraseDisconnectedStream(this);
            return true;
        }
        var sentSomething = false;
        while ( !KataDequeEmpty(this.mQueuedBuffers) ) {
          var buffer = KataDequeFront(this.mQueuedBuffers);
          // If we managed to get an ack late, then we will not have
          // been able to remove the actual buffer that got requeued
          // for a retry (if it hadn't been processed again). However,
          // we only ever mark the ack time when we've actually seen
          // it acked, so we can use that to check if we really still
          // need to send it.
          if (buffer.mAckTime!==null) {
              KataDequePopFront(mQueuedBuffers);
              this.mCurrentQueueLength -= buffer.mBuffer.length;
              continue;
          }
          if (this.mTransmitWindowSize < buffer.mBuffer.length) {
            break;
          }

          var channelID = this.sendDataPacket(buffer.mBuffer,
                                         buffer.mOffset);

          buffer.mTransmitTime = curTime;
          sentSomething = true;


          // On the first send (or during a resend where we get a new
          // channel ID) we only mark this as waiting for an ack using
          // the specified channel segment ID.
          var key=channelID.hash();

          if (key in this.mWaitingForAcks)    {
              Kata.error("Assertion failed mWaitingForAcks.find(channelID) == mWaitingForAcks.end() for channelID="+channelId);
          }
          if ( !this.mWaitingForAcks[key]) {
              this.mWaitingForAcks[key] = buffer;
          }

          KataDequePopFront(this.mQueuedBuffers);
          this.mCurrentQueueLength -= buffer.mBuffer.length;
          this.mLastSendTime = curTime;

          if(buffer.mBuffer.length > this.mTransmitWindowSize){
              Kata.error("Failure: buffer length "+buffer.mBuffer.length+"is greater than trasmitwindow size"+this.mTransmitWindowSize);
          }
          this.mTransmitWindowSize -= buffer.mBuffer.length;
          this.mNumOutstandingBytes += buffer.mBuffer.length;
        }
        if (sentSomething||!KataDequeEmpty(this.mQueuedBuffers)) {
            if((2*this.mStreamRTOMilliseconds) < (curTime - this.mLastSendTime)) {
                Kata.error("Assertion failed: Duration::microseconds(2*mStreamRTOMicroseconds) >= (curTime - mLastSendTime) "+(2*this.mStreamRTOMilliseconds)+"<"+(curTime+"-"+this.mLastSendTime));
            }
            var timeout = this.mStreamRTOMilliseconds*2 - (curTime-this.mLastSendTime);
            this.scheduleStreamService(timeout);
        }
    }

    return true;
  };

Kata.SST.Stream.prototype.resendUnackedPackets=function() {

    function mapEmpty(m) {
        for (var i in m) {
            return false;
        }
        return true;
    }
    for(var it in this.mWaitingForAcks)
    {
        var buffer=this.mWaitingForAcks[it];
        var bufferLength=buffer.mBuffer.length;
        KataDequePushFront(this.mQueuedBuffers,buffer);
        this.mCurrentQueueLength += bufferLength;
        this.mUnackedGraveyard[it]=buffer;
        //printf("On %d, resending unacked packet at offset %d:%d\n", (int)mLSID, (int)it->first, (int)(it->second->mOffset));

        if (this.mTransmitWindowSize < bufferLength){
          if (bufferLength <= 0){
              Kata.log("Assertion failed: channelbuffer must have size >0");
          }

        }
     }
     this.mTransmitWindowSize += this.mNumOutstandingBytes;
     //FIXME:2013 is this ncessary? this.scheduleStreamService();

    // And make sure we'll be able to ship the first buffer
    // immediately.
     if ( !KataDequeEmpty(this.mQueuedBuffers)) {
         var buffer = KataDequeFront(this.mQueuedBuffers);
         var bufferLength=buffer.mBuffer.length;
         if (this.mTransmitWindowSize < bufferLength) {
             this.mTransmitWindowSize = bufferLength;
         }
     }

     this.mNumOutstandingBytes = 0;

    // If we're failing to get acks, we might be estimating the RTT
    // too low. To make sure it eventually updates, increase it.
     var waitingForAcksEmpty=mapEmpty(this.mWaitingForAcks);

    if (!waitingForAcksEmpty) {
        if (this.mStreamRTOMilliseconds < 2000) {//FIXME should this be a constant
            this.mStreamRTOMilliseconds *= 2;
        }        
        // Also clear out the list of buffers waiting for acks since
        // they've timed out. They've been saved to the graveyard in
        // case we eventually get an ack back.
        this.mWaitingForAcks={};
     }
  };

  /** This function sends received data up to the application interface.
     mReceiveBufferMutex must be locked before calling this function. 
   @param {number} skipLength
 */
Kata.SST.Stream.prototype.sendToApp=function(skipLength) {
    // Make sure we bail if we can't perform the callback since
    // checking the ready range will clear that range from the
    // segment list.
    if (!this.mReadCallback) {
        return;
    }
    var nextReadyRange = this.mReceivedSegments.readyRange(this.mNextByteExpected, skipLength);
    
    var readyBufferSize64 = Kata.ReceivedSegmentListLength(nextReadyRange);
    var readyBufferSize = readyBufferSize64.toNumber();
    if (readyBufferSize==0) return;
    var recv_buf = this.mReceiveBuffer;
    this.mReadCallback(recv_buf.slice(0,readyBufferSize));
    //now move the window forward...
    this.mLastContiguousByteReceived = this.mLastContiguousByteReceived.add(readyBufferSize64);
    this.mNextByteExpected = this.mLastContiguousByteReceived.unsigned_add(PROTO.I64.ONE);

    var movlen = MAX_RECEIVE_WINDOW_STREAM_SST - readyBufferSize;
    for (var i=0;i<movlen;++i)     {
        recv_buf[i] = recv_buf[i+readyBufferSize];
    }
    this.mReceiveBuffer.length = movlen;//FIXME 2013 IS THIS NECESSARY

    this.mReceiveWindowSize  += readyBufferSize;

  };

/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} streamMsg
 * @param {Array} buffer
 * @param {!PROTO.I64} offset
 */
Kata.SST.Stream.prototype.receiveData=function(received_channel_msg, streamMsg,
                    buffer, offset )
  {
    var len=buffer.length;

    var curTime = Date.now();
    this.mLastReceiveTime = curTime;
    if (streamMsg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.REPLY) {
      this.mConnected = true;
      return true;//FIXME: is this correct to return here
    }else {// INIT or DATA
//p    else if (streamMsg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK) {
//p      var offsetHash=offset.hash();
//p      var channelBuffer=this.mChannelToBufferMap[offsetHash];
//p      if (channelBuffer) {
//p        var dataOffset = channelBuffer.mOffset;
//p        this.mNumOutstandingBytes -= channelBuffer.mBuffer.length;
//p
//p        channelBuffer.mAckTime = Date.now();
//p
//p        this.updateRTO(channelBuffer.mTransmitTime, channelBuffer.mAckTime);
//p
//p        if ( Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes >= 0.5 ) {
//p          this.mTransmitWindowSize = Math.round(Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes);
//p        }
//p        else {
//p          this.mTransmitWindowSize = 0;
//p        }
//p
//p        //printf("REMOVED ack packet at offset %d\n", (int)mChannelToBufferMap[offset]->mOffset);
//p
//p        delete this.mChannelToBufferMap[offsetHash];
//p          /*
//p           * @type {Array} uint64 values stored
//p           */
//p        var channelOffsets=[];
//p        for(var it in this.mChannelToBufferMap)
//p        {
//p          if (this.mChannelToBufferMap[it].mOffset == dataOffset) {
//p            channelOffsets.push(it);
//p          }
//p        }
//p
//p        for (var i=0; i< channelOffsets.length; i++) {
//p          delete this.mChannelToBufferMap[channelOffsets[i]];
//p        }
//p      }else {
//p          Kata.log("unknown packet corresponding to offset "+offsetHash+" not found in map");
//p      }
//p    }
       if (streamMsg.type != Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATA && streamMsg.type != Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.INIT) {
           Kata.error("assert failed in SSTImpl.hpp::receiveData: a stream   Message must be either a REPLY an INIT or DATA");
           return false;
       }
      var transmitWindowSize = Math.round(Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes);
      if (transmitWindowSize >= 0) {
         this.mTransmitWindowSize = transmitWindowSize;          
      }else {
         this.mTransmitWindowSize = 0;          
      }
/*** XXX THIS IS NO LONGER NEEDED (!)
      if (this.mTransmitWindowSize > 0 && !KataDequeEmpty(this.mQueuedBuffers))
          this.scheduleStreamService;
***/
      var ack_seqno = received_channel_msg.transmit_sequence_number;

      var offset64 = offset;
      // We can get data after we've already received it and moved our window
      // past it (e.g. retries), so we have to handle this carefully. A simple
      // case is if we've already moved past this entire packet.
      if (!this.mNextByteExpected.less(offset64.add(PROTO.I64.fromNumber(buffer.length)))) {//doing lequal by comparing less and subtracing 1 from the left side
          // We can't actually ignore these. We keep sending notices of the most
          // recent used data. However, we don't use cumulative acks right now
          // (we have no way to distinguish in the protocol),
          // which means we could ack a few packets, and the first ack could get
          // lost. The other side would never know it had been received and keep
          // trying to resend it, and eventually not be able to make
          // progress. Therefore, we have to re-ack. Fortunately, this currently
          // seems to be a rare problem.
          this.sendAckPacket(ack_seqno);
          return true;
      }
      var offsetInBuffer64 = (offset64.sub(this.mNextByteExpected));//FIXME 2013: there used to be a -1 here...is that just wrong?
      var offsetInBuffer = offsetInBuffer64.toNumber();

      // Currently we shouldn't be resegmenting data, so we should either get an
      // entire segment before mNextByteExpected (handled already), or an entire
      // one after. Because of this, we can currently assert at this point that
      // we shouldn't have negative offsets. If we ever end up sometimes
      // re-segmenting, then we might have segments that span this boundary and
      // have to do something more complicated.
      if (offsetInBuffer<0) {
            Kata.error("ASSERT FAILED: Offset in buffer < 0");
      }
      if (buffer.length>0 && offset.lsw == this.mNextByteExpected.lsw) {
        if (offsetInBuffer + len <= MAX_RECEIVE_WINDOW_STREAM_SST) {
            this.mReceiveWindowSize -= len;
            for (var i=0;i<len;++i) {
                var loc=offsetInBuffer+i;
                this.mReceiveBuffer[loc]=buffer[i];//memcpy(receiveBuffer()+offsetInBuffer, buffer, len);
            }
            if (offset64.less(this.mNextByteExpected)) {
                Kata.error("ASSERT FAILED: Offset64 less than next byte expected");
            }
            this.mReceivedSegments.insert(offset64,len);
            //Kata.log("M"+len+":"+this.mReceiveBuffer);
            this.sendToApp(len);

            //send back an ack.
            this.sendAckPacket(ack_seqno);
        }
        else {
           //dont ack this packet.. its falling outside the receive window.
          this.sendToApp(0);
        }
      }
      else if (len>0) {
        if (!this.mLastContiguousByteReceived.less(offset.add(PROTO.I64.fromNumber(len-1)))) {//if offset+len-1<=mLastContiguousByteReceived
            this.sendAckPacket(ack_seqno);
            return true;
        }else if (offsetInBuffer + len <=MAX_RECEIVE_WINDOW_STREAM_SST){
            if (offsetInBuffer+len<=0) {
                Kata.error("ASSERT FAILED offsetInBuffer + len > 0");                
            }
            this.mReceiveWindowSize -= len;
            
            if (offsetInBuffer< 0) {
                Kata.error("ASSERT FAILED offsetInBuffer>=0");                
            }
            for (var i=0;i<len;++i) {
                this.mReceiveBuffer[offsetInBuffer+i]=buffer[i];//memcpy(receiveBuffer()+offsetInBuffer,buffer,len);
            }
            if (offset64.less(this.mNextByteExpected)){ 
                Kata.error("ASSERT FAILED offset64"+offset64.toString()+" >= this.mNextByteExpected "+this.mNextByteExpected.toString());
            }
            this.mReceivedSegments.insert(offset64,len);
            this.sendAckPacket(ack_seqno);            
            return true;
        }else {
            this.sendToApp(0);
            return false;
        }
      }else if (len==0&&offset64.equals(this.mNextByteExpected)) {
          
          // A zero length packet at the next expected offset. This is a keep
          // alive, which are just empty packets that we process to keep the
          // connection running. Send an ack so we don't end up with unacked
          // keep alive packets.
          this.sendAckPacket(ack_seqno);
          return true;
      }
    }
      
    // Anything else doesn't match what we're expecting, indicate failure
      return false;
    };
// Handle reception of ACK packets.
Kata.SST.Stream.prototype.receiveAck=function(streamMsg, channelSegmentID64 ) {
    var curTime = Date.now();
    var acked_buffer = null; 

    var normal_ack=false;
 
    // First, check if we have the acked channel segment ID waiting
    // for an ack (i.e. waiting for the ack hasn't timed out). This
    // should be the normal case.
    var channelSegmentIDstr =  channelSegmentID64.hash();
    if (channelSegmentIDstr in this.mWaitingForAcks) {
        acked_buffer = this.mWaitingForAcks[channelSegmentIDstr];
        normal_ack = true;

       // Clear out references tracking this buffer for acks. First,
       // the obvious one here.
       delete this.mWaitingForAcks[channelSegmentIDstr];
       //Graveyard cleared below 
    }
    else {
        // Otherwise, we check the graveyard to see if we had
        // retransmitted (or scheduled for retransmit) but now got the
        // the ack anyway.
        if (channelSegmentIDstr in this.mUnackedGraveyard) {
            acked_buffer = this.mUnackedGraveyard[channelSegmentIDstr];
            // Clear references tracking this buffer
            delete this.mUnackedGraveyard[channelSegmentIDstr];
            
            // In this case, we get rid of any entries actively
            // waiting for acks. We could safely do this no matter
            // where we found the ack, as we do with the graveyard
            // below, but we don't since scanning through the list of
            // waiting for acks is possibly very expensive, and in the
            // common case much more expensive than scanning through
            // the graveyard (which should usually be empty).
            
            for (var it in this.mWaitingForAcks){
                if (this.mWaitingForAcks[it]===acked_buffer) {
                    delete this.mWaitingForAcks[it];
                    break;
                }
            }
        }
    }
    if (acked_buffer!==null) {
        acked_buffer.mAckTime = curTime;
        this.mNumOutstandingBytes -= acked_buffer.mBuffer.length;//FIXME 2013: is .length the appropriate item here
        if (normal_ack) {
            this.updateRTO(acked_buffer.mTransmitTime, acked_buffer.mAckTime);
            if ( Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes >= 0.5 ) {
                this.mTransmitWindowSize = Math.ceil(Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes);

            } else {
                this.mTransmitWindowSize = 0;
            }
        }
        

        // In either case, if we found the acked packet (we extracted
        // the buffer), we need to scan the graveyard for ones with
        // the same offset due to retransmits (even if we found the
        // acked one in the graveyard since we may have multiple
        // retransmits)
        var graveyardChannelIDs = [];
        for (var graveyard_it in this.mUnackedGraveyard) {
            if (this.mUnackedGraveyard[graveyard_it]===acked_buffer)
                graveyardChannelIDs.push(graveyard_it);            
        }
        for (var i=graveyardChannelIDs.length-1;i>=0;--i)
            delete this.mUnackedGraveyard[graveyardChannelIDs[i]];
    }

    // If we acked messages, we've cleared space in the transmit
    // buffer (the receiver cleared something out of its receive
    // buffer). We can send more data, so schedule servicing if we
    // have anything queued.
    if (acked_buffer!==null && !KataDequeEmpty(this.mQueuedBuffers)) 
        this.scheduleStreamService();
};
/**
 * @param {Date} sampleStartTime
 * @param {Date} sampleEndTime
 */
Kata.SST.Stream.prototype.updateRTO=function(){
    var firstRTO=true;
    return function(sampleStartTime, sampleEndTime) {
    var sst=sampleStartTime;
    var set=sampleEndTime;
    if (sst > set ) {
      Kata.log("Bad sample\n");
      return;
    }

    if (firstRTO) {
      this.mStreamRTOMilliseconds = (set - sst) ;
      firstRTO = false;
    }
    else {

      this.mStreamRTOMilliseconds = FL_ALPHA_STREAM_SST * this.mStreamRTOMilliseconds +
        (INV_FL_ALPHA_STREAM_SST) * (set-sst);
    }
  };
}();
/**
 * @param {Array} data
 */
Kata.SST.Stream.prototype.sendInitPacket = function(data) {
    //std::cout <<  mConnection.lock()->localEndPoint().endPoint.toString()  << " sending Init packet\n";

    var sstMsg=new Sirikata.Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID;
    sstMsg.type=Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.INIT;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    sstMsg.psid=this.mParentLSID;

    sstMsg.bsn = PROTO.I64.fromNumber(0);

    sstMsg.payload=data;

    var buffer = sstMsg.SerializeToArray();

    var timeToService = Math.pow(2.0,2*this.mNumInitRetransmissions)*this.mStreamRTOMilliseconds;

    if (this.mConnection) {
        //Kata.log("Sending init "+this.mConnection.headerToStringDebug({lsid:this.mLSID})+" tts "+timeToService);
        this.mConnection.sendDataWithAutoAck( buffer , false /*Not an ack*/ );
    }

    this.scheduleStreamService(timeToService);
};

Kata.SST.Stream.prototype.sendAckPacket=function(ack_seqno) {
    var sstMsg= new Sirikata.Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    //printf("Sending Ack packet with window %d\n", (int)sstMsg.window());

    var buffer = sstMsg.SerializeToArray();
    this.mConnection.sendData(  buffer, true/*our ack packet!*/, ack_seqno);
  };

/**
 * @param {Array} data
 * @param {number} offset
 */
Kata.SST.Stream.prototype.sendDataPacket=function( data, offset) {
    var sstMsg= new Sirikata.Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATA;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;
    sstMsg.bsn = PROTO.I64.fromNumber(offset);

    sstMsg.payload=data;

    var buffer = sstMsg.SerializeToArray();
    return this.mConnection.sendDataWithAutoAck(  buffer, false/*not an ack packet!*/);
  };

/**
 * @param {Array} data
 * @param {number} remoteLSID remote Stream ID
 */
Kata.SST.Stream.prototype.sendReplyPacket=function(data, remoteLSID, ack_seqno) {
    //printf("Sending Reply packet\n");

    var sstMsg= new Sirikata.Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.REPLY;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    sstMsg.rsid=remoteLSID;
    sstMsg.bsn = PROTO.I64.fromNumber(0);

    sstMsg.payload=data;

    var buffer = sstMsg.SerializeToArray();
    this.mConnection.sendData(  buffer, false/*not an ack packet!*/, ack_seqno);
  };

}, 'katajs/oh/sst/SSTImpl.js');
