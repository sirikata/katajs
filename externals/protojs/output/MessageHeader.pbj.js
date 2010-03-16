if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
Sirikata.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.Header = PROTO.Message("Sirikata.Protocol.Header",{
	source_object: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	source_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 3
	},
	source_space: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1536
	},
	destination_object: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 2
	},
	destination_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 4
	},
	destination_space: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1537
	},
	id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.int64;},
		id: 7
	},
	reply_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.int64;},
		id: 8
	},
	ReturnStatus: PROTO.Enum("Sirikata.Protocol.Header.ReturnStatus",{
		SUCCESS :0,
		NETWORK_FAILURE :1,
		TIMEOUT_FAILURE :3,
		PROTOCOL_ERROR :4,
		PORT_FAILURE :5,
		UNKNOWN_OBJECT :6	}),
	return_status: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Header.ReturnStatus;},
		id: 1792
	}});
