//Kata.include("externals/protojs/protobuf.js");
Kata.include("externals/protojs/pbj.js");
Kata.include("katajs/core/Math.uuid.js");
Kata.include("katajs/core/KataDeque.js");
Kata.include("katajs/oh/sst/SSTImpl.js");

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

function SSTTest() {
    this.dispatcher = new ObjectMessageDispatcherSST;
};
SSTTest.prototype.establishedConnection = function(error, stream) {
    print("established, error = "+error+"\n", stream);
    stream.write([2,7,1,8,2,8,1,8]);
    var t = this;
    stream.registerReadCallback(function(){SSTTest.prototype.receiveMessage.apply(t, arguments);});
};
SSTTest.prototype.acceptConnection = function(error, stream) {
    print("accepted, error = "+error+"\n", stream);
    stream.write([3,1,4,1,5,9,2,7]);
    var t = this;
    stream.registerReadCallback(function(){SSTTest.prototype.receiveMessage.apply(t, arguments);});
}
SSTTest.prototype.receiveMessage = function(msg) {
    print("received message! "+msg, msg);
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
