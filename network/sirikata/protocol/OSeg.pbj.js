if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
if (typeof(Sirikata.Protocol.OSeg)=="undefined") {Sirikata.Protocol.OSeg = {};}
Sirikata.Protocol.OSeg._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.OSeg.MigrateMessageMove = PROTO.Message("Sirikata.Protocol.OSeg.MigrateMessageMove",{
	m_servid_from: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 1
	},
	m_servid_to: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 2
	},
	m_message_destination: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 3
	},
	m_message_from: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 4
	},
	m_objid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 5
	},
	m_objradius: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 6
	}});
Sirikata.Protocol.OSeg.MigrateMessageAcknowledge = PROTO.Message("Sirikata.Protocol.OSeg.MigrateMessageAcknowledge",{
	m_servid_from: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 1
	},
	m_servid_to: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 2
	},
	m_message_destination: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 3
	},
	m_message_from: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 4
	},
	m_objid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 5
	},
	m_objradius: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 6
	}});
Sirikata.Protocol.OSeg.UpdateOSegMessage = PROTO.Message("Sirikata.Protocol.OSeg.UpdateOSegMessage",{
	servid_sending_update: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 1
	},
	servid_obj_on: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint64;},
		id: 2
	},
	m_objid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 5
	},
	m_objradius: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 6
	}});
Sirikata.Protocol.OSeg.AddedObjectMessage = PROTO.Message("Sirikata.Protocol.OSeg.AddedObjectMessage",{
	m_objid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	m_objradius: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 2
	}});
