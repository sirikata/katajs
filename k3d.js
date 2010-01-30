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

// add setHighlight method to Object

addProtoSafely(GLGE.Object, "setHighlight", function(status) {
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
		//pdebug("..setHighlight: do nothing. old status-->" + this.status + "<--")
	}
})

// add makeDragable to Object.

addProtoSafely(GLGE.Object, "makeDragable", function(cbStart, cbUpdate) {
	this.dragable = true
	this.dragStartCb = cbStart
	this.dragUpdateCb = cbUpdate
	this.dragStart = function (mouse_x, mouse_y) {
		this.dragStartMouseX = mouse_x
		this.dragStartMouseY = mouse_y
		this.dragStartCb()
	}
	this.dragUpdate = function (mouse_x, mouse_y) {
		this.dragUpdateCb(mouse_x-this.dragStartMouseX, mouse_y-this.dragStartMouseY)
	}
})

// add makeHoverable to Object.

addProtoSafely(GLGE.Object, "makeHoverableCyan", function() {
	this.hoverable = true
	this.hoverStart = function (mouse_x, mouse_y) {
		//pdebug ("hoverStart " + this.id)
		if (this.status != "selected") this.setHighlight("hover")
		//pdebug(".status:"+this.status)
	}

	this.hoverStop = function (mouse_x, mouse_y) {
		//pdebug ("hoverStop " + this.id)
		//pdebug(".status:"+this.status)
		if (this.status != "selected") {
			//pdebug("  setHighlight null")
			this.setHighlight(null)
		}
	}
})

// add makeSelectable to Object.

addProtoSafely(GLGE.Object, "makeSelectablePurple", function() {
	this.selectable = true
	this.selectStart = function (mouse_x, mouse_y) {
		//pdebug ("hoverStart " + this.id)
		this.setHighlight("selected")
		//pdebug(".status:"+this.status)
	}

	this.selectStop = function (mouse_x, mouse_y) {
		//pdebug ("hoverStop " + this.id)
		//pdebug(".status:"+this.status)
		if (this.status == "selected") {
			this.setHighlight(null)
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
