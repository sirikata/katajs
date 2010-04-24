kjsgfx_camera_id = null
kjsgfx_id_map = {}
kjsgfx_mesh_map = {}
kjsgfx_scene = null
kjsgfx_debug = false

kjsgfx_id2Obj = function(id){
	if(kjsgfx_debug) console.log("id2obj:",id)
	if (!(id in kjsgfx_id_map)) alert ("k3dgfx error: unknown object(2) " + id)
    var obj = kjsgfx_id_map[id]
    if (obj.no_mesh) {
        if (id != kjsgfx_camera_id) {
//            alert("k3dgfx error: unknown object " + id)
            return obj
        }
        else {
            obj = kjsgfx_scene.camera
        }
    }
    return obj
}

kjsgfx_addModel = function(url, id, scale, loc, orient, cb){

	if(kjsgfx_debug) console.log("************************* kjsgfx_addModel")
	if (id == null) 
		id = url + Math.random()
	if (url.indexOf("http://") != 0) {
		url = "http://" + location.host + location.pathname + url
	}
	if (scale == null) 
		scale = [1.0,1.0,1.0]
	var clda = new GLGE.Collada()
	if(kjsgfx_debug) console.log("************************* kjsgfx_addModel clda:", clda)
	clda.setDocument(url)
	clda.setId(id)
	clda.setScaleX(scale[0])
	clda.setScaleY(scale[1])
	clda.setScaleZ(scale[2])
	if (loc) {
		clda.setLocX(loc[0])
		clda.setLocY(loc[1])
		clda.setLocZ(loc[2])
	}
	if (orient) {
		if (orient.length == 3) {
			clda.setRotX(orient[0])
			clda.setRotY(orient[1])
			clda.setRotZ(orient[2])
		}
		else {
			clda.setQuat(orient)
		}
	}
	KJS.gameScene.addCollada(clda)
	if (cb) 
		KJS.addObjectInit(id, cb)
	return clda
}

kjsgfx_Move = function(msg){
	if(kjsgfx_debug) 
		console.log("***Move", msg)
	var obj = kjsgfx_id2Obj(msg.id)
	if (obj.no_mesh) {
		if(msg.pos) obj.msg.pos=msg.pos
		if(msg.orient) obj.msg.orient=msg.orient
		if(msg.scale) obj.msg.scale=msg.scale
	}
	else {
		if (msg.pos) {
			obj.setLocX(msg.pos[0])
			obj.setLocY(msg.pos[1])
			obj.setLocZ(msg.pos[2])
		}
		if (msg.scale) {
			obj.setScaleX(msg.scale[0]);
			obj.setScaleY(msg.scale[1]);
			obj.setScaleZ(msg.scale[2]);
		}
		if (msg.orient) {
			if (msg.orient.length == 3) { ///	Euler angles
				obj.setRotX(msg.orient[0])
				obj.setRotY(msg.orient[1])
				obj.setRotZ(msg.orient[2])
			}
			else { /// Quaternion
				/// re-compute w; protojs code is b0rk
				var w = Math.sqrt(1.0 - (msg.orient[0] * msg.orient[0] + msg.orient[1] * msg.orient[1] + msg.orient[2] * msg.orient[2]))
				if (kjsgfx_debug) 
					console.log("setQuat:", msg.orient[0], msg.orient[1], msg.orient[2], w)
				obj.setQuat(msg.orient[0], msg.orient[1], msg.orient[2], w)
			}
		}
	}
}

KatajsGraphics=function(callbackFunction,parentElement) {
    this.callback=callbackFunction;
    this.parent=parentElement;
    this.methodTable={}

    kjsgfx_scene = KJS.init()

    this.methodTable["Create"]=function(msg) {
		if(kjsgfx_debug) console.log("***Create",msg)
		var obj = {
			no_mesh:true,
			msg:msg
		}
		kjsgfx_id_map[msg.id]=obj
    }

    this.methodTable["Move"]=kjsgfx_Move

    this.methodTable["Destroy"]=function(msg) {
		if(kjsgfx_debug) console.log("***Destroy",msg)
    }
    this.methodTable["MeshShaderUniform"]=function(msg) {
		if(kjsgfx_debug) console.log("***MeshShaderUniform",msg)
    }
    this.methodTable["Mesh"] = function(msg){
		if(kjsgfx_debug) console.log("***Mesh", msg)
		var obj = kjsgfx_id2Obj(msg.id)
		if (obj.no_mesh) {
			var initMsg=obj.msg
		}
		if (msg.mesh.indexOf(".dae") == msg.mesh.length - 4) {
			obj = kjsgfx_addModel(msg.mesh, msg.id)
		}
		else {
			var el = doc.getElement(msg.mesh, true)
			if (el) {
				obj = new GLGE.Object()
				obj.setId(msg.id)
				obj.setMesh(el)
				obj.setMaterial(doc.getElement("box"))
				kjsgfx_scene.addObject(obj)
			}
			else {
				if(kjsgfx_debug) console.log("mesh not found as element or parsable type:", msg.mesh)
			}
		}
		kjsgfx_id_map[msg.id] = obj
		kjsgfx_mesh_map[msg.mesh] = msg.id
		if(kjsgfx_debug) console.log(">>>mapping",msg.mesh,"to",msg.id)
		kjsgfx_Move(initMsg)
		kjsgfx_Move(msg)
	}

    this.methodTable["DestroyMesh"]=function(msg) {
		if(kjsgfx_debug) console.log("DestroyMesh",msg)
    }
    this.methodTable["Light"]=function(msg) {
		if(kjsgfx_debug) console.log("Light",msg)
    }
    this.methodTable["DestroyLight"]=function(msg) {
		if(kjsgfx_debug) console.log("DestroyLight",msg)
    }
    this.methodTable["Camera"]=function(msg) {
		if(kjsgfx_debug) console.log("Camera",msg)
		if (msg.primary || true) {
			kjsgfx_camera_id = msg.id		// FIXME: need to handle non-primary camera
		}
		kjsgfx_Move(msg)
    }
    this.methodTable["AttachCamera"]=function(msg) {
		if(kjsgfx_debug) console.log("AttachCamera",msg)
    }
    this.methodTable["DestroyCamera"]=function(msg) {
		if(kjsgfx_debug) console.log("DestroyCamera",msg)
    }
    this.methodTable["IFrame"]=function(msg) {
		if(kjsgfx_debug) console.log("IFrame",msg)
    }
    this.methodTable["DestroyIFrame"]=function(msg) {
		if(kjsgfx_debug) console.log("DestroyIFrame",msg)
    }
    
    this.methodTable["Special"] = function(msg){
		/// klugey methods to get id
		var id
		if (msg.id == "camera") {
			id = kjsgfx_camera_id
		}
		else {
			if (msg.mesh) {
				id = kjsgfx_mesh_map[msg.mesh]
			}
			else {
				id = kjsgfx_mesh_map[msg.id]
			}
		}
		var obj = kjsgfx_id2Obj(id)
		if(kjsgfx_debug) console.log("Special", msg, id)
		if (msg.rescale) {
			if(kjsgfx_debug) console.log("  rescale:", msg.rescale[0], msg.rescale[1], msg.rescale[2])
			obj.setScaleX(msg.rescale[0])
			obj.setScaleY(msg.rescale[1])
			obj.setScaleZ(msg.rescale[2])
		}
	}
    
    this.send=function(obj) {
		var meth = this.methodTable[obj.msg]
		if(kjsgfx_debug) console.log("k3dgfx msg sent:", obj, "mtable:", this.methodTable)
		if (meth) {
			return meth(obj)
		}
		else {
			alert("unknown msg type in kjsgfx: " + obj.msg)
		}
    }
    this.destroy=function(){}
}
