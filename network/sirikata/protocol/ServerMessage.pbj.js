if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Server)=="undefined") {Sirikata.Protocol.Server = {};}
Sirikata.Protocol.Server._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.Server.ServerMessage = PROTO.Message("Sirikata.Protocol.Server.ServerMessage",{
	source_server: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 1
	},
	source_port: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 2
	},
	dest_server: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 3
	},
	dest_port: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 4
	},
	id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 5
	},
	payload_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 6
	},
	payload: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 7
	}});
Sirikata.Protocol.Server.ServerIntro = PROTO.Message("Sirikata.Protocol.Server.ServerIntro",{
	id: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 1
	}});
