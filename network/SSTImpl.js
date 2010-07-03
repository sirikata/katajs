

/**
 * @constructor
*/
function ObjectMessageDispatcherSST () {
    this.mObjectMessageRecipients = {};
}
// Registration and unregistration for object messages destined for the space
ObjectMessageDispatcherSST.prototype.registerObjectMessageRecipient = function(port, recipient) {
    this.mObjectMessageRecipients[port] = recipient;
};
ObjectMessageDispatcherSST.prototype.unregisterObjectMessageRecipient = function(port, recipient) {
    var currentRecipient = this.mObjectMessageRecipients[port];
    if (currentRecipient != recipient) {
        console.log("Unregistering wrong recipient for port "+port);
    } else {
        delete this.mObjectMessageRecipients[port];
    }
};
ObjectMessageDispatcherSST.prototype.dispatchMessage = function(msg) {
    if (msg.dest_port in this.mObjectMessageRecipients) {
        var recipient = this.mObjectMessageRecipients[msg.dest_port];
        recipient.recieveMessage(msg);
    }
};

/**
 * @constructor
 * @param {!EndPointType} endPoint The end point object (must have .id field)
 * @param {number} port 
*/

var EndPointSST = function(endPoint, port) {
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

EndPointSST.prototype.uid=function() {
    return ""+endPoint.id+this.port;
};

EndPointSST.prototype.objectId=function() {
    return endPoint.id;
};

/** 
 * @constructor
 * @param {!ObjectMessageRouter} router
 * @param {!ObjectMessageDispatcher} dispatcher
 */
var BaseDatagramLayer=function(router,dispatcher) {
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

    this.mMinAvailableChannel=1;
    this.mMinAvailablePort=2049;
    this.mAvailableChannels=[];
    this.mAvailablePorts=[];
};
/**
 * The map from object id's to end points
 */
var sDatagramLayerMap={};

/**
 * map from EndPointSST::uid() to function
 */
var sConnectionReturnCallbackMapSST={};

/**
 * map from EndPointSST::uid() to function
 */
var sListeningConnectionsCallbackMapSST={};

/**
 * @param {!EndPointSST} endPoint The end point object (must have .uid() and .objectId() functions)
 */
function getDatagramLayerSST(endPoint) {
    var id=endPoint.objectId();
    if (id in sDatagramLayerMap) {
        return sDatagramLayerMap[id];
    }
    return null;
}

/**
 * @param {!EndPointSST} endPoint The end point object (must have .uid() and .objectId() functions)
 * @param {!ObjectMessageRouter} router The place where messages may be sent to the wire
 * @param {!ObjectMessageDispatcher} dispatcher The place where messages may be returned from the wire
 */
function createBaseDatagramLayerSST(endPoint,router,dispatcher) {
    var id=endPoint.objectId();
    if (id  in sDatagramLayerMap){
        return sDatagramLayerMap[id];
    }
    return (sDatagramLayerMap[id]=new BaseDatagramLayer(router,dispatcher));
};

/**
 * @param {!EndPointSST} listeningEndPoint The end point that wishes to receive messages from the ObjectMessageDispatcher (must have .uid() and .objectId() functions)
 * @returns whether a baseDatagramLayer to register for was available
 */
function listenBaseDatagramLayerSST(listeningEndPoint){
    var id= listeningEndPoint.objectId();
    var baseDatagramLayer=sDatagramLayerMap[id];
    if (baseDatagramLayer) {
        baseDatagramLayer.mDispatcher.registerObjectMessageRecipient(listeningEndPoint.port,baseDatagramLayer);
        return true;
    }else return false;
}
/**
 * @param {!EndPointSST} src
 * @param {!EndPointSST} dst
 * @param {Array} data
 * @returns {boolean} route success
 */
BaseDatagramLayer.prototype.send=function(src,dest,data) {
    var objectMessage=new Protocol.Object.ObjectMessage();
    objectMessage.source_object=src.objectId();
    objectMessage.source_port=src.port;
    objectMessage.dest_object=dest.objectId();
    objectMessage.dest_port=dest.port;
    objectMessage.payload=data;
    return this.mRouter.route(objectMessage);
};

/**
 * @param {!Protocol.Object.ObjectMessage} msg 
*/
BaseDatagramLayer.prototype.receiveMessage=function(msg)  {
    connectionHandleReceiveSST(this.mRouter,
                            new EndPointSST(msg.source_object(), msg.source_port()),
                            new EndPointSST(msg.dest_object(), msg.dest_port()),
                            msg.payload);
};
BaseDatagramLayer.prototype.dispatcher=function() {
    return mDispatcher;
};

BaseDatagramLayer.prototype.getAvailablePort=function() {
    var len=this.mAvailablePorts.length;
    if (len) {
        var retval=this.mAvailablePorts[len-1];
        this.mAvailabePorts.length=len-1;
    }
    return this.mMinAvailablePorts++;
};
BaseDatagramLayer.prototype.releasePort=function(port) {
    if (port<=2048)
        return;
    if (port+1==this.mMinAvailablePorts) {
        --this.mMinAvailablePorts;
    }else {
        this.mAvailablePorts[this.mAvailablePorts.length]=port;
    }
};
BaseDatagramLayer.prototype.getAvailableChannel=function() {
    var len=this.mAvailableChannels.length;
    if (len) {
        var retval=this.mAvailableChannels[len-1];
        this.mAvailabeChannels.length=len-1;
    }
    return this.mMinAvailableChannels++;
};
BaseDatagramLayer.prototype.releaseChannel=function(channel) {
    if (channel+1==this.mMinAvailableChannels) {
        --this.mMinAvailableChannels;
    }else {
        this.mAvailableChannels[this.mAvailableChannels.length]=channel;
    }
};

var SUCCESS_SST=0;
var FAILURE_SST=-1;
/**
 * @param {Array} data
 * @param {PROTO.I64} channelSeqNum,
 * @param {PROTO.I64} ackSequenceNum
 */
function ChannelSegmentSST (data,channelSeqNum,ackSequenceNum){
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
}

/**
 * @param {Date} ackTime
 */
ChannelSegmentSST.prototype.setAckTime=function(ackTime) {
        this.mAckTime=ackTime;
};


/**
 * @param {!EndPointSST} localEndPoint 
 * @param {!EndPointSST} remoteEndPoint 
 */
function ConnectionSST(localEndPoint,remoteEndPoint){
    /**
     * @type {!EndPointSST}
     */
    this.mLocalEndPoint=localEndPoint;
    /**
     * @type {!EndPointSST}
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
    this.mTransmitSequenceNumber=PROTO.I64.fromNumber(1);
    /**
     * @type {!PROTO.I64}
     */
    this.mLastReceivedSequenceNumber=PROTO.I64.fromNumber(1);
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
    this.mRTOMilliseconds(1000);
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
     * @type{!BaseDatagramLayer}
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
     * @type {!KataDeque} Deque of ChannelSegmentSST
     */
    this.mQueuedSegments=new KataDeque();
    /**
     * @type {!KataDeque} Deque of ChannelSegmentSST
     */
    this.mOutstandingSegments=new KataDeque();
    
}

/**
 * @param {Protocol.SST.SSTChannelHeader} sstMsg 
 * @returns {boolean} whether send actually fires off a packet.
 */
ConnectionSST.prototype.sendSSTChannelPacket=function(sstMsg){
    if (this.mState==CONNECTION_DISCONNECTED_SST) return false;
    var buffer=sstMsg.SerializeToArray();
    return this.mDatagramLayer.send(this.mLocalEndPoint,this.mRemoteEndPoint,buffer);
};
/**
 * @param {Date} curTime
 * @returns {boolean}
 */
ConnectionSST.prototype.serviceConnection=function (curTime) {
    // should start from ssthresh, the slow start lower threshold, but starting
    // from 1 for now. Still need to implement slow start.
    if (this.mState == CONNECTION_DISCONNECTED_SST) return false;
    
    //firstly, service the streams
    for (it in this.mOutgoingSubstreamMap) 
    {    
      if ( (this.mOutgoingSubstreamMap[it].serviceStream(curTime)) == false) {
	      return false;///FIXME: is this correct?
      }
    }

    if (this.inSendingMode) {

      this.numSegmentsSent = 0;

      for (var i = 0; (!KataDequeEmpty(this.mQueuedSegments)) && i < this.mCwnd; i++) {
	      var segment = KataDequeFront(mQueuedSegments);

	      var sstMsg=new Protocol.SST.SSTChannelHeader();
	      sstMsg.set_channel_id( this.mRemoteChannelID );
	      sstMsg.set_transmit_sequence_number(segment.mChannelSequenceNumber);
	      sstMsg.set_ack_count(1);
	      sstMsg.set_ack_sequence_number(segment.mAckSequenceNumber);

	      sstMsg.set_payload(segment.mBuffer);

	      /*printf("%s sending packet from data sending loop to %s\n",
	       mLocalEndPoint.endPoint.readableHexData().c_str()
	       , mRemoteEndPoint.endPoint.readableHexData().c_str());*/
          
	      this.sendSSTChannelPacket(sstMsg);

	      segment.mTransmitTime = curTime;
	      KataDequePushBack(mOutstandingSegments,segment);

	      KataDequePopFront(mQueuedSegments);

	      this.numSegmentsSent++;

	      this.mLastTransmitTime = curTime;

	      this.inSendingMode = false;
      }
    }
    else {
      if ( (curTime.getTime() - this.mLastTransmitTime.getTime()) < this.mRTOMilliseconds)
      {
	      return true;
      }

      if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
	      return false;
      }

      var all_sent_packets_acked = true;
      var no_packets_acked = true;
      for (var i=0; i < mOutstandingSegments.size(); i++) {
          var segment = KataDequeIndex(mOutstandingSegments,i);

          if (segment.mAckTime == null) {
              all_sent_packets_acked = false;
          }
          else {
              no_packets_acked = false;
              if (this.mFirstRTO ) {
                  this.mRTOMilliseconds = ((segment.mAckTime.getTime() - segment.mTransmitTime.getTime())) ;
                  this.mFirstRTO = false;
              }
              else {
                  this.mRTOMilliseconds = CC_ALPHA_SST * mRTOMilliseconds +
                      (1.0-CC_ALPHA_SST) * (segment.mAckTime.getTime() - segment.mTransmitTime.getTime());
              }
          }
      }

      //printf("mRTOMicroseconds=%d\n", (int)mRTOMicroseconds);

      if (this.numSegmentsSent >= this.mCwnd) {
        if (all_sent_packets_acked) {
          this.mCwnd += 1;
        }
        else {
          this.mCwnd /= 2;
        }
      }
      else {
        if (all_sent_packets_acked) {
          this.mCwnd = (this.mCwnd + this.numSegmentsSent) / 2;
        }
        else {
          this.mCwnd /= 2;
        }
      }

      if (this.mCwnd < 1) {
        this.mCwnd = 1;
      }

      KataDequeClear(this.mOutstandingSegments);

      this.inSendingMode = true;
    }
    
    return true;
};

var sConnectionMapSST = {};



var MAX_DATAGRAM_SIZE_SST=1000;
var MAX_PAYLOAD_SIZE_SST=1300;
var MAX_QUEUED_SEGMENTS_SST=300;
var CC_ALPHA=0.8;

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

var CONNECTION_CONNECTED=4;           // The connection is connected to a remote end
                              // point.
var CONNECTION_PENDING_DISCONNECT=5;  // The connection is in the process of
                              // disconnecting from the remote end point.

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
 * @param {!EndPointSST} localEndPoint
 * @param {!EndPointSST} remoteEndPoint
 * @param {!function} cb the connection return callback if a connection is successful
 * @param {!function} scb the stream return callback function if a new stream appears
 * @returns false if it's not possible to create this connection, e.g. if another connection
 *     is already using the same local endpoint; true otherwise.
 */
function createConnectionSST(localEndPoint,remoteEndPoint,cb,scb){
    var endPointUid=localEndPoint.uid();
    if (endPointUid in sConnectionMapSST) {
        Kata.log("mConnectionMap.find failed for " +localEndPoint.uid());
        
        return false;
    }

    var conn =  new ConnectionSST(localEndPoint, remoteEndPoint);
    sConnectionMapSST[endPointUid] = conn;

    conn.setState(CONNECTION_PENDING_CONNECT_SST);


    var channelid=getAvailableChannel();
    var payload=[channelid&255,((channelid>>8)&255)];    

    conn.setLocalChannelID(channelid);
    conn.sendData(payload,false/*not an ack*/);

    sConnectionReturnCallbackMapSST[localEndPoint.uid()] = cb;

    return true;
}
/**
 * @param cb StreamReturnCallbackFunction void(int, boost::shared_ptr< Stream<UUID> )
 * @returns whether the listening port could be bound
 */
function connectionListenSST(cb,listeningEndPoint) {
    var retval=listenBaseDatagramLayerSST(listeningEndPoint);
    if (!retval)return false;
    var listeningEndPointId=listeningEndPoint.uid();
    if (listeningEndPointId in sListeningConnectionsCallbackMapSST){
        return false;
    }
    sListeningConnectionsCallbackMapSST[listeningEndPointId]=cb;
    return true;
}
/**
 * FIXME actually allow reuse
 */
ConnectionSST.prototype.getNewLSID=function(){
    return ++this.mNumStreams;
};
ConnectionSST.prototype.releaseLSID=function(lsid){
    
};

/**
 * @param {!number} port 16 bit port on which to listen
 * @param {function} scb StreamReturnCallbackFunction == void(int, boost::shared_ptr< Stream<UUID> >)
 */
ConnectionSST.prototype.listenStream=function(port,scb){
  this.sListeningStreamsCallbackMap[port]=scb;
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


ConnectionSST.prototype.stream=function (cb, initial_data, 
                      local_port, remote_port, parentLSID) {
    if (parentLSID===undefined){
        parentLSID=0;
    }
    var usid = Math.uuid();
    var lsid = this.getNewLSID();

    var stream = new Stream(parentLSID, this, local_port, remote_port,  usid, lsid,
				            initial_data, false, 0, cb);

    this.mOutgoingSubstreamMap[lsid]=stream;
    return stream;
};

function streamHeaderTypeIsAckSST(data){
    var stream_msg = new Protocol.SST.SSTStreamHeader();
    var parsed = stream_msg.ParseFromArray(data);
    return stream_msg.type==Protocol.SST.SSTStreamHeader.ACK;
}
var ONE64BITSST=new PROTO.I64.fromNumber(1);
var ZERO64BITSST=new PROTO.I64.fromNumber(0);
/**
 * @param {Array} data Array of uint8 data
 * @returns {PROTO.I64} sequence number of sent data
 */
ConnectionSST.prototype.sendData=function(data, sstStreamHeaderTypeIsAck){

    if (data.length > MAX_PAYLOAD_SIZE_SST){
        Kata.log("Data longer than MAX_PAYLOAD_SIZE OF "+MAX_PAYLOAD_SIZE_SST);
    }
    if (sstStreamHeaderTypeIsAck===undefined){
        Kata.log("sendData not setting whether it is an ack");
    }
 
    var transmitSequenceNumber =  this.mTransmitSequenceNumber;

    var pushedIntoQueue = false;

    if ( !sstStreamHeaderTypeIsAck ) {
      if (KataDequeLength(this.mQueuedSegments) < MAX_QUEUED_SEGMENTS_SST) {
	      KataDequePushBack(mQueuedSegments,new ChannelSegment(data,
                                                               length,
                                                               this.mTransmitSequenceNumber,
                                                               this.mLastReceivedSequenceNumber) );
	      pushedIntoQueue = true;
      }
    }
    else {
      var sstMsg=new Protocol.SST.SSTChannelHeader();
      sstMsg.channel_id= mRemoteChannelID;
      sstMsg.transmit_sequence_number=this.mTransmitSequenceNumber;
      sstMsg.ack_count=1;
      sstMsg.ack_sequence_number=this.mLastReceivedSequenceNumber;

      sstMsg.payload=data;

      this.sendSSTChannelPacket(sstMsg);
    }

    this.mTransmitSequenceNumber=this.mTransmitSequenceNumber.unsigned_add(ONE64BITSST);

    return transmitSequenceNumber;
};

ConnectionSST.prototype.setState=function(state) {
    this.mState=state;
};

/**
 * @param {number} channelID 
 */
ConnectionSST.prototype.setLocalChannelID=function(channelID) {
    this.mLocalChannelID = channelID;
};

/**
 * @param {number} channelID 
 */
ConnectionSST.prototype.setRemoteChannelID=function(channelID) {
    this.mRemoteChannelID = channelID;
};

/**
 * @param {PROTO.I64} receivedAckNum
 * @returns {boolean} if the item was found
 */
ConnectionSST.prototype.markAcknowledgedPacket=function(receivedAckNum){
    var len=KataDequeLength(this.mOutstandingSegments);
    for (var i = 0; i < len; i++) {
        var segment=KataDequeIndex(mOutstandingSegments,i);
        if (segment.mChannelSequenceNumber.equals(receivedAckNum)) {
	        segment.mAckTime = new Date();
            return true;
        }
    }
    return false;
};

/**
 * @param {Array} recv_buff the data  to be received
 */
ConnectionSST.prototype.receiveMessage=function(recv_buff) {

    var received_msg = new Protocol.SST.SSTChannelHeader();
    var parsed = received_msg.ParseFromArray(recv_buff);

    this.mLastReceivedSequenceNumber = received_msg.transmit_sequence_number;

    var receivedAckNum = received_msg.ack_sequence_number;

    markAcknowledgedPacket(receivedAckNum);

    if (this.mState == CONNECTION_PENDING_CONNECT_SST) {
        this.mState = CONNECTION_CONNECTED_SST;
        
        var originalListeningEndPoint=new EndPointSST(this.mRemoteEndPoint.endPoint, this.mRemoteEndPoint.port);
        
        setRemoteChannelID(received_msg.payload.data[0]+received_msg.payload.data[1]*256);
        
        this.mRemoteEndPoint.port = received_msg.payload.data[2]+received_msg.payload.data[3]*256;
        
        this.sendData( [], false/*not an ack*/ );
        var localEndPointId=this.mLocalEndPoint.uid();
        var connectionCallback=sConnectionReturnCallbackMapSST[localEndPointId];
        if (connectionCallback)
        {
            var conn=this.sConnectionMapSST[localEndPointId];
	        if (conn) {
	            connectionCallback(SUCCESS_SST, conn);
	        }else {
                Kata.log("Failed to call connection callback because conn for "+localEndPointId+"is notin map ");
            }
            delete sConnectionReturnCallbackMapSST[localEndPointId];
        }
    }
    else if (this.mState == CONNECTION_PENDING_RECEIVE_CONNECT_SST) {
      this.mState = CONNECTION_CONNECTED_SST;
    }
    else if (this.mState == CONNECTION_CONNECTED_SST) {
        if (received_msg.payload.length > 0) {
	        this.parsePacket(received_msg);
        }
    }
};
/**
 * @param{!Protcol.SST.SSTChannelHeader} received_channel_msg
 */
ConnectionSST.prototype.parsePacket=function(received_channel_msg) {

    var received_stream_msg = new Protocol.SST.SSTStreamHeader();
    
    var parsed = received_stream_msg.ParseFromArray(received_channel_msg.payload);


    if (received_stream_msg.type == Protocol.SST.SSTStreamHeader.INIT) {
      this.handleInitPacket(received_stream_msg);
    }
    else if (received_stream_msg.type == Protocol.SST.SSTStreamHeader.REPLY) {
      this.handleReplyPacket(received_stream_msg);
    }
    else if (received_stream_msg.type == Protocol.SST.SSTStreamHeader.DATA) {
      this.handleDataPacket(received_stream_msg);
    }
    else if (received_stream_msg.type == Protocol.SST.SSTStreamHeader.ACK) {
      this.handleAckPacket(received_channel_msg, received_stream_msg);
    }
    else if (received_stream_msg.type == Protocol.SST.SSTStreamHeader.DATAGRAM) {
      this.handleDatagram(received_stream_msg);
    }
};
/**
 * @param {!Protocol.SST.SSTStreamHeader} received_stream_msg
 * @returns {string} a textual description of the header
 */
ConnectionSST.prototype.headerToStringDebug=function(received_stream_msg) {
    return "Source Port:"+recevied_stream_msg.source_port+" Dest Port:"+received_stream_msg.dest_port+" LSID:"+received_stream_msg.lsid;
};

/**
 * @param {!Protocol.SST.SSTStreamHeader} received_stream_msg
 */
ConnectionSST.prototype.handleInitPacket=function (received_stream_msg) {
    var incomingLsid = received_stream_msg.lsid;
    
    if (!(incomingLsid in this.mIncomingSubstreamMap)){
        var listeningStreamsCallback=this.mListeningStreamsCallbackMap[received_stream_msg.dest_port];
      if (listeningStreamsCallback)
      {
        //create a new stream
        var usid = Math.uuid();
        var newLSID = this.getNewLSID();

        var stream = new Stream (received_stream_msg.psid, this,
                                     received_stream_msg.dest_port,
                                     received_stream_msg.src_port,
                                     usid, newLSID,
                                     null, 0, true, incomingLsid, null);
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
    }
};

/**
 * @param {!Protocol.SST.SSTStreamHeader} received_stream_msg
 */
ConnectionSST.prototype.handleReplyPacket=function(received_stream_msg) {
    var incomingLsid = received_stream_msg.lsid;
    
    if (!this.mIncomingSubstreamMap[incomingLsid]) {
      var initiatingLSID = received_stream_msg.rsid;
      var outgoingSubstream=this.mOutgoingSubstreamMap[initiatingLSID];
      if (outgoingSubstream) {
          var stream = outgoingSubstream;
          this.mIncomingSubstreamMap[incomingLsid] = stream;

        if (stream.mStreamReturnCallback){
          stream.mStreamReturnCallback(SUCCESS, stream);
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
 * @param {!Protocol.SST.SSTStreamHeader} received_stream_msg
 */

ConnectionSST.prototype.handleDataPacket=function(received_stream_msg) {
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
 * @param {!Protocol.SST.SSTChannelHeader} received_channel_msg
 * @param {!Protocol.SST.SSTStreamHeader} received_stream_msg
 */
ConnectionSST.prototype.handleAckPacket=function(received_channel_msg,
		                                      received_stream_msg) 
{
    //printf("ACK received : offset = %d\n", (int)received_channel_msg->ack_sequence_number() );
    var incomingLsid = received_stream_msg.lsid;
    var stream_ptr=this.mIncomingSubstreamMap[incomingLsid];  
    if (stream_ptr) {

      stream_ptr.receiveData( received_stream_msg,
			       received_stream_msg.payload,
			       received_channel_msg.ack_sequence_number());
    }
};

/**
 * @param {!Protocol.SST.SSTStreamHeader} received_stream_msg
 */
ConnectionSST.prototype.handleDatagram=function(received_stream_msg) {
    var payload = received_stream_msg.payload;

    var dest_port = received_stream_msg.dest_port;

    var datagramCallbacks;

    if (dest_port in this.mReadDatagramCallbacks) {
      datagramCallbacks = this.mReadDatagramCallbacks[dest_port];
    }
    var len=datagramCallbacks.length;
    for (var i=0 ; i < len; i++) {
      datagramCallbacks[i](payload);
    }

    var sstMsg=new Protocol.SST.SSTChannelHeader();
    sstMsg.channel_id= mRemoteChannelID ;
    sstMsg.transmit_sequence_number=mTransmitSequenceNumber;
    sstMsg.ack_count=1;
    sstMsg.ack_sequence_number=mLastReceivedSequenceNumber;

    this.sendSSTChannelPacket(sstMsg);

    this.mTransmitSequenceNumber=this.mTransmitSequenceNumber.unsigned_add(ONE64BITSST);
};

/**
 * FIXME: how do you get this thing called?!
 */
ConnectionSST.prototype.finalize=function() {
    //printf("Connection on %s getting destroyed\n", mLocalEndPoint.endPoint.readableHexData().c_str());

    mDatagramLayer.dispatcher().unregisterObjectMessageRecipient(this.mLocalEndPoint.port, this);


    if (this.mState != CONNECTION_DISCONNECTED) {
      // Setting mState to CONNECTION_DISCONNECTED implies close() is being
      //called from the destructor.
      this.mState = CONNECTION_DISCONNECTED;
      this.close(true);


    }
};
/**
 * FIXME: is this correct shutdown procedure?
 */
function closeConnectionsSST() {
  sConnectionMapSST={};  
};

function serviceConnectionsSST() {
    var curTime = new Date();

    for (it in smConnectionMapSST)
    {
      var conn = sConnectionMapSST[it];
      var connState = conn.mState;

      var keepConnection = conn.serviceConnection(curTime);

      if (!keepConnection) {

        if (connState == CONNECTION_PENDING_CONNECT_SST) {
          var localEndPointId=conn.mLocalEndPoint.uid();
          var cb = mConnectionReturnCallbackMap[localEndPointId];

          mConnectionReturnCallbackMap.erase(conn.mLocalEndPoint.uid());

          delete sConnectionMapSST[it];//FIXME does this invalidate map?

          cb(FAILURE_SST, conn);
        }
        conn.finalize();//FIXME Is this correct??
        break;//FIXME: must we break?
      }
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
ConnectionSST.prototype.datagram=function(data, local_port, remote_port,cb) {
    var currOffset = 0;

    if (this.mState == CONNECTION_DISCONNECTED_SST
     || this.mState == CONNECTION_PENDING_DISCONNECT_SST)
    {
      if (cb) {
        cb(FAILURE, data);
      }
      return false;
    }

    var lsid = this.getNewLSID();
    var length=data.length;
    while (currOffset < length) {
      var buffLen = (length-currOffset > MAX_PAYLOAD_SIZE_SST) ?
	            MAX_PAYLOAD_SIZE_SST :
           	    (length-currOffset);

      var sstMsg=new Protocol.SST.SSTStreamHeader();
      sstMsg.lsid= lsid ;
      sstMsg.type=Protocol.SST.SSTStreamHeader.DATAGRAM;
      sstMsg.flags=0;        
      sstMsg.window=10;
      sstMsg.src_port=local_port;
      sstMsg.dest_port=remote_port;

      sstMsg.payload=data.slice(currOffset,currOffset+buffLen);

      var buffer = sstMsg.SerializeToArray();
      this.sendData(  buffer, false/*not an ack*/ );

      currOffset += buffLen;
    }

    if (cb) {
      //invoke the callback function
      cb(SUCCESS, data);
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
ConnectionSST.prototype.registerReadDatagramCallback=function(port, cb) {
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
ConnectionSST.prototype.registerReadOrderedDatagramCallback=function( cb )  {
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
ConnectionSST.prototype.close=function( force) {
    /* (this.mState != CONNECTION_DISCONNECTED_SST) implies close() wasnt called
       through the destructor. */
    if (this.mState != CONNECTION_DISCONNECTED_SST) {
      delete sConnectionMapSST[mLocalEndPoint.uid()];
    }

    if (force) {
      this.mState = CONNECTION_DISCONNECTED;
    }
    else  {
      this.mState = CONNECTION_PENDING_DISCONNECT;
    }
  };

/**
 *  @param {!EndPointSST} remoteEndPoint
 *  @param {!EndPointSST} localEndPoint 
 *  @param {!Array} recvBuffer
 */
function connectionHandleReceiveSST(datagramLayer, remoteEndPoint,localEndPoint,recvBuffer){

    var received_msg = new Protocol.SST.SSTChannelHeader();
    var parsed = received_msg.ParseFromArray(recvBuffer);

    var channelID = received_msg.channel_id;
    var localEndPointId=localEndPoint.uid();
    var whichLocalConnection=sConnectionMapSST[localEndPointId];
    if (whichLocalConnection) {
      if (channelID == 0) {
              /*Someone's already connected at this port. Either don't reply or
               send back a request rejected message. */
          
              Kata.log("Someone's already connected at this port on object " 
                   + localEndPoint.endPoint.uid());
              return;
      }
      
      whichLocalConnection.receiveParsedMessage(parsed);
    }
    else if (channelID == 0) {
      /* it's a new channel request negotiation protocol
         packet ; allocate a new channel.*/
        var listeningConnection=sListeningConnectionsCallbackMapSST[localEndPointId];
        if (listeningConnection) {
            var received_payload = received_msg.payload;

            var availableChannel=datagramLayer.getAvailableChannel();
            var availablePort=datagramLayer.getAvailablePort();

            var newLocalEndPoint=new EndPointSST(localEndPoint.endPoint, 
                                              availablePort);
            var conn = new ConnectionSST(newLocalEndPoint, remoteEndPoint);

                conn.listenStream(newLocalEndPoint.port,
                              sListeningConnectionsCallbackMap[localEndPoint]);
            sConnectionMapSST[newLocalEndPoint.uid()] = conn;

            conn.setLocalChannelID(availableChannel);
            conn.setRemoteChannelID(received_payload[0]+received_payload[1]*256);
            conn.setState(CONNECTION_PENDING_RECEIVE_CONNECT_SST);
            
            conn.sendData([availableChannel&255,
                           (availableChannel>>8)&255,
                           availablePort&255,
                           (availablePort>>8)&255],false/*not an ack*/);
      }
      else {
        Kata.log("No one listening on this connection\n"+localEndpointId);
      }
    }
}

function StreamBuffer (data, offset) {
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
}

var MAX_PAYLOAD_SIZE_STREAM=1000;
var MAX_QUEUE_LENGTH_STREAM=4000000;
var MAX_RECEIVE_WINDOW_STREAM=15000;
var FL_ALPHA_STREAM=0.8;
var INV_FL_ALPHA_STREAM=1.0-FL_ALPHA_STREAM;
var MAX_INIT_RETRANSMISSIONS_STREAM=5;
var DISCONNECTED_STREAM_SST = 1;
var CONNECTED_STREAM_SST=2;
var PENDING_DISCONNECT_STREAM_SST=3;
var PENDING_CONNECT_STREAM_SST=4;

var sStreamReturnCallbackMapSST={};

/**
 * @param {!EndPointSST} localEndPoint
 * @param {!EndPointSST} remoteEndPoint
 * @param {function} cb StreamReturnCallbackFunction ==  void(int, boost::shared_ptr< Stream<UUID> >)
 * @returns bool whether the stream can connect
 */
function connectStreamSST(localEndPoint,remoteEndPoint,cb) {
    var localEndPointId=localEndPoint.uid();
    if (sStreamReturnCallbackMap[localEndPointId]) {
        return false;
    }
    sStreamReturnCallbackMap[localEndPointId]=cb;
    
    return createConnectionSST(localEndPoint,remoteEndPoint,connectionCreatedSST,cb);
}


  /**
    Start listening for top-level streams on the specified end-point. When
    a new top-level stream connects at the given endpoint, the specified
    callback function is invoked handing the object a top-level stream.
    @param cb the callback function invoked when a new stream is created
    @param {EndPointSST} listeningEndPoint the endpoint where SST will accept new incoming
           streams.
    @return false, if its not possible to listen to this endpoint (e.g. if listen
            has already been called on this endpoint); true otherwise.
  */
  function listenStreamSST(cb, listeningEndPoint) {
    return connectionListenSST(cb, listeningEndPoint);
  }


/**
 * @param {number} parentLSID
 * @param {!ConnectionSST} conn
 * @param {number} local_port
 * @param {number} remote_port
 * @param {string} usid 
 * @param {number} lsid
 * @param {Array} initial_data
 * @param {boolean} remotelyInitiated
 * @param {number} remoteLSID
 * @param {function} cb StreamReturnCallbackFunction ==  void(int, boost::shared_ptr< Stream<UUID> >)
 */
function StreamSST (parentLSID, conn,
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
     * @type {number} lower stream uint16 id for parent stream
     */
    this.mParentLSID=parentLSID;
    /**
     * @type {ConnectionSST}
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
    this.mStreamRTOMilliseconds=200;
    /**
     * @type {number}
     */
    this.mTransmitWindowSize=MAX_RECEIVE_WINDOW_STREAM;
    /**
     * @type {number}
     */
    this.mReceiveWindowSize=MAX_RECEIVE_WINDOW_STREAM;
    /**
     * @type {number}
     */
    this.mNumOutstandingBytes=0;
    /**
     * @type {number}
     */
    this.mNextByteExpected=0;
    /**
     * @type {number}
     */
    this.mLastContiguousByteReceived=-1;
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

    
    if (initialData) {
        if (initial_data.length<=MAX_PAYLOAD_SIZE_STREAM) {
            this.mInitialData=initialData;
        }else{
            this.mInitialData=initialData.slice(0,MAX_PAYLOAD_SIZE_STREAM);
        }
    }else {
        this.mInitialData=[];
    }
/**
 * @type {Array} of uint8
 */
    this.mReceiveBuffer=new Array(mReceiveWindowSize);
/**
 * @type {Array} of boolean whether the data is there
 */
    this.mReceiveBitmap=new Array(mReceiveWindowSize);
/**
 * @type {!KataDeque} deque of StreamBuffer data that is queued
 */
    this.mQueuedBuffers=new KataDeque();

    /**
     * @type {Hash} FIXME maps int64 to buffer.... need to carefully consider int64
     */
    this.mChannelToBufferMap={};
    
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
    this.mNumBytesSent=mInitialDataLength;
    if (initial_data.length>this.mInitialData.length){
        this.write(initial_data.slice(this.mInitialData.length,initial_data.length));
    }
}


StreamSST.prototype.finalize=function() {
    this.close(true);
};


  /**
    Start listening for child streams on the specified port. A remote stream
    can only create child streams under this stream if this stream is listening
    on the port specified for the child stream.
    @param {function} scb the callback function invoked when a new stream is created
    @param {number} port the endpoint where SST will accept new incoming
           streams.
  */
StreamSST.prototype.listenSubstream=function(port, scb) {
    this.mConnection.listenStream(port, scb);
};




  /** Writes data bytes to the stream. If not all bytes can be transmitted
     immediately, they are queued locally until ready to transmit.
     @param {Array} data the buffer containing the bytes to be written
     @return the number of bytes written or enqueued, or -1 if an error
             occurred
  */
StreamSST.prototype.write=function(data) {
    if (this.mState == DISCONNECTED || this.mState == PENDING_DISCONNECT) {
      return -1;
    }

    var count = 0;



    if (len <= MAX_PAYLOAD_SIZE_STREAM) {
      if (this.mCurrentQueueLength+len > MAX_QUEUE_LENGTH_STREAM) {
        return 0;
      }
      KataDequePushBack(this.mQueuedBuffers,new StreamBuffer(data, data.length, this.mNumBytesSent));
      this.mCurrentQueueLength += len;
      this.mNumBytesSent += len;

      return len;
    }
    else {
      var currOffset = 0;
      while (currOffset < len) {
        var buffLen = (len-currOffset > MAX_PAYLOAD_SIZE_STREAM) ?
                      MAX_PAYLOAD_SIZE_STREAM :
                      (len-currOffset);

        if (this.mCurrentQueueLength + buffLen > MAX_QUEUE_LENGTH_STREAM) {
          return currOffset;
        }

        KataDequePushBack(this.mQueuedBuffers.push_back,new StreamBuffer(data.slice(currOffset, curOffset+buffLen), this.mNumBytesSent));
        currOffset += buffLen;
        this.mCurrentQueueLength += buffLen;
        this.mNumBytesSent += buffLen;

        count++;
      }


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
  StreamSST.prototype.registerReadCallback=function( ReadCallback) {
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
StreamSST.prototype.close=function(force) {
    if (force) {
      this.mConnected = false;
      this.mState = DISCONNECTED;
      return true;
    }
    else if (this.mState!=DISCONNECTED) {
      this.mState = PENDING_DISCONNECT;
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
 StreamSST.prototype.setPriority=function(pri) {

 };

  /**Returns the stream's current priority level.
    @return the stream's current priority level
  */
StreamSST.prototype.priority=function() {
    return 0;
}

  /** Returns the top-level connection that created this stream.
     @return a pointer to the connection that created this stream.
  */
StreamSST.prototype.connection=function() {
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
StreamSST.prototype.createChildStream=function (cb, data,local_port,remote_port)
  {
    this.mConnection.stream(cb, data, length, local_port, remote_port, mParentLSID);
  };

  /**
    Returns the local endpoint to which this connection is bound.

    @return the local endpoint.
  */
StreamSST.prototype.localEndPoint=function()  {
    return new EndPointSST(this.mConnection.localEndPoint().endPoint, this.mLocalPort);
};

  /**
    Returns the remote endpoint to which this connection is bound.

    @return the remote endpoint.
  */
this.StreamSST.prototype.remoteEndPoint=function()  {
    return new EndPointSST(this.mConnection.remoteEndPoint().endPoint, this.mRemotePort);
};

////Private Functions
/**
 * @param {number} errCode
 * @param {!ConnectionSST} c
 */
function connectionCreatedStreamSST( errCode, c) {
    //boost::mutex::scoped_lock lock(mStreamCreationMutex.getMutex());
    var localEndPoint=c.localEndPoint();
    var localEndPointId=localEndPoint.uid();
    if (errCode != SUCCESS_SST) {


        
      var cb = this.mStreamReturnCallbackMap[localEndPointId];
      delete this.mStreamReturnCallbackMap[localEndPointId];

      cb(FAILURE_SST, null );

      return;
    }
    
    if(!sStreamReturnCallbackMapSST[localEndPointId]){
        Kata.log("Fatal error");
    }
    //Empty array? the original code has some sort of pointless loop on 1505 that makes an array of size 0
    c.stream(sStreamReturnCallbackMap[localEndPointId], new Array() , 
	      localEndPoint.port, c.remoteEndPoint().port);

    delete mStreamReturnCallbackMap[localEndPointId];
  }

function PROTOI64Hash(i64){
    if(i64.sign!=1) {
        return i64.sign+":"+i64.msw+"_"+i64.lsw;
    }
    return i64.msw+"_"+i64.lsw;
}
function PROTOI64Equals(a,b){
    return a.sign==b.sign&&a.msw==b.msw&&a.lsw==b.lsw;
}
/**
 * @param {Date} curTime 
 */
StreamSST.prototype.serviceStream=function(curTime) {
    if (this.mState != CONNECTED_STREAM_SST && this.mState != DISCONNECTED_STREAM_SST) {

      if (!this.mConnected && this.mNumInitRetransmissions < MAX_INIT_RETRANSMISSIONS_STREAM ) {
        if ( this.mLastSendTime && (curTime.getTime() - this.mLastSendTime.getTime()) < 2*mStreamRTOMilliseconds) {
          return true;
        }

        this.sendInitPacket(mInitialData);

        this.mLastSendTime = curTime;

        this.mNumInitRetransmissions++;
        this.mStreamRTOMilliseconds = (this.mStreamRTOMilliseconds * 2);
        return true;
      }

      this.mInitialDataLength = 0;

      if (!this.mConnected) {
        delete sStreamReturnCallbackMap[mConnection.localEndPoint().uid()];

        // If this is the root stream that failed to connect, close the
        // connection associated with it as well.
        if (this.mParentLSID == 0) {
           this.mConnection.close(true);
        }

        //send back an error to the app by calling mStreamReturnCallback
        //with an error code.
        this.mStreamReturnCallback(FAILURE_SST, null );

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
            this.mState = DISCONNECTED;

            return true;
        }

        while ( !KataDequeEmpty(this.mQueuedBuffers) ) {
          var buffer = KataDequeFront(this.mQueuedBuffers);

          if (this.mTransmitWindowSize < buffer.mBuffer.length) {
            break;
          }

          var channelID = sendDataPacket(buffer.mBuffer,
                                         buffer.mOffset);

          buffer.mTransmitTime = curTime;
          var key=PROTOI64Hash(channelID);
          if ( !this.mChannelToBufferMap[key]) {
            this.mChannelToBufferMap[key] = buffer;
          }

          KataPopFront(this.mQueuedBuffers);
          this.mCurrentQueueLength -= buffer.mBuffer.length;
          this.mLastSendTime = curTime;

          if(buffer.mBuffer.length > this.mTransmitWindowSize){
              Kata.log("Failure: buffer length "+buffer.mBuffer.length+"is greater than trasmitwindow size"+this.mTransmitWindowSize);
          }
          this.mTransmitWindowSize -= buffer.mBufferLength;
          this.mNumOutstandingBytes += buffer.mBufferLength;
        }
      }
    }

    return true;
  };

StreamSST.prototype.resendUnackedPackets=function() {

    for(var it in this.mChannelToBufferMap)
    {
        var buffer=this.mChannelToBufferMap[it];
        var bufferLength=buffer.mBuffer.length;
        KataPushFront(this.mQueuedBuffers,buffer);
        this.mCurrentQueueLength += bufferLength;

        //printf("On %d, resending unacked packet at offset %d:%d\n", (int)mLSID, (int)it->first, (int)(it->second->mOffset));

        if (this.mTransmitWindowSize < bufferLength){
          if (bufferLength <= 0){
              Kata.log("Assertion failed: channelbuffer must have size >0");
          }
          this.mTransmitWindowSize = bufferLength;//prevent silly window size?
        }
     }
     var channelToBufferMapEmpty=mapEmpty(this.mChannelToBufferMap);
     if (channelToBufferMapEmpty && !KataDequeEmpty(this.mQueuedBuffers)) {
       var buffer = KataDequeFront(this.mQueuedBuffers);

       if (this.mTransmitWindowSize < bufferLength) {
         this.mTransmitWindowSize = bufferLength;
       }
     }

     this.mNumOutstandingBytes = 0;

     if (!channelToBufferMapEmpty) {
       this.mStreamRTOMilliseconds *= 2;
       this.mChannelToBufferMap={};
     }
  };

  /** This function sends received data up to the application interface.
     mReceiveBufferMutex must be locked before calling this function. 
   @param {number} skipLength
 */
StreamSST.prototype.sendToApp=function(skipLength) {
    var readyBufferSize = skipLength;

    for (var i=skipLength; i < MAX_RECEIVE_WINDOW_SST; i++) {
      if (this.mReceiveBitmap[i] == 1) {
        readyBufferSize++;
      }
      else if (this.mReceiveBitmap[i] == 0) {
        break;
      }
    }

    //pass data up to the app from 0 to readyBufferSize;
    //
    if (this.mReadCallback && readyBufferSize > 0) {
      this.mReadCallback(this.mReceiveBuffer, readyBufferSize);

      //now move the window forward...
      this.mLastContiguousByteReceived = mLastContiguousByteReceived.unsigned_add(PROTO.I64.fromNumber(readyBufferSize));
      this.mNextByteExpected = mLastContiguousByteReceived.unsigned_add(ONE64BITSST);

      memset(mReceiveBitmap, 0, readyBufferSize);
      memmove(mReceiveBitmap, mReceiveBitmap + readyBufferSize, MAX_RECEIVE_WINDOW - readyBufferSize);
      memmove(mReceiveBuffer, mReceiveBuffer + readyBufferSize, MAX_RECEIVE_WINDOW - readyBufferSize);

      this.mReceiveWindowSize += readyBufferSize;
    }
  };

/**
 * @param {!Protocol.SST.SSTStreamHeader} streamMsg
 * @param {Array} buffer
 * @param {!PROTO.I64} offset
 */
StreamSST.prototype.receiveData=function(streamMsg,
                    buffer, offset )
  {
    if (streamMsg.type == Protocol.SST.SSTStreamHeader.REPLY) {
      this.mConnected = true;
    }
    else if (streamMsg.type == Protocol.SST.SSTStreamHeader.ACK) {
      var offsetHash=PROTOI64Hash(offset);
      var channelBuffer=this.mChannelToBufferMap[offset];
      if (channelBuffer) {
        var dataOffset = channelBuffer.mOffset;
        this.mNumOutstandingBytes -= channelBuffer.mBuffer.length;

        channelBuffer.mAckTime = new Date();

        this.updateRTO(channelBuffer.mTransmitTime, channelBuffer.mAckTime);

        if ( Math.pow(2.0, streamMsg.window) - mNumOutstandingBytes >= 0.5 ) {
          this.mTransmitWindowSize = Math.round(pow(2.0, streamMsg.window) - mNumOutstandingBytes);
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
          if (this.mChannelToBufferMap[it].mOffset == dataOffset) {
            channelOffsets.push(it);
          }
        }

        for (var i=0; i< channelOffsets.length; i++) {
          delete this.mChannelToBufferMap[channelOffsets[i]];
        }
      }else {
          Kata.log("unknown packet corresponding to offset "+offsetHash+" not found in map");
      }
    }
    else if (streamMsg.type == Protocol.SST.SSTStreamHeader.DATA || streamMsg.type == Protocol.SST.SSTStreamHeader.INIT) {

      if ( pow(2.0, streamMsg.window) - this.mNumOutstandingBytes < .5){
          Kata.log("Assertion failed: 2^"+streamMsg.window+" <= "+this.mNumOutstandingBytes);
      }
      this.mTransmitWindowSize = round(pow(2.0, streamMsg.window) - this.mNumOutstandingBytes);

      //printf("offset=%d,  mLastContiguousByteReceived=%d, mNextByteExpected=%d\n", (int)offset,  (int)mLastContiguousByteReceived, (int)mNextByteExpected);

      if ( PROTOI64Equals(offset,this.mNextByteExpected)) {
        var offsetInBuffer = (offset.sub(mLastContiguousByteReceived)).lsw-1;//duplicate code in else
        if (offsetInBuffer + buffer.length <= MAX_RECEIVE_WINDOW) {
            var len=buffer.length;
            this.mReceiveWindowSize -= len;
            for (var i=0;i<len;++i) {
                var loc=offsetInBuffer+i;
                this.mReceiveBuffer[loc]=buffer[i];
                this.mReceiveBitmap[loc]=1;
            }

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
        var offsetInBuffer = (offset.sub(mLastContiguousByteReceived)).lsw-1;//duplicate code in if
        
        //std::cout << offsetInBuffer << "  ,  " << offsetInBuffer+len << "\n";
        var lastByteInBuffer=offset.add(PROTO.I64.fromNumber(len-1));
        var byteDifference=this.mLastContiguousByteReceived.sub(lastByteInBuffer);
        if ( byteDifference.sign>=0 ) {
          Kata.log("Acking packet which we had already received previously\n");
          sendAckPacket();
        }
        else if (offsetInBuffer + len <= MAX_RECEIVE_WINDOW) {
          if (offsetInBuffer + len <= 0){
              Kata.log("Assertion failed: Offset in buffer "+offsetInBuffer+"+"+len+"<=0");
          }

          this.mReceiveWindowSize -= len;

          for (var i=0;i<len;++i) {
              var loc=offsetInBuffer+i;
              this.mReceiveBuffer[loc]=buffer[i];
              this.mReceiveBitmap[loc]=1;
          }

          this.sendAckPacket();
        }
        else {
          //dont ack this packet.. its falling outside the receive window.
          this.sendToApp(0);
        }
      }
    }
  };
/**
 * @param {Date} sampleStartTime
 * @param {Date} sampleEndTime
 */
StreamSST.prototype.updateRTO=function(){
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

      this.mStreamRTOMilliseconds = FL_ALPHA_STREAM * this.mStreamRTOMilliseconds +
        (INV_FL_ALPHA_STREAM) * (set-sst);
    }
  };
}();
/**
 * @param {Array} data
 */
StreamSST.prototype.sendInitPacket = function(data) {
    //std::cout <<  mConnection.lock()->localEndPoint().endPoint.toString()  << " sending Init packet\n";

    var sstMsg=new Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID;
    sstMsg.type=Protocol.SST.SSTStreamHeader.INIT;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    sstMsg.psid=this.mParentLSID;

    sstMsg.bsn=0;

    sstMsg.payload=data;

    var buffer = sstMsg.SerializeToArray();
    this.mConnection.sendData( buffer , false /*Not an ack*/ );
  }

StreamSST.prototype.sendAckPacket=function() {
    var sstMsg= new Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Protocol.SST.SSTStreamHeader.ACK;
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
StreamSST.prototype.sendDataPacket=function( data, offset) {
    var sstMsg= new Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Protocol.SST.SSTStreamHeader.DATA;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    sstMsg.bsn=offset;

    sstMsg.payload=data;

    var buffer = sstMsg.SerializeToArray();
    this.mConnection.sendData(  buffer, false/*not an ack packet!*/);
  };

/**
 * @param {Array} data
 * @param {number} remoteLSID remote Stream ID
 */
StreamSST.prototype.sendReplyPacket=function(data, remoteLSID) {
    //printf("Sending Reply packet\n");

    var sstMsg= new Protocol.SST.SSTStreamHeader();
    sstMsg.lsid= this.mLSID ;
    sstMsg.type=Protocol.SST.SSTStreamHeader.REPLY;
    sstMsg.flags=0;
    sstMsg.window= Math.log(this.mReceiveWindowSize)/Math.log(2.0);
    sstMsg.src_port=this.mLocalPort;
    sstMsg.dest_port=this.mRemotePort;

    sstMsg.rsid=remoteLSID;
    sstMsg.bsn=0;

    sstMsg.payload=data;

    var buffer = sstMsg.SerializeToArray();
    this.mConnection.sendData(  buffer, false/*not an ack packet!*/);
  };
