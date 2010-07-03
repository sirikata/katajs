Kata.include("network/SSTImpl.js");
Kata.include("network/sirikata/protocol/SSTHeader.pbj.js");

function TestObjectMessageRouter() {
    this.mTargetObject = null;
}

TestObjectMessageRouter.prototype.setTarget = function(targetObject) {
    this.mTargetObject = targetObject;
}

TestObjectMessageRouter.prototype.route = function(msg) {
    this.mTargetObject.receivedMessage(msg);
};

function SSTTest() {
    this.dispatcher = new ObjectMessageDispatcherSST;
};
SSTTest.prototype.establishedConnection = function(intArg, stream) {
    console.log("established, intArg = "+intArg, connection);
    stream.write([2,7,1,8,2,8,1,8]);
};
SSTTest.prototype.acceptConnection = function(intArg, stream) {
    console.log("accepted, intArg = "+intArg, connection);
    stream.write([3,1,4,1,5,9,2,7]);
}
SSTTest.prototype.receiveMessage = function(msg) {
    console.log("receive message!", msg);
};
SSTTest.prototype.createTestObjects = function(uuidA, uuidB) {
    var objRouterA = new TestObjectMessageRouter;
    var objRouterB = new TestObjectMessageRouter;
    var baseDatagramA = createBaseDatagramLayerSST(uuidA, objRouterB, this);
    var baseDatagramB = createBaseDatagramLayerSST(uuidB, objRouterB, this);
    var objB = listenStreamSST(uuidB, this.acceptConnection);
    objRouterB.setTarget(objB);
    var objA = createConnectionSST(uuidA, uuidB, this.establishedConnection);
    objRouterA.setTarget(objA);
};