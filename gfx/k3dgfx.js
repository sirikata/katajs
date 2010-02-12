addCube = function(id) {
    var obj = K3D.createObjectAndAddToScene(id, doc.getElement("cube"), "images/crate.jpg")
	return obj
}

Kata3DGraphics=function(callbackFunction,parentElement) {
    this.callback=callbackFunction;
    this.parent=parentElement;
    this.methodTable={}
    var returnObjById=function( id )
    {
        if (document.getElementById)
            var returnVar = document.getElementById(id);
        else if (document.all)
            var returnVar = document.all[id];
        else if (document.layers)
            var returnVar = document.layers[id];
        return returnVar;
    }
    this.methodTable["Create"]=function(msg) {
		console.log("Create",msg)
		obj = addCube(msg.id)
		if (msg.pos) {
			console.log("  Create pos:",msg.pos)
			obj.setLocX(msg.pos[0])
			obj.setLocY(msg.pos[1])
			obj.setLocZ(msg.pos[2])
		}
    }
    this.methodTable["Move"]=function(msg) {
		console.log("Move",msg)
		obj = scene.getObjectById(msg.id)
		if (msg.pos) {
			console.log("  Move pos:",msg.pos)
			obj.setLocX(msg.pos[0])
			obj.setLocY(msg.pos[1])
			obj.setLocZ(msg.pos[2])
		}
    }
    this.methodTable["Destroy"]=function(msg) {
		console.log("Destroy",msg)
    }
    this.methodTable["MeshShaderUniform"]=function(msg) {
		console.log("MeshShaderUniform",msg)
    }
    this.methodTable["Mesh"]=function(msg) {
		console.log("Mesh",msg)
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
    
    this.send=function(obj) {
        return this.methodTable[obj.msg](obj);
    }
    this.destroy=function(){}
}
