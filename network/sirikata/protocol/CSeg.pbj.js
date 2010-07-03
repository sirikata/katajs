if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.CSeg)=="undefined") {Sirikata.Protocol.CSeg = {};}
Sirikata.Protocol.CSeg._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.CSeg.SplitRegion = PROTO.Message("Sirikata.Protocol.CSeg.SplitRegion",{
	id: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 1
	},
	bounds: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.boundingbox3d3f;},
		id: 2
	}});
Sirikata.Protocol.CSeg.ChangeMessage = PROTO.Message("Sirikata.Protocol.CSeg.ChangeMessage",{
	region: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.CSeg.SplitRegion;},
		id: 1
	}});
Sirikata.Protocol.CSeg.LoadMessage = PROTO.Message("Sirikata.Protocol.CSeg.LoadMessage",{
	load: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 1
	}});
