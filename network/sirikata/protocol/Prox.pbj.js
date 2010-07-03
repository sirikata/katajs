if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Prox)=="undefined") {Sirikata.Protocol.Prox = {};}
Sirikata.Protocol.Prox._PBJ_Internal="pbj-0.0.3";
import "TimedMotionVector.pbj";

Sirikata.Protocol.Prox.ServerQuery = PROTO.Message("Sirikata.Protocol.Prox.ServerQuery",{
	Action: PROTO.Enum("Sirikata.Protocol.Prox.ServerQuery.Action",{
		AddOrUpdate :1,
		Remove :2	}),
	action: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Sirikata.Protocol.Prox.ServerQuery.Action;},
		id: 1
	},
	location: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.TimedMotionVector;},
		id: 2
	},
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3f;},
		id: 3
	},
	min_angle: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 4
	}});
Sirikata.Protocol.Prox.ObjectMigrationData = PROTO.Message("Sirikata.Protocol.Prox.ObjectMigrationData",{
	min_angle: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 1
	}});
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
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.boundingsphere3f;},
		id: 3
	}});
Sirikata.Protocol.Prox.ObjectRemoval = PROTO.Message("Sirikata.Protocol.Prox.ObjectRemoval",{
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	}});
Sirikata.Protocol.Prox.ProximityResults = PROTO.Message("Sirikata.Protocol.Prox.ProximityResults",{
	t: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.time;},
		id: 1
	},
	addition: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Prox.ObjectAddition;},
		id: 2
	},
	removal: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Prox.ObjectRemoval;},
		id: 3
	}});
Sirikata.Protocol.Prox.Container = PROTO.Message("Sirikata.Protocol.Prox.Container",{
	query: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Prox.ServerQuery;},
		id: 1
	},
	result: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Prox.ProximityResults;},
		id: 2
	}});
