if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
Sirikata.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.TimedMotionVector = PROTO.Message("Sirikata.Protocol.TimedMotionVector",{
	t: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.time;},
		id: 1
	},
	position: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.vector3f;},
		id: 2
	},
	velocity: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.vector3f;},
		id: 3
	}});
