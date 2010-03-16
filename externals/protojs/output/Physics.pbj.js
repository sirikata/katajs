if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Physics)=="undefined") {Sirikata.Physics = {};}
if (typeof(Sirikata.Physics.Protocol)=="undefined") {Sirikata.Physics.Protocol = {};}
Sirikata.Physics.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Physics.Protocol.CollisionBegin = PROTO.Message("Sirikata.Physics.Protocol.CollisionBegin",{
	timestamp: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 2
	},
	this_position: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.vector3d;},
		id: 3
	},
	other_position: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.vector3d;},
		id: 4
	},
	this_normal: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.normal;},
		id: 5
	},
	impulse: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 6
	},
	other_object_reference: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 7
	}});
Sirikata.Physics.Protocol.CollisionEnd = PROTO.Message("Sirikata.Physics.Protocol.CollisionEnd",{
	timestamp: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 2
	},
	other_object_reference: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 6
	}});
