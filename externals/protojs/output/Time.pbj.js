if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Network)=="undefined") {Sirikata.Network = {};}
if (typeof(Sirikata.Network.Protocol)=="undefined") {Sirikata.Network.Protocol = {};}
Sirikata.Network.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Network.Protocol.TimeSync = PROTO.Message("Sirikata.Network.Protocol.TimeSync",{
	client_time: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 9
	},
	server_time: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 10
	},
	sync_round: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 11
	},
	ReturnOptions: PROTO.Flags(123456,"Sirikata.Network.Protocol.TimeSync.ReturnOptions",{
		REPLY_RELIABLE : 1,
		REPLY_ORDERED : 2}),
	return_options: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Network.Protocol.TimeSync.ReturnOptions;},
		id: 14
	},
	round_trip: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 2561
	}});
