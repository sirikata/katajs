/**
 * @author dbm
 */

function addProtoSafely(cls, proto, func){
    if (cls.prototype[proto] != null) {
        alert("oh no! This prototype already exists: " + proto)
    }
    else {
        cls.prototype[proto] = func
    }
}

// add getObjectById method to Scene

addProtoSafely(GLGE.Scene, "getObjectById", function(id) {
	for(var i=0; i<this.objects.length; i++) {
		if (this.objects[i].id==id) return this.objects[i]
	}
	return null
})

// add setStatus method to Object

addProtoSafely(GLGE.Object, "setStatus", function(status) {
    if (status != this.status) {
        if (status == null) {
			//pdebug("..set material to: " + this.original_material)
            this.setMaterial(this.original_material)
        }
        else {
            if (this.status == null) {
                this.original_material = this.getMaterial()
            }
			//pdebug("..set material to: " + status + "_mat")
            this.setMaterial(eval(status + "_mat"))
        }
		this.status = status
		//pdebug("..just set this.status to:"+this.status)
    }
	else {
		//pdebug("..setStatus: do nothing. old status-->" + this.status + "<--")
	}
})

// add makeDragable to Object.

addProtoSafely(GLGE.Object, "makeDragableMove", function() {
	this.dragable = true
	this.dragStart = function (mouse_x, mouse_y) {
		this.dragStartMouseX = mouse_x
		this.dragStartMouseY = mouse_y
		this.dragStartLocX = parseFloat(this.getLocX())			///	wtf? strings?
		this.dragStartLocZ = parseFloat(this.getLocZ())		
		this.dragStartRotX = parseFloat(this.getRotX())
		this.dragStartRotZ = parseFloat(this.getRotZ())		
	}

	this.dragUpdate = function (mouse_x, mouse_y) {
		move_x = mouse_x-this.dragStartMouseX
		move_y = mouse_y-this.dragStartMouseY
		this.setLocX(this.dragStartLocX-move_x*.04)
		this.setLocZ(this.dragStartLocZ-move_y*.04)
//		this.setRotZ(this.dragStartRotZ+move_x*.02)
//		this.setRotX(this.dragStartRotX-move_y*.02)
//		pdebug("dragUpdate Z: " + this.getRotZ() + " X: " + this.getRotX() + " mat: " + this.getModelMatrix().elements,4)
	}
})

// add makeHoverable to Object.

addProtoSafely(GLGE.Object, "makeHoverableCyan", function() {
	this.hoverable = true
	this.hoverStart = function (mouse_x, mouse_y) {
		//pdebug ("hoverStart " + this.id)
		if (this.status != "selected") this.setStatus("hover")
		//pdebug(".status:"+this.status)
	}

	this.hoverStop = function (mouse_x, mouse_y) {
		//pdebug ("hoverStop " + this.id)
		//pdebug(".status:"+this.status)
		if (this.status != "selected") {
			//pdebug("  setStatus null")
			this.setStatus(null)
		}
	}
})

// add makeSelectable to Object.

addProtoSafely(GLGE.Object, "makeSelectablePurple", function() {
	this.selectable = true
	this.selectStart = function (mouse_x, mouse_y) {
		//pdebug ("hoverStart " + this.id)
		this.setStatus("selected")
		//pdebug(".status:"+this.status)
	}

	this.selectStop = function (mouse_x, mouse_y) {
		//pdebug ("hoverStop " + this.id)
		//pdebug(".status:"+this.status)
		if (this.status == "selected") {
			this.setStatus(null)
		}
	}
})

addProtoSafely(GLGE.Object, "makeClickableCallback", function(cbDown, cbUp) {
	this.clickable = true
	this.clickCallbackDown = cbDown
	this.clickCallbackUp = cbUp
	this.clickDown = function (mouse_x, mouse_y) {
		if (this.clickCallbackDown) this.clickCallbackDown(mouse_x, mouse_y)
	}
	this.clickUp = function (mouse_x, mouse_y) {
		if (this.clickCallbackUp) this.clickCallbackUp(mouse_x, mouse_y)
	}
})

// get position buffer
addProtoSafely(GLGE.Object, "getPositions", function() {
	for (i in this.mesh.buffers) {
		if(this.mesh.buffers[i].name=="position") posbuf = this.mesh.buffers[i].data 
	}
	return posbuf
})

// does a ray intersect this object? return null or point
addProtoSafely(GLGE.Object, "rayIntersect", function() {
	
})
