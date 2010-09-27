if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Loc)=="undefined") {Sirikata.Protocol.Loc = {};}
Sirikata.Protocol.Loc._PBJ_Internal="pbj-0.0.3";
//import "TimedMotionVector.pbj";
//import "TimedMotionQuaternion.pbj";

Sirikata.Protocol.Loc.LocationUpdate = PROTO.Message("Sirikata.Protocol.Loc.LocationUpdate",{
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	location: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.TimedMotionVector;},
		id: 2
	},
	orientation: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.TimedMotionQuaternion;},
		id: 3
	},
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3f;},
		id: 4
	},
	mesh: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 5
	}});
Sirikata.Protocol.Loc.BulkLocationUpdate = PROTO.Message("Sirikata.Protocol.Loc.BulkLocationUpdate",{
	update: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Loc.LocationUpdate;},
		id: 1
	}});
Sirikata.Protocol.Loc.LocationUpdateRequest = PROTO.Message("Sirikata.Protocol.Loc.LocationUpdateRequest",{
	location: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.TimedMotionVector;},
		id: 1
	},
	orientation: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.TimedMotionQuaternion;},
		id: 2
	},
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3f;},
		id: 3
	},
	mesh: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 4
	}});
Sirikata.Protocol.Loc.Container = PROTO.Message("Sirikata.Protocol.Loc.Container",{
	update_request: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.Loc.LocationUpdateRequest;},
		id: 1
	}});
