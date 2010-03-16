if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
Sirikata.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.Subscribe = PROTO.Message("Sirikata.Protocol.Subscribe",{
	broadcast_name: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.sint32;},
		id: 9
	},
	update_period: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.duration;},
		id: 10
	},
	object: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 11
	}});
Sirikata.Protocol.Broadcast = PROTO.Message("Sirikata.Protocol.Broadcast",{
	broadcast_name: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.sint32;},
		id: 9
	},
	data: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 10
	},
	object: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 11
	}});
