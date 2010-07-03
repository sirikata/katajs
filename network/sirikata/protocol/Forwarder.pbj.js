if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Forwarder)=="undefined") {Sirikata.Protocol.Forwarder = {};}
Sirikata.Protocol.Forwarder._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.Forwarder.WeightUpdate = PROTO.Message("Sirikata.Protocol.Forwarder.WeightUpdate",{
	server_pair_total_weight: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Double;},
		id: 1
	},
	server_pair_used_weight: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Double;},
		id: 2
	},
	receiver_total_weight: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Double;},
		id: 3
	},
	receiver_capacity: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Double;},
		id: 4
	}});
