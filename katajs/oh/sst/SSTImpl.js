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

Kata.require([
    'katajs/core/Deque.js',
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/SSTHeader.pbj.js'],
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/plugins/sirikata/impl/ObjectMessage.pbj.js']
], function() {

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
Kata.SST.ObjectMessageDispatcher.prototype.registerObjectMessageRecipient = function(port, recipient) {
    this.mObjectMessageRecipients[port] = recipient;
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
        return recipient.receiveMessage(msg);
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
var sConnectionReturnCallbackMapSST={};

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
        baseDatagramLayer.mDispatcher.registerObjectMessageRecipient(listeningEndPoint.port,baseDatagramLayer);
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
Kata.SST.Impl.BaseDatagramLayer.prototype.receiveMessage=function(msg)  {
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


/**
 * @param {!Kata.SST.EndPoint} localEndPoint 
 * @param {!Kata.SST.EndPoint} remoteEndPoint 
 */
Kata.SST.Connection = function(localEndPoint,remoteEndPoint){
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
    this.mCwnd=1;
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
    this.mLastTransmitTime=new Date();
    /**
     * @type {boolean}
     */
    this.inSendingMode=true;
    /**
     * @type {number}
     */
    this.numSegmentsSent=0;
    /**
     * @type{!Kata.SST.Impl.BaseDatagramLayer}
     */
    this.mDatagramLayer=getDatagramLayerSST(localEndPoint);
    this.mDatagramLayer.dispatcher().registerObjectMessageRecipient(localEndPoint.port,this);
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
/**
 * @param {Date} curTime
 * @returns {boolean}
 */
Kata.SST.Connection.prototype.serviceConnection=function () {
    var curTime = new Date();
    //console.log(curTime+" Servicing "+this.mLocalEndPoint.uid());
    //DRH FIXME DRH why call conn.localEndPoint() without looking at result
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
        }
    }
    if (this.inSendingMode) {
        this.numSegmentsSent = 0;
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
            
	        KataDequePopFront(this.mQueuedSegments);
            
	        this.numSegmentsSent++;
            
	        this.mLastTransmitTime = curTime;
            
	        this.inSendingMode = false;
            
        }
        if (!this.inSendingMode) {
            setTimeout(Kata.bind(this.serviceConnection,this),this.mRTOMilliseconds);
        }
    }
    else {
        
      if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
          // FIXME connection retries. Also, this is getting triggered
          // *really* quickly when the initial sendData, which
          // *probably means it will only ever work for local host or
          // *maybe a LAN
          //setTimeout(Kata.bind(this.cleanup,this),0);
	  //    return false; //the connection was unable to contact the other endpoint.
      }

//p      var all_sent_packets_acked = true;
//p      var no_packets_acked = true;
//p      for (var i=0; i < this.mOutstandingSegments.size(); i++) {
//p          var segment = KataDequeIndex(this.mOutstandingSegments,i);

//p          if (segment.mAckTime == null) {
//p              all_sent_packets_acked = false;
//p          }
//p          else {
//p              no_packets_acked = false;
//p              if (this.mFirstRTO ) {
//p                  this.mRTOMilliseconds = ((segment.mAckTime.getTime() - segment.mTransmitTime.getTime())) ;
//p                  this.mFirstRTO = false;
//p              }
//p              else {
//p                  this.mRTOMilliseconds = CC_ALPHA_SST * this.mRTOMilliseconds +
//p                      (1.0-CC_ALPHA_SST) * (segment.mAckTime.getTime() - segment.mTransmitTime.getTime());
//p              }
//p          }
//p      }

      //printf("mRTOMicroseconds=%d\n", (int)mRTOMicroseconds);
      if (!KataDequeEmpty(this.mOutstandingSegments)) {
          this.mCwnd /=2;
          if (this.mCwnd < 1) {
              this.mCwnd = 1;
          }
          KataDequeClear(this.mOutstandingSegments);
      }
        this.inSendingMode=true;
        setTimeout(Kata.bind(this.serviceConnection,this),0);
    }
//p      if (this.numSegmentsSent >= this.mCwnd) {
//p        if (all_sent_packets_acked) {
//p          this.mCwnd += 1;
//p        }
//p        else {
//p          this.mCwnd /= 2;
//p        }
//p      }
//p      else {
//p        if (all_sent_packets_acked) {
//p          this.mCwnd = (this.mCwnd + this.numSegmentsSent) / 2;
//p        }
//p        else {
//p          this.mCwnd /= 2;
//p        }
//p      }

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
 * @param {!function} cb the connection return callback if a connection is successful
 * @param {!function} scb the stream return callback function if a new stream appears
 * @returns false if it's not possible to create this connection, e.g. if another connection
 *     is already using the same local endpoint; true otherwise.
 */
var createConnectionSST = function(localEndPoint,remoteEndPoint,cb){
    var endPointUid=localEndPoint.uid();
    if (endPointUid in sConnectionMapSST) {
        Kata.log("mConnectionMap.find failed for " +localEndPoint.uid());
        
        return false;
    }

    var conn =  new Kata.SST.Connection(localEndPoint, remoteEndPoint);
    sConnectionMapSST[endPointUid] = conn;
    sConnectionReturnCallbackMapSST[endPointUid] = cb;

    conn.setState(CONNECTION_PENDING_CONNECT_SST);


    var channelid=getDatagramLayerSST(localEndPoint).getAvailableChannel();
    var payload=[
        ((channelid>>8)&255),
        channelid&255
    ];

    conn.setLocalChannelID(channelid);
    conn.sendData(payload,false/*not an ack*/);


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
        return false;
    }
    sListeningConnectionsCallbackMapSST[listeningEndPointId]=cb;
    return true;
};
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
 * @param {function} scb StreamReturnCallbackFunction == void(int, boost::shared_ptr< Stream<UUID> >)
 */
Kata.SST.Connection.prototype.listenStream=function(port,scb){
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
  * @param {function} cb StreamReturnCallbackFunction == void(int, boost::shared_ptr< Stream<UUID> >) 
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

    var stream = new Kata.SST.Stream(parentLSID, this, local_port, remote_port,  usid, lsid,
				            initial_data, false, 0, cb);

    this.mOutgoingSubstreamMap[lsid]=stream;
    return stream;
};

var streamHeaderTypeIsAckSST = function(data){
    var stream_msg = new Sirikata.Protocol.SST.SSTStreamHeader();
    var parsed = stream_msg.ParseFromArray(data);
    return stream_msg.type==Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK;
};

/**
 * @param {Array} data Array of uint8 data
 * @returns {PROTO.I64} sequence number of sent data
 */
Kata.SST.Connection.prototype.sendData=function(data, sstStreamHeaderTypeIsAck){

    if (data.length > MAX_PAYLOAD_SIZE_SST){
        Kata.log("Data longer than MAX_PAYLOAD_SIZE OF "+MAX_PAYLOAD_SIZE_SST);
    }
    if (sstStreamHeaderTypeIsAck===undefined){
        Kata.log("sendData not setting whether it is an ack");
    }
 
    var transmitSequenceNumber =  this.mTransmitSequenceNumber;

    var pushedIntoQueue = false;

    if ( sstStreamHeaderTypeIsAck ) {
      var sstMsg=new Sirikata.Protocol.SST.SSTChannelHeader();
      sstMsg.channel_id= this.mRemoteChannelID;
      sstMsg.transmit_sequence_number=this.mTransmitSequenceNumber;
      sstMsg.ack_count=1;
      sstMsg.ack_sequence_number=this.mLastReceivedSequenceNumber;

      sstMsg.payload=data;

      this.sendSSTChannelPacket(sstMsg);
    }else {
      if (KataDequeLength(this.mQueuedSegments) < MAX_QUEUED_SEGMENTS_SST) {
	      KataDequePushBack(this.mQueuedSegments,new Kata.SST.Impl.ChannelSegment(data,
                                                               this.mTransmitSequenceNumber,
                                                               this.mLastReceivedSequenceNumber) );
	      pushedIntoQueue = true;
          if (this.inSendingMode) {
             setTimeout(Kata.bind(this.serviceConnection,this));    
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
    for (var i = 0; i < len; i++) {
        var segment=KataDequeIndex(this.mOutstandingSegments,i);
        if (segment.mChannelSequenceNumber.equals(receivedAckNum)) {
	        segment.mAckTime = new Date();//FIXME DRH port
            if (this.mFirstRTO) {
                this.mRTOMilliseconds = (segment.mAckTime - segment.mTransmitTime);
                this.mFirstRTO=false;
            }
            else {
                this.mRTOMilliseconds = CC_ALPHA_SST * this.mRTOMilliseconds +
                    (1.0-CC_ALPHA_SST) * (segment.mAckTime - segment.mTransmitTime);
            }
            this.inSendingMode=true;
            //setTimeout(Kata.bind(this.serviceConnectionNoReturn,this),0);
            if (Math.random()*this.mCwnd<1) {
                this.mCwnd+=1;
            }
            KataDequeErase(this.mOutstandingSegments,i);//FIXME expensive
            //FIXME DRH: erase item
            break;
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

    var received_stream_msg = new Sirikata.Protocol.SST.SSTStreamHeader();
    
    var parsed = received_stream_msg.ParseFromArray(received_channel_msg.payload);


    if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.INIT) {
      this.handleInitPacket(received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.REPLY) {
      this.handleReplyPacket(received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATA) {
      this.handleDataPacket(received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK) {
      this.handleAckPacket(received_channel_msg, received_stream_msg);
    }
    else if (received_stream_msg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATAGRAM) {
      this.handleDatagram(received_stream_msg);
    }
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
Kata.SST.Connection.prototype.handleInitPacket=function (received_stream_msg) {
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
                                     usid, newLSID,
                                     [], true, incomingLsid, null);
        this.mOutgoingSubstreamMap[newLSID] = stream;
        this.mIncomingSubstreamMap[incomingLsid] = stream;

        listeningStreamsCallback(0, stream);

        stream.receiveData(received_stream_msg, received_stream_msg.payload,
                            received_stream_msg.bsn);
      }
      else {
        Kata.log("Not listening to streams at: " + this.headerToStringDebug(received_stream_msg));
      }
    }else {
        Kata.log("Init message for connected stream"+this.headerToStringDebug(received_stream_msg));
        // Re-reply to the init since we either dropped or were too slow.
        this.mIncomingSubstreamMap[incomingLsid].sendReplyPacket(undefined, incomingLsid);
    }
};

/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */
Kata.SST.Connection.prototype.handleReplyPacket=function(received_stream_msg) {
    var incomingLsid = received_stream_msg.lsid;
    
    if (!this.mIncomingSubstreamMap[incomingLsid]) {
      var initiatingLSID = received_stream_msg.rsid;
      var outgoingSubstream=this.mOutgoingSubstreamMap[initiatingLSID];
      if (outgoingSubstream) {
          var stream = outgoingSubstream;
          this.mIncomingSubstreamMap[incomingLsid] = stream;

        if (stream.mStreamReturnCallback){
          stream.mStreamReturnCallback(Kata.SST.SUCCESS, stream);
          stream.receiveData(received_stream_msg, received_stream_msg.payload,
                              received_stream_msg.bsn);
        }
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

Kata.SST.Connection.prototype.handleDataPacket=function(received_stream_msg) {
    var incomingLsid = received_stream_msg.lsid;
    var stream_ptr=this.mIncomingSubstreamMap[incomingLsid];
    if (stream_ptr) {

	  stream_ptr.receiveData( received_stream_msg,
			       received_stream_msg.payload,
			       received_stream_msg.bsn
			       );
    }
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

      stream_ptr.receiveData( received_stream_msg,
			       received_stream_msg.payload,
			       received_channel_msg.ack_sequence_number);
    }
};
//DANIEL PORT REAL REAL STOP
/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} received_stream_msg
 */
Kata.SST.Connection.prototype.handleDatagram=function(received_stream_msg) {
    var msg_flags = received_stream_msg.flags;
    if (msg_flags & Sirikata.Protocol.SST.SSTStreamHeader.CONTINUES) {
        if (not (received_stream_msg.lsid in this.mPartialReadDatagrams)) {
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
    sstMsg.ack_sequence_number=this.mLastReceivedSequenceNumber;

    this.sendSSTChannelPacket(sstMsg);

    this.mTransmitSequenceNumber=this.mTransmitSequenceNumber.unsigned_add(PROTO.I64.ONE);
};

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
	        this.parsePacket(received_msg);
        }
    }

    // We always say we handled this since we were explicitly listening on this port
    return true;
};
/**
 * @param {Kata.SST.Stream} stream the stream which to erase from the outgoing substream map
 */
Kata.SST.Connection.prototype.eraseDisconnectedStream=function(stream) {
    delete this.mOutgoingSubstreamMap[stream.mLSID];
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

Kata.SST.Connection.prototype.cleanup= function() {
    var connState = this.mState;

    if (connState == CONNECTION_PENDING_CONNECT_SST || connState == CONNECTION_DISCONNECTED_SST) {
      //Deal with the connection not getting connected with the remote endpoint.
      //This is in contrast to the case where the connection got connected, but
      //the connection's root stream was unable to do so.

      var cb = null;
      var localEndPoint=this.mLocalEndPoint;
      var localEndPointId=localEndPoint.uid();        
      //if (localEndPointId in sConnectionReturnCallbackMapSST) {
      cb = sConnectionReturnCallbackMapSST[localEndPointId];
      //}

      var failed_conn = this;

      delete sConnectionReturnCallbackMapSST[localEndPointId];
      delete sConnectionMapSST[localEndPointId];


      if (connState == CONNECTION_PENDING_CONNECT_SST && cb)
        cb(Kata.SST.FAILURE, failed_conn);
    }
  }
    


  /** Sends the specified data buffer using best-effort datagrams on the
     underlying connection. This may be done using an ephemeral stream
     on top of the underlying connection or some other mechanism (e.g.
     datagram packets sent directly on the underlying  connection).

   *  @param {Array} data the buffer to send
   *  @param {number} local_port the source port
   *  @param {number} remote_port the destination port
   *  @param {function} DatagramSendDoneCallback a callback of type
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

            this.sendData(  buffer, false );

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
  *  @param {function} ReadDatagramCallback a function of type "void (uint8*, int)"
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
    return false;
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
      delete sConnectionMapSST[this.mLocalEndPoint.uid()];
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
            conn.setRemoteChannelID(received_payload[0]*256+received_payload[1]);
            conn.setState(CONNECTION_PENDING_RECEIVE_CONNECT_SST);
            
            conn.sendData([
                              (availableChannel>>8)&255,
                              availableChannel&255,
                              (availablePort>>8)&255,
                              availablePort&255
                          ],
                          false/*not an ack*/);
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

var sStreamReturnCallbackMapSST={};

/**
 * @param {!Kata.SST.EndPoint} localEndPoint
 * @param {!Kata.SST.EndPoint} remoteEndPoint
 * @param {function} cb StreamReturnCallbackFunction ==  void(int, boost::shared_ptr< Stream<UUID> >)
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
 * @param {function} cb StreamReturnCallbackFunction ==  void(int, boost::shared_ptr< Stream<UUID> >)
 */
Kata.SST.Stream = function(parentLSID, conn,
		 local_port, remote_port,
		 usid, lsid, initial_data,
		 remotelyInitiated, remoteLSID, cb){
/**
 * @type {number} state from CONNECTION_*_STREAM_SST enum
 */
    this.mState=PENDING_CONNECT_STREAM_SST;
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
     * @type {number} milliseconds 
     */
    this.mStreamRTOMilliseconds=5000; // Intentionally > 1 second. Do not change.
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
     * @type {function} for new streams arriving at this port
     */
    this.mStreamReturnCallback=cb;
    /**
     * @type {boolean} FIXME: not sure why this replicated data from mState
     */
    this.mConnected=false;
    if (remotelyInitiated) {
        this.mConnected=true;
        this.mState=CONNECTED_STREAM_SST;
    }

    
    if (initial_data) {
        if (initial_data.length<=MAX_PAYLOAD_SIZE_STREAM_SST) {
            this.mInitialData=initial_data;
        }else{
            this.mInitialData=initial_data.slice(0,MAX_PAYLOAD_SIZE_STREAM_SST);
        }
    }else {
        this.mInitialData=[];
    }
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
    this.mChannelToBufferMap={};
    this.mChannelToStreamOffsetMap={};
    
/**
 * @type {number} size of the StreamBuffer deque in bytes
 */
    this.mCurrentQueueLength=0;
    if (remotelyInitiated){
        this.sendReplyPacket(this.mInitialData,remoteLSID);
    }else {
        this.sendInitPacket(this.mInitialData);
    }
/**
 * @type {number} number of retransmissions of initial data
 */
    this.mNumInitRetransmissions =1;
/**
 * @type {number} number of bytes put to the wire
 */
    this.mNumBytesSent=PROTO.I64.fromNumber(this.mInitialDataLength || 0);
    if (initial_data.length>this.mInitialData.length){
        this.write(initial_data.slice(this.mInitialData.length,initial_data.length));
    }
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
    @param {function} scb the callback function invoked when a new stream is created
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

    var count = 0;
    var len = data.length;


    if (len <= MAX_PAYLOAD_SIZE_STREAM_SST) {
      if (this.mCurrentQueueLength+len > MAX_QUEUE_LENGTH_STREAM_SST) {
        return 0;
      }
      KataDequePushBack(this.mQueuedBuffers,new StreamBuffer(data, this.mNumBytesSent));
      this.mCurrentQueueLength += len;
      this.mNumBytesSent = this.mNumBytesSent.unsigned_add(PROTO.I64.fromNumber(len));
       
      setTimeout(Kata.bind(this.serviceStream,this),0);

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

      setTimeout(Kata.bind(this.serviceStream,this),0);

      return currOffset;
    }

    return -1;
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
    if (force) {
      this.mConnected = false;
      if (this.mConnection)
          this.mConnection.eraseDisconnectedStream(this);
      this.mState = DISCONNECTED_STREAM_SST;
      return true;
    }
    else if (this.mState!=DISCONNECTED_STREAM_SST) {
      this.mState = PENDING_DISCONNECT_STREAM_SST;
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
    this.mConnection.stream(cb, data, length, local_port, remote_port, this.mParentLSID);
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

/**
 * @param {Date} curTime 
 * @return false only if this is the root stream of a connection and it was
 *  unable to connect. In that case, the connection for this stream needs to
 *  be closed and the 'false' return value is an indication of this for
 *  the underlying connection.
 */
Kata.SST.Stream.prototype.serviceStream=function() {
    this.conn = this.mConnection;
    var curTime= new Date();
    //console.log(curTime+" Servicing Stream"+this.mConnection.mLocalEndPoint.uid());
    if (this.mState != CONNECTED_STREAM_SST && this.mState != DISCONNECTED_STREAM_SST) {

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
        delete sStreamReturnCallbackMapSST[this.mConnection.mLocalEndPoint.uid()];
        var retVal=true;
        // If this is the root stream that failed to connect, close the
        // connection associated with it as well.
        if (this.mParentLSID == 0) {
           this.mConnection.close(true);
           retVal=false;
        }

        //send back an error to the app by calling mStreamReturnCallback
        //with an error code.
        if (this.mStreamReturnCallback) {
          this.mStreamReturnCallback(Kata.SST.FAILURE, null );              
        }
        this.mStreamReturnCallback=null;
        this.mState=DISCONNECTED_STREAM_SST;
        if (!retVal) {
            setTimeout(Kata.bind(this.mConnection.cleanup,this.mConnection),0);
        }
        return false;
      }
      else {
        this.mState = CONNECTED_STREAM_SST;
      }
    }
    else {
      if (this.mState != DISCONNECTED_STREAM_SST) {
        //this should wait for the queue to get occupied... right now it is
        //just polling...

        if ( this.mLastSendTime
             && (curTime.getTime() - this.mLastSendTime.getTime()) > 2*this.mStreamRTOMilliseconds)
        {
          this.resendUnackedPackets();
          this.mLastSendTime = curTime;
        }
        function mapEmpty(m) {
            for (var i in m) {
                return false;
            }
            return true;
        }
        if (this.mState == PENDING_DISCONNECT_STREAM_SST &&
            KataDequeEmpty(this.mQueuedBuffers)  &&
            mapEmpty(this.mChannelToBufferMap) )
        {
            this.mState = DISCONNECTED_STREAM_SST;
            this.mConnection.eraseDisconnectedStream(this);
            return true;
        }
        var sentSomething = false;
        while ( !KataDequeEmpty(this.mQueuedBuffers) ) {
          var buffer = KataDequeFront(this.mQueuedBuffers);

          if (this.mTransmitWindowSize < buffer.mBuffer.length) {
            break;
          }

          var channelID = this.sendDataPacket(buffer.mBuffer,
                                         buffer.mOffset);

          buffer.mTransmitTime = curTime;
          sentSomething = true;
          var key=channelID.hash();
          if ( !this.mChannelToBufferMap[key]) {
            this.mChannelToBufferMap[key] = buffer;
            this.mChannelToStreamOffsetMap[key] = buffer.mOffset;
          }

          KataDequePopFront(this.mQueuedBuffers);
          this.mCurrentQueueLength -= buffer.mBuffer.length;
          this.mLastSendTime = curTime;

          if(buffer.mBuffer.length > this.mTransmitWindowSize){
              Kata.log("Failure: buffer length "+buffer.mBuffer.length+"is greater than trasmitwindow size"+this.mTransmitWindowSize);
          }
          this.mTransmitWindowSize -= buffer.mBuffer.length;
          this.mNumOutstandingBytes += buffer.mBuffer.length;
        }
        if (sentSomething) {
            setTimeout(Kata.bind(this.serviceStream,this),this.mStreamRTOMilliseconds*2);
        }
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
    for(var it in this.mChannelToBufferMap)
    {
        var buffer=this.mChannelToBufferMap[it];
        var bufferLength=buffer.mBuffer.length;
        KataDequePushFront(this.mQueuedBuffers,buffer);
        this.mCurrentQueueLength += bufferLength;

        //printf("On %d, resending unacked packet at offset %d:%d\n", (int)mLSID, (int)it->first, (int)(it->second->mOffset));

        if (this.mTransmitWindowSize < bufferLength){
          if (bufferLength <= 0){
              Kata.log("Assertion failed: channelbuffer must have size >0");
          }
          this.mTransmitWindowSize = bufferLength;//prevent silly window size?
        }
     }

     setTimeout(Kata.bind(this.serviceStream,this),0);

     var channelToBufferMapEmpty=mapEmpty(this.mChannelToBufferMap);
     if (channelToBufferMapEmpty && !KataDequeEmpty(this.mQueuedBuffers)) {
       var buffer = KataDequeFront(this.mQueuedBuffers);
        var bufferLength=buffer.mBuffer.length;
         if (bufferLength <= 0){
             Kata.log("Assertion failed: channelbuffer must have size >0");
         }
       if (this.mTransmitWindowSize < bufferLength) {
         this.mTransmitWindowSize = bufferLength;
       }
     }

     this.mNumOutstandingBytes = 0;

     if (!channelToBufferMapEmpty) {
       if (this.mStreamRTOMilliseconds < 2000) {//FIXME should this be a constant
           this.mStreamRTOMilliseconds *= 2;
       }
       this.mChannelToBufferMap={};
     }
  };

  /** This function sends received data up to the application interface.
     mReceiveBufferMutex must be locked before calling this function. 
   @param {number} skipLength
 */
Kata.SST.Stream.prototype.sendToApp=function(skipLength) {
    var readyBufferSize = skipLength;

    for (var i=skipLength; i < MAX_RECEIVE_WINDOW_STREAM_SST; i++) {
      if (this.mReceiveBuffer[i] !== undefined) {
        readyBufferSize++;
      }
      else {
        break;
      }
    }

    //pass data up to the app from 0 to readyBufferSize;
    //
    if (this.mReadCallback && readyBufferSize > 0) {
      this.mReadCallback(this.mReceiveBuffer.slice(0, readyBufferSize));

      //now move the window forward...
      this.mLastContiguousByteReceived = this.mLastContiguousByteReceived.add(PROTO.I64.fromNumber(readyBufferSize));
      this.mNextByteExpected = this.mLastContiguousByteReceived.unsigned_add(PROTO.I64.ONE);

      var len = MAX_RECEIVE_WINDOW_STREAM_SST - readyBufferSize;
      var i;
      for (i = 0; i < len; i++) {
        this.mReceiveBuffer[i] = this.mReceiveBuffer[i + readyBufferSize];
      }
      for (; i < MAX_RECEIVE_WINDOW_STREAM_SST;++i) {
        this.mReceiveBuffer[i] = undefined;
      }
      this.mReceiveBuffer.length = len;

      this.mReceiveWindowSize += readyBufferSize;
    }
  };

/**
 * @param {!Sirikata.Protocol.SST.SSTStreamHeader} streamMsg
 * @param {Array} buffer
 * @param {!PROTO.I64} offset
 */
Kata.SST.Stream.prototype.receiveData=function(streamMsg,
                    buffer, offset )
  {
    //Kata.log("BUFFER IS "+buffer + " offset is "+offset)
    if (streamMsg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.REPLY) {
      this.mConnected = true;
    }
//p    else if (streamMsg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK) {
//p      var offsetHash=offset.hash();
//p      var channelBuffer=this.mChannelToBufferMap[offsetHash];
//p      if (channelBuffer) {
//p        var dataOffset = channelBuffer.mOffset;
//p        this.mNumOutstandingBytes -= channelBuffer.mBuffer.length;
//p
//p        channelBuffer.mAckTime = new Date();
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
    else if (streamMsg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.DATA || streamMsg.type == Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.INIT) {

      if ( Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes < .5){
          Kata.log("Assertion failed: 2^"+streamMsg.window+" <= "+this.mNumOutstandingBytes);
      }
      this.mTransmitWindowSize = Math.round(Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes);
        if (this.mTransmitWindowSize > 0 && !KataDequeEmpty(this.mQueuedBuffers))
            setTimeout(Kata.bind(this.serviceStream,this), 0);

      //printf("offset=%d,  mLastContiguousByteReceived=%d, mNextByteExpected=%d\n", (int)offset,  (int)mLastContiguousByteReceived, (int)mNextByteExpected);

      var lastContigByteMSW = this.mLastContiguousByteReceived.msw;
      var offset64 = offset;//new PROTO.I64(lastContigByteMSW, offset, 1);
      var offsetInBuffer = (offset64.sub(this.mLastContiguousByteReceived)).lsw-1;
      
      if ( offset.lsw == this.mNextByteExpected.lsw) {
        if (offsetInBuffer + buffer.length <= MAX_RECEIVE_WINDOW_STREAM_SST) {
            var len=buffer.length;
            this.mReceiveWindowSize -= len;
            //Kata.log("A "+len+": "+offsetInBuffer+" X "+ buffer)
            //Kata.log("XM"+this.mReceiveBuffer);
            for (var i=0;i<len;++i) {
                var loc=offsetInBuffer+i;
                this.mReceiveBuffer[loc]=buffer[i];
            }
            //Kata.log("M"+len+":"+this.mReceiveBuffer);
            this.sendToApp(len);

            //send back an ack.
            this.sendAckPacket();
        }
        else {
           //dont ack this packet.. its falling outside the receive window.
          this.sendToApp(0);
        }
      }
      else {
        var len=buffer.length;
        
        //std::cout << offsetInBuffer << "  ,  " << offsetInBuffer+len << "\n";
        var lastByteInBuffer=offset.lsw+len-1;
        var beforeWindow=lastByteInBuffer - this.mLastContiguousByteReceived.lsw;
        // is 2 billion the right number?
        if (Math.abs(beforeWindow) > 2147483647) {
            beforeWindow = -beforeWindow;
        }
        if (beforeWindow <= 0) {
          //Kata.log("Acking packet which we had already received previously\n", lastByteInBuffer, this.mLastContiguousByteReceived.lsw, offset, len);
          this.sendAckPacket();
        }
        else if (offsetInBuffer + len <= MAX_RECEIVE_WINDOW_STREAM_SST) {
          if (offsetInBuffer + len <= 0){
              Kata.log("Assertion failed: Offset in Buffer "+offsetInBuffer+"+"+len+"<=0");
          }

          this.mReceiveWindowSize -= len;
            //Kata.log("AA "+"Last byte in buffer"+lastByteInBuffer+" vs "+this.mLastContiguousByteReceived.lsw+" NextEXP "+this.mNextByteExpected+" vs "+offset+" offset in buffer "+offsetInBuffer+":"+buffer);
          for (var i=0;i<len;++i) {
              var loc=offsetInBuffer+i;
              this.mReceiveBuffer[loc]=buffer[i];
          }
            //Kata.error("BB "+" Next byte exp "+this.mNextByteExpected+":"+this.mReceiveBuffer);
          this.sendAckPacket();
        }
        else {
          //dont ack this packet.. its falling outside the receive window.
          this.sendToApp(0);
        }
      }
    }
    //handle any ACKS that might be included in the message...
    var offsetHash=offset.hash();
    if (offsetHash in this.mChannelToBufferMap) {
      var buf=this.mChannelToBufferMap[offsetHash];
      var dataOffset = buf.mOffset;
      this.mNumOutstandingBytes -= buf.mBuffer.length;

      buf.mAckTime = new Date();

      this.updateRTO(buf.mTransmitTime, buf.mAckTime);

      if ( Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes >= 0.5 ) {
        this.mTransmitWindowSize = Math.round(Math.pow(2.0, streamMsg.window) - this.mNumOutstandingBytes);
        if (this.mTransmitWindowSize > 0 && !KataDequeEmpty(this.mQueuedBuffers))
            setTimeout(Kata.bind(this.serviceStream,this), 0);
      }
      else {
        this.mTransmitWindowSize = 0;
      }

      //printf("REMOVED ack packet at offset %d\n", (int)mChannelToBufferMap[offset]->mOffset);

      delete this.mChannelToBufferMap[offsetHash];

          /*
           * @type {Array} uint64 values stored
           */
      var channelOffsets=[];
      for(var it in this.mChannelToBufferMap)
      {
        if (this.mChannelToBufferMap[it].mOffset.equals(dataOffset)) {
          channelOffsets.push(it);
        }
      }
      for (var i=0; i< channelOffsets.length; i++) {
        delete this.mChannelToBufferMap[channelOffsets[i]];
      }
    }
    else {
      // ACK received but not found in mChannelToBufferMap
      if (offsetHash in this.mChannelToStreamOffsetMap) {
        var dataOffset = this.mChannelToStreamOffsetMap[offsetHash];
        delete this.mChannelToStreamOffsetMap[offsetHash];

        var channelOffsets=[];
        for (it in this.mChannelToBufferMap)
          {
            if (this.mChannelToBufferMap[it].mOffset.equals(dataOffset)) {
              channelOffsets.push(it);
            }
          }
        var len=channelOffsets.length;
        for (var i=0; i< len; i++) {
          delete this.mChannelToBufferMap[channelOffsets[i]];
        }
      }
    }  
  };
/**
 * @param {Date} sampleStartTime
 * @param {Date} sampleEndTime
 */
Kata.SST.Stream.prototype.updateRTO=function(){
    var firstRTO=true;
    return function(sampleStartTime, sampleEndTime) {
    var sst=sampleStartTime.getTime();
    var set=sampleEndTime.getTime();
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
    this.mConnection.sendData( buffer , false /*Not an ack*/ );

    setTimeout(Kata.bind(this.serviceStream,this),2*this.mStreamRTOMilliseconds);
};

Kata.SST.Stream.prototype.sendAckPacket=function() {
    var sstMsg= new Sirikata.Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType.ACK;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    //printf("Sending Ack packet with window %d\n", (int)sstMsg.window());

    var buffer = sstMsg.SerializeToArray();
    this.mConnection.sendData(  buffer, true/*our ack packet!*/);
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
    return this.mConnection.sendData(  buffer, false/*not an ack packet!*/);
  };

/**
 * @param {Array} data
 * @param {number} remoteLSID remote Stream ID
 */
Kata.SST.Stream.prototype.sendReplyPacket=function(data, remoteLSID) {
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
    this.mConnection.sendData(  buffer, false/*not an ack packet!*/);
  };

}, 'katajs/oh/sst/SSTImpl.js');
