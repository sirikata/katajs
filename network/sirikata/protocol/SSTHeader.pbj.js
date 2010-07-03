if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.SST)=="undefined") {Sirikata.Protocol.SST = {};}
Sirikata.Protocol.SST._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.SST.SSTChannelHeader = PROTO.Message("Sirikata.Protocol.SST.SSTChannelHeader",{
	channel_id: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint8;},
		id: 1
	},
	transmit_sequence_number: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 2
	},
	ack_count: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint8;},
		id: 3
	},
	ack_sequence_number: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 4
	},
	payload: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 5
	}});
Sirikata.Protocol.SST.SSTStreamHeader = PROTO.Message("Sirikata.Protocol.SST.SSTStreamHeader",{
	StreamPacketType: PROTO.Enum("Sirikata.Protocol.SST.SSTStreamHeader.StreamPacketType",{
		INIT :1,
		REPLY :2,
		DATA :3,
		ACK :4,
		DATAGRAM :5	}),
	lsid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 1
	},
	type: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint8;},
		id: 2
	},
	flags: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint8;},
		id: 3
	},
	window: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint8;},
		id: 4
	},
	src_port: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 5
	},
	dest_port: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uint16;},
		id: 6
	},
	psid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uint16;},
		id: 7
	},
	rsid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uint16;},
		id: 8
	},
	bsn: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 9
	},
	payload: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 10
	}});
