kjsgfx_camera_id = null
kjsgfx_id_map = {}
kjsgfx_mesh_map = {}
kjsgfx_scene = null

kjsgfx_id2Obj = function(id){
	console.log("id2obj:",id)
	if (!(id in kjsgfx_id_map)) alert ("k3dgfx error: unknown object(2) " + id)
    var obj = kjsgfx_scene.getObjectById(id)
    if (obj == null) {
        if (id != kjsgfx_camera_id) {
//            alert("k3dgfx error: unknown object " + id)
            return null
        }
        else {
            obj = kjsgfx_scene.camera
        }
    }
    return obj
}

BASE_URL = "http://localhost/"

kjsgfx_uploadModel = function(url, cb){
	url = BASE_URL + "cgi-bin/kjs_upload.py?" + url
	
	var req = new XMLHttpRequest();
	if (req) {
		req.onreadystatechange = function(){
			if (req.readyState == 4) {
				if (req.status == 200 || req.status == 0) {
					if(cb) cb(req.responseText)
				}
				else {
					alert("Error loading Document: status ", req.status);
				}
			}
		};
		req.open("GET", url, true);
		req.send("");
	}
}


kjsgfx_addModel = function(url, id, scale, loc, orient, cb){
	var addModelCont = function(){
		if (scale==null) scale = 0.1
		var clda = new GLGE.Collada()
		console.log("************************* kjsgfx_addModel clda:", clda)
		clda.setDocument(url)
		clda.setId(id)
		clda.setScaleX(scale)
		clda.setScaleY(scale)
		clda.setScaleZ(scale)
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
		return KJS.gameScene.getObjectById(id)
	}

	console.log("************************* kjsgfx_addModel")
	if(id==null) id = url + Math.random()
	if (url.indexOf("http://") != 0) {
		url = "http://" + location.host + location.pathname + url
	}
	else {
		console.log("uploading: " + url)
		kjsgfx_uploadModel(url, function(text) {
			if (text.length>8 && text.substr(0,8) == "loaded: ") {
				var asset = url.substr(url.lastIndexOf("/")+1,url.length)
				url = BASE_URL + "katatoob/tmp/" + asset
				console.log("upload success!", url)
				addModelCont()
			}
			else {
				console.log("upload failure:(", text, url)
			}
		})
		return
	}
	addModelCont()
}

kjsgfx_Move = function(msg){
	console.log("***Move", msg)
	obj = kjsgfx_id2Obj(msg.id)
	if (msg.pos) {
		obj.setLocX(msg.pos[0])
		obj.setLocY(msg.pos[1])
		obj.setLocZ(msg.pos[2])
	}
	if (msg.orient) {
		if (msg.orient.length == 3) { ///	Euler angles
			obj.setRotX(msg.orient[0])
			obj.setRotY(msg.orient[1])
			obj.setRotZ(msg.orient[2])
		}
		else { /// Quaternion
			console.log("setQuat:", msg.orient)
			obj.setQuat(msg.orient[0], msg.orient[1], msg.orient[2], msg.orient[3])
		}
	}
}

KatajsGraphics=function(callbackFunction,parentElement) {
    this.callback=callbackFunction;
    this.parent=parentElement;
    this.methodTable={}

    kjsgfx_scene = KJS.init()

    this.methodTable["Create"]=function(msg) {
		console.log("***Create",msg)
		kjsgfx_id_map[msg.id]="1"
		// FIXME: should keep track of position? do something?
    }
    this.methodTable["Move"]=kjsgfx_Move

    this.methodTable["Destroy"]=function(msg) {
		console.log("***Destroy",msg)
    }
    this.methodTable["MeshShaderUniform"]=function(msg) {
		console.log("***MeshShaderUniform",msg)
    }
    this.methodTable["Mesh"] = function(msg){
		var obj
		console.log("***Mesh", msg)
		if (msg.mesh.indexOf(".dae") == msg.mesh.length - 4) {
			obj = kjsgfx_addModel(msg.mesh, msg.id)
		}
		else {
			var el = doc.getElement(msg.mesh, true)
			if (el) {
				obj = new GLGE.Object() // FIXME: not all k3d objects should be GLGE objects (the camera?)
				obj.setId(msg.id)
				obj.setMesh(el)
				var tx = new GLGE.Texture("images/crate.jpg")
				var ml = new GLGE.MaterialLayer(0, GLGE.M_COLOR, GLGE.UV1, null, null)
				ml.setTexture(tx)
				var mat = new GLGE.Material()
				mat.id = msg.id + "_mat"
				mat.addTexture(tx)
				mat.addMaterialLayer(ml)
				obj.setMaterial(mat)
				kjsgfx_scene.addObject(obj)
			}
			else {
				console.log("mesh not found as element or parsable type:", msg.mesh)
			}
		}
		kjsgfx_mesh_map[msg.mesh] = msg.id
		console.log(">>>mapping",msg.mesh,"to",msg.id)
		kjsgfx_Move(msg)
	}

    this.methodTable["DestroyMesh"]=function(msg) {
		console.log("DestroyMesh",msg)
    }
    this.methodTable["Light"]=function(msg) {
		console.log("Light",msg)
    }
    this.methodTable["DestroyLight"]=function(msg) {
		console.log("DestroyLight",msg)
    }
    this.methodTable["Camera"]=function(msg) {
		console.log("Camera",msg)
		if (msg.primary || true) {
			kjsgfx_camera_id = msg.id		// FIXME: need to handle non-primary camera
		}
		kjsgfx_Move(msg)
    }
    this.methodTable["AttachCamera"]=function(msg) {
		console.log("AttachCamera",msg)
    }
    this.methodTable["DestroyCamera"]=function(msg) {
		console.log("DestroyCamera",msg)
    }
    this.methodTable["IFrame"]=function(msg) {
		console.log("IFrame",msg)
    }
    this.methodTable["DestroyIFrame"]=function(msg) {
		console.log("DestroyIFrame",msg)
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
		console.log("Special", msg, id)
		if (msg.rescale) {
			obj.setScaleX(msg.rescale[0])
			obj.setScaleY(msg.rescale[1])
			obj.setScaleZ(msg.rescale[2])
		}
	}
    
    this.send=function(obj) {
		var meth = this.methodTable[obj.msg]
		console.log("k3dgfx msg sent:", obj, "mtable:", this.methodTable)
		if (meth) {
			return meth(obj)
		}
		else {
			alert("unknown msg type in kjsgfx: " + obj.msg)
		}
    }
    this.destroy=function(){}
}
