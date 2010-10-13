if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
Sirikata.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.Frame = PROTO.Message("Sirikata.Protocol.Frame",{
	payload: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.bytes;},
		id: 1
	}});
