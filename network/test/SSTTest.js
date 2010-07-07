//Kata.include("externals/protojs/protobuf.js");
Kata.include("externals/protojs/pbj.js");
Kata.include("katajs/core/Math.uuid.js");
Kata.include("katajs/core/KataDeque.js");
Kata.include("network/sirikata/protocol/SSTHeader.pbj.js");
Kata.include("network/sirikata/protocol/ObjectMessage.pbj.js");
Protocol = Sirikata.Protocol;
Kata.include("network/SSTImpl.js");

function TestObjectMessageRouter(targetEndpoint, targetDispatcher) {
    this.mDispatcher = targetDispatcher;
    this.mTargetEndpoint = targetEndpoint;
};

TestObjectMessageRouter.prototype.route = function(msg) {
    //getConnectionSST(this.mTargetEndpoint).receiveMessage(msg);
    console.log("Routing to "+this.mTargetEndpoint+"\n", msg);
    this.mDispatcher.dispatchMessage(msg);
};

function SSTTest() {
    this.dispatcher = new ObjectMessageDispatcherSST;
};
SSTTest.prototype.establishedConnection = function(error, stream) {
    console.log("established, error = "+error+"\n", stream);
    stream.write([2,7,1,8,2,8,1,8]);
};
SSTTest.prototype.acceptConnection = function(error, stream) {
    console.log("accepted, error = "+error+"\n", stream);
    stream.write([3,1,4,1,5,9,2,7]);
}
SSTTest.prototype.receiveMessage = function(msg) {
    console.log("receive message!\n", msg);
};
SSTTest.prototype.createTestObjects = function(uuidA, uuidB) {
    var dispatcherA = new ObjectMessageDispatcherSST;
    var dispatcherB = new ObjectMessageDispatcherSST;
    var objRouterA = new TestObjectMessageRouter(uuidA, dispatcherB);
    var objRouterB = new TestObjectMessageRouter(uuidB, dispatcherA);
    var baseDatagramA = createBaseDatagramLayerSST(uuidA, objRouterA, dispatcherA);
    var baseDatagramB = createBaseDatagramLayerSST(uuidB, objRouterB, dispatcherB);
    listenStreamSST(this.acceptConnection, uuidB);
    connectStreamSST(uuidA, uuidB, this.establishedConnection);
};
