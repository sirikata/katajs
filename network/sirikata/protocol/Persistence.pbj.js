if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Persistence)=="undefined") {Sirikata.Persistence = {};}
if (typeof(Sirikata.Persistence.Protocol)=="undefined") {Sirikata.Persistence.Protocol = {};}
Sirikata.Persistence.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Persistence.Protocol.StorageKey = PROTO.Message("Sirikata.Persistence.Protocol.StorageKey",{
	object_uuid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 9
	},
	field_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 10
	},
	field_name: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 11
	}});
Sirikata.Persistence.Protocol.StorageValue = PROTO.Message("Sirikata.Persistence.Protocol.StorageValue",{
	data: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 12
	}});
Sirikata.Persistence.Protocol.StorageElement = PROTO.Message("Sirikata.Persistence.Protocol.StorageElement",{
	object_uuid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 9
	},
	field_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 10
	},
	field_name: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 11
	},
	data: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 12
	},
	index: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.int32;},
		id: 13
	},
	ReturnStatus: PROTO.Enum("Sirikata.Persistence.Protocol.StorageElement.ReturnStatus",{
		KEY_MISSING :4,
		INTERNAL_ERROR :6	}),
	return_status: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement.ReturnStatus;},
		id: 15
	},
	ttl: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.duration;},
		id: 16
	},
	subscription_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.sint32;},
		id: 17
	}});
Sirikata.Persistence.Protocol.CompareElement = PROTO.Message("Sirikata.Persistence.Protocol.CompareElement",{
	object_uuid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 9
	},
	field_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 10
	},
	field_name: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 11
	},
	data: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 12
	},
	COMPARATOR: PROTO.Enum("Sirikata.Persistence.Protocol.CompareElement.COMPARATOR",{
		EQUAL :0,
		NEQUAL :1	}),
	comparator: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Persistence.Protocol.CompareElement.COMPARATOR;},
		id: 14
	}});
Sirikata.Persistence.Protocol.StorageSet = PROTO.Message("Sirikata.Persistence.Protocol.StorageSet",{
	reads: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 9
	}});
Sirikata.Persistence.Protocol.ReadSet = PROTO.Message("Sirikata.Persistence.Protocol.ReadSet",{
	reads: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 9
	}});
Sirikata.Persistence.Protocol.WriteSet = PROTO.Message("Sirikata.Persistence.Protocol.WriteSet",{
	writes: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 10
	}});
Sirikata.Persistence.Protocol.ReadWriteSet = PROTO.Message("Sirikata.Persistence.Protocol.ReadWriteSet",{
	reads: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 9
	},
	writes: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 10
	},
	ReadWriteSetOptions: PROTO.Flags(123456,"Sirikata.Persistence.Protocol.ReadWriteSet.ReadWriteSetOptions",{
		RETURN_READ_NAMES : 1}),
	options: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Persistence.Protocol.ReadWriteSet.ReadWriteSetOptions;},
		id: 14
	}});
Sirikata.Persistence.Protocol.Minitransaction = PROTO.Message("Sirikata.Persistence.Protocol.Minitransaction",{
	reads: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 9
	},
	writes: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 10
	},
	compares: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.CompareElement;},
		id: 11
	},
	TransactionOptions: PROTO.Flags(123456,"Sirikata.Persistence.Protocol.Minitransaction.TransactionOptions",{
		RETURN_READ_NAMES : 1}),
	options: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Persistence.Protocol.Minitransaction.TransactionOptions;},
		id: 14
	}});
Sirikata.Persistence.Protocol.Response = PROTO.Message("Sirikata.Persistence.Protocol.Response",{
	reads: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Persistence.Protocol.StorageElement;},
		id: 9
	},
	ReturnStatus: PROTO.Enum("Sirikata.Persistence.Protocol.Response.ReturnStatus",{
		SUCCESS :0,
		DATABASE_LOCKED :3,
		KEY_MISSING :4,
		COMPARISON_FAILED :5,
		INTERNAL_ERROR :6	}),
	return_status: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Persistence.Protocol.Response.ReturnStatus;},
		id: 15
	}});
