if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Object)=="undefined") {Sirikata.Protocol.Object = {};}
Sirikata.Protocol.Object._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.Object.ObjectMessage = PROTO.Message("Sirikata.Protocol.Object.ObjectMessage",{
	source_object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	source_port: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 2
	},
	dest_object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 3
	},
	dest_port: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 4
	},
	unique: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 5
	},
	payload: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 6
	}});
Sirikata.Protocol.Object.Noise = PROTO.Message("Sirikata.Protocol.Object.Noise",{
	payload: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.bytes;},
		id: 1
	}});
Sirikata.Protocol.Object.Ping = PROTO.Message("Sirikata.Protocol.Object.Ping",{
	ping: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.time;},
		id: 7
	},
	distance: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Double;},
		id: 8
	},
	id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 9
	},
	payload: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 10
	}});
