if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Prox)=="undefined") {Sirikata.Protocol.Prox = {};}
Sirikata.Protocol.Prox._PBJ_Internal="pbj-0.0.3";
//import "TimedMotionVector.pbj";
//import "TimedMotionQuaternion.pbj";

Sirikata.Protocol.Prox.ObjectAddition = PROTO.Message("Sirikata.Protocol.Prox.ObjectAddition",{
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	location: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Sirikata.Protocol.TimedMotionVector;},
		id: 2
	},
	orientation: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Sirikata.Protocol.TimedMotionQuaternion;},
		id: 3
	},
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.boundingsphere3f;},
		id: 4
	},
	mesh: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 5
	}});
Sirikata.Protocol.Prox.ObjectRemoval = PROTO.Message("Sirikata.Protocol.Prox.ObjectRemoval",{
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	}});
Sirikata.Protocol.Prox.ProximityUpdate = PROTO.Message("Sirikata.Protocol.Prox.ProximityUpdate",{
	addition: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Prox.ObjectAddition;},
		id: 1
	},
	removal: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Prox.ObjectRemoval;},
		id: 2
	}});
Sirikata.Protocol.Prox.ProximityResults = PROTO.Message("Sirikata.Protocol.Prox.ProximityResults",{
	t: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.time;},
		id: 1
	},
	update: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Prox.ProximityUpdate;},
		id: 2
	}});
