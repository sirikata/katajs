"use strict";

function SSTDatagram() {
    this.dispatcher = new Kata.SST.ObjectMessageDispatcher;
};
Kata.require([
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','katajs/oh/sst/SSTImpl.js'],
    'katajs/core/Math.uuid.js'
], function() {

function print(str) {
    console.log.call(console, arguments);
    var text = document.createTextNode(str);
    var br = document.createElement("br");
    document.body.appendChild(text);
    document.body.appendChild(br);
}

function TestObjectMessageRouter(targetEndpoint, targetDispatcher) {
    this.mDispatcher = targetDispatcher;
    this.mTargetEndpoint = targetEndpoint;
};

TestObjectMessageRouter.prototype.route = function(msg) {
    //getConnectionSST(this.mTargetEndpoint).receiveMessage(msg);
    console.log("Routing to "+this.mTargetEndpoint+"\n", msg);
    this.mDispatcher.dispatchMessage(msg);
};
SSTDatagram.prototype.establishedConnection = function(error, stream) {
    print("established, error = "+error+"\n", stream);
    stream.datagram([2,7,1,8,2,8,1,8]);
    var t = this;
    var INCR=30;
    var cb=function(){SSTDatagram.prototype.receiveMessage.apply(t, arguments);stream.datagram([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,INCR++]);};
    stream.mConnection.registerReadDatagramCallback(undefined,cb);
    stream.registerReadCallback(cb);
};
SSTDatagram.prototype.acceptConnection = function(error, stream) {
    print("accepted, error = "+error+"\n", stream);
    stream.datagram([3,1,4,1,5,9,2,7]);
    var t = this;
    var INCR=0;
    var cb=function(){SSTDatagram.prototype.receiveMessage.apply(t, arguments);stream.datagram([3,0,4,0,5,INCR++]);};
    stream.mConnection.registerReadDatagramCallback(undefined,cb);
    stream.registerReadCallback(cb);

};
SSTDatagram.prototype.receiveMessage = function(msg) {
    print("received message! "+msg, msg);
};
SSTDatagram.prototype.createTestObjects = function(uuidA, uuidB) {
    var dispatcherA = new Kata.SST.ObjectMessageDispatcher;
    var dispatcherB = new Kata.SST.ObjectMessageDispatcher;
    var objRouterA = new TestObjectMessageRouter(uuidA, dispatcherB);
    var objRouterB = new TestObjectMessageRouter(uuidB, dispatcherA);
    var baseDatagramA = Kata.SST.createBaseDatagramLayer(uuidA, objRouterA, dispatcherA);
    var baseDatagramB = Kata.SST.createBaseDatagramLayer(uuidB, objRouterB, dispatcherB);
    Kata.SST.listenStream(this.acceptConnection, uuidB);
    Kata.SST.connectStream(uuidA, uuidB, this.establishedConnection);
};
SSTDatagram.doSSTDatagram=function () {
    var sst = new SSTDatagram();
    sst.createTestObjects(new Kata.SST.EndPoint("aaaa0000-0000-0000-0000-000000000000", 1234), new Kata.SST.EndPoint("bbbb0000-0000-0000-0000-000000000000", 2468));
    setInterval(Kata.SST.serviceConnections, 100);
    
};

},'../katajs/tests/sst/SSTDatagram.js');
