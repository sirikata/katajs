if (typeof(Sirikata)=="undefined") {Sirikata = {};}
if (typeof(Sirikata.Protocol)=="undefined") {Sirikata.Protocol = {};}
Sirikata.Protocol._PBJ_Internal="pbj-0.0.3";

Sirikata.Protocol.MessageBody = PROTO.Message("Sirikata.Protocol.MessageBody",{
	message_names: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.string;},
		id: 9
	},
	message_arguments: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.bytes;},
		id: 10
	}});
Sirikata.Protocol.ReadOnlyMessage = PROTO.Message("Sirikata.Protocol.ReadOnlyMessage",{
	source_object: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	source_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 3
	},
	source_space: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1536
	},
	destination_object: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 2
	},
	destination_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 4
	},
	destination_space: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1537
	},
	id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.int64;},
		id: 7
	},
	reply_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.int64;},
		id: 8
	},
	ReturnStatus: PROTO.Enum("Sirikata.Protocol.ReadOnlyMessage.ReturnStatus",{
		SUCCESS :0,
		NETWORK_FAILURE :1,
		TIMEOUT_FAILURE :3,
		PROTOCOL_ERROR :4,
		PORT_FAILURE :5	}),
	return_status: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.ReadOnlyMessage.ReturnStatus;},
		id: 1792
	},
	message_names: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.string;},
		id: 9
	},
	message_arguments: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.bytes;},
		id: 10
	}});
Sirikata.Protocol.SpaceServices = PROTO.Message("Sirikata.Protocol.SpaceServices",{
	rpc_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 32
	},
	registration_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 33
	},
	loc_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 34
	},
	geom_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 35
	},
	oseg_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 36
	},
	cseg_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 37
	},
	router_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 38
	},
	persistence_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 39
	},
	physics_port: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 40
	},
	pre_connection_buffer: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 64
	},
	max_pre_connection_messages: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 65
	}});
Sirikata.Protocol.ObjLoc = PROTO.Message("Sirikata.Protocol.ObjLoc",{
	timestamp: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 2
	},
	position: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3d;},
		id: 3
	},
	orientation: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.quaternion;},
		id: 4
	},
	velocity: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 5
	},
	rotational_axis: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.normal;},
		id: 7
	},
	angular_speed: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 8
	},
	UpdateFlags: PROTO.Flags(123456,"Sirikata.Protocol.ObjLoc.UpdateFlags",{
		FORCE : 1}),
	update_flags: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.ObjLoc.UpdateFlags;},
		id: 6
	}});
Sirikata.Protocol.LocRequest = PROTO.Message("Sirikata.Protocol.LocRequest",{
	Fields: PROTO.Flags(123456,"Sirikata.Protocol.LocRequest.Fields",{
		POSITION : 1,
		ORIENTATION : 2,
		VELOCITY : 4,
		ROTATIONAL_AXIS : 8,
		ANGULAR_SPEED : 16}),
	requested_fields: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.LocRequest.Fields;},
		id: 2
	}});
Sirikata.Protocol.NewObj = PROTO.Message("Sirikata.Protocol.NewObj",{
	object_uuid_evidence: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 2
	},
	requested_object_loc: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.ObjLoc;},
		id: 3
	},
	bounding_sphere_scale: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 4
	}});
Sirikata.Protocol.RetObj = PROTO.Message("Sirikata.Protocol.RetObj",{
	object_reference: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 2
	},
	location: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.ObjLoc;},
		id: 3
	},
	bounding_sphere_scale: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 4
	}});
Sirikata.Protocol.DelObj = PROTO.Message("Sirikata.Protocol.DelObj",{
	object_reference: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 2
	}});
Sirikata.Protocol.NewProxQuery = PROTO.Message("Sirikata.Protocol.NewProxQuery",{
	query_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 2
	},
	stateless: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bool;},
		id: 3
	},
	relative_center: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 4
	},
	absolute_center: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3d;},
		id: 5
	},
	max_radius: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 6
	},
	min_solid_angle: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.angle;},
		id: 7
	}});
Sirikata.Protocol.ProxCall = PROTO.Message("Sirikata.Protocol.ProxCall",{
	query_id: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 2
	},
	proximate_object: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PBJ.uuid;},
		id: 3
	},
	ProximityEvent: PROTO.Enum("Sirikata.Protocol.ProxCall.ProximityEvent",{
		EXITED_PROXIMITY :0,
		ENTERED_PROXIMITY :1,
		STATELESS_PROXIMITY :2	}),
	proximity_event: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Sirikata.Protocol.ProxCall.ProximityEvent;},
		id: 4
	}});
Sirikata.Protocol.DelProxQuery = PROTO.Message("Sirikata.Protocol.DelProxQuery",{
	query_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 2
	}});
Sirikata.Protocol.Vector3fProperty = PROTO.Message("Sirikata.Protocol.Vector3fProperty",{
	value: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 10
	}});
Sirikata.Protocol.StringProperty = PROTO.Message("Sirikata.Protocol.StringProperty",{
	value: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 10
	}});
Sirikata.Protocol.StringMapProperty = PROTO.Message("Sirikata.Protocol.StringMapProperty",{
	keys: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.string;},
		id: 2
	},
	values: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.string;},
		id: 3
	}});
Sirikata.Protocol.PhysicalParameters = PROTO.Message("Sirikata.Protocol.PhysicalParameters",{
	Mode: PROTO.Enum("Sirikata.Protocol.PhysicalParameters.Mode",{
		NONPHYSICAL :0,
		STATIC :1,
		DYNAMICBOX :2,
		DYNAMICSPHERE :3,
		DYNAMICCYLINDER :4,
		CHARACTER :5	}),
	mode: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.PhysicalParameters.Mode;},
		id: 2
	},
	density: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 3
	},
	friction: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 4
	},
	bounce: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 5
	},
	hull: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 6
	},
	collide_msg: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 16
	},
	collide_mask: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 17
	},
	gravity: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 18
	}});
Sirikata.Protocol.LightInfoProperty = PROTO.Message("Sirikata.Protocol.LightInfoProperty",{
	diffuse_color: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 3
	},
	specular_color: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 4
	},
	power: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 5
	},
	ambient_color: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 6
	},
	shadow_color: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 7
	},
	light_range: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Double;},
		id: 8
	},
	constant_falloff: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 9
	},
	linear_falloff: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 10
	},
	quadratic_falloff: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 11
	},
	cone_inner_radians: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 12
	},
	cone_outer_radians: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 13
	},
	cone_falloff: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 14
	},
	LightTypes: PROTO.Enum("Sirikata.Protocol.LightInfoProperty.LightTypes",{
		POINT :0,
		SPOTLIGHT :1,
		DIRECTIONAL :2	}),
	type: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.LightInfoProperty.LightTypes;},
		id: 15
	},
	casts_shadow: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bool;},
		id: 16
	}});
Sirikata.Protocol.ParentProperty = PROTO.Message("Sirikata.Protocol.ParentProperty",{
	value: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 10
	}});
Sirikata.Protocol.UUIDListProperty = PROTO.Message("Sirikata.Protocol.UUIDListProperty",{
	value: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.uuid;},
		id: 10
	}});
Sirikata.Protocol.ConnectToSpace = PROTO.Message("Sirikata.Protocol.ConnectToSpace",{
	space_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	object_uuid_evidence: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 2
	},
	requested_object_loc: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.ObjLoc;},
		id: 3
	},
	bounding_sphere: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3f;},
		id: 4
	}});
Sirikata.Protocol.DisconnectFromSpace = PROTO.Message("Sirikata.Protocol.DisconnectFromSpace",{
	space_id: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	}});
Sirikata.Protocol.CreateObject = PROTO.Message("Sirikata.Protocol.CreateObject",{
	object_uuid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	space_properties: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Sirikata.Protocol.ConnectToSpace;},
		id: 2
	},
	mesh: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 3
	},
	scale: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 4
	},
	weburl: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 5
	},
	light_info: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.LightInfoProperty;},
		id: 6
	},
	camera: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bool;},
		id: 7
	},
	physical: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.PhysicalParameters;},
		id: 8
	},
	script: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 9
	},
	script_args: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Sirikata.Protocol.StringMapProperty;},
		id: 10
	}});
