if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Session)=="undefined") {Sirikata.Protocol.Session = {};}
Sirikata.Protocol.Session._PBJ_Internal="pbj-0.0.3";
import "TimedMotionVector.pbj";

Sirikata.Protocol.Session.Connect = PROTO.Message("Sirikata.Protocol.Session.Connect",{
	ConnectionType: PROTO.Enum("Sirikata.Protocol.Session.Connect.ConnectionType",{
		Fresh :1,
		Migration :2	}),
	type: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Sirikata.Protocol.Session.Connect.ConnectionType;},
		id: 1
	},
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 2
	},
	loc: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.TimedMotionVector;},
		id: 3
	},
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3f;},
		id: 4
	},
	query_angle: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 5
	}});
Sirikata.Protocol.Session.ConnectResponse = PROTO.Message("Sirikata.Protocol.Session.ConnectResponse",{
	Response: PROTO.Enum("Sirikata.Protocol.Session.ConnectResponse.Response",{
		Success :1,
		Redirect :2,
		Error :3	}),
	response: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Sirikata.Protocol.Session.ConnectResponse.Response;},
		id: 1
	},
	redirect: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 2
	}});
Sirikata.Protocol.Session.ConnectAck = PROTO.Message("Sirikata.Protocol.Session.ConnectAck",{
});
Sirikata.Protocol.Session.InitiateMigration = PROTO.Message("Sirikata.Protocol.Session.InitiateMigration",{
	new_server: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 1
	}});
Sirikata.Protocol.Session.Disconnect = PROTO.Message("Sirikata.Protocol.Session.Disconnect",{
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	reason: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 2
	}});
Sirikata.Protocol.Session.Container = PROTO.Message("Sirikata.Protocol.Session.Container",{
	connect: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Session.Connect;},
		id: 1
	},
	connect_response: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Session.ConnectResponse;},
		id: 2
	},
	connect_ack: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Session.ConnectAck;},
		id: 3
	},
	init_migration: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Session.InitiateMigration;},
		id: 4
	},
	disconnect: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Session.Disconnect;},
		id: 5
	}});
