if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.Migration)=="undefined") {Sirikata.Protocol.Migration = {};}
Sirikata.Protocol.Migration._PBJ_Internal="pbj-0.0.3";
import "TimedMotionVector.pbj";

Sirikata.Protocol.Migration.MigrationClientData = PROTO.Message("Sirikata.Protocol.Migration.MigrationClientData",{
	key: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	data: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.bytes;},
		id: 2
	}});
Sirikata.Protocol.Migration.MigrationMessage = PROTO.Message("Sirikata.Protocol.Migration.MigrationMessage",{
	object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	loc: {
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
	},
	client_data: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.Migration.MigrationClientData;},
		id: 4
	},
	source_server: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 6
	}});
