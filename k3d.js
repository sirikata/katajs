/**
 * @author dbm
 */

function pdebug(s, l){
	if (l === undefined) {
		document.getElementById("dbg").innerHTML += s + "<br>"
	}
	else {
		document.getElementById("dbg" + l).innerHTML = s + "<br>"	
	}
}

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

// add makeDragMovable to Object.  One of a series of draggable options maybe?

addProtoSafely(GLGE.Object, "makeDragMovable", function() {
	this.dragable = true
	this.dragStart = function (mouse_x, mouse_y) {
		this.dragStartMouseX = mouse_x
		this.dragStartMouseY = mouse_y
		this.dragStartLocX = parseFloat(this.getLocX())			///	wtf?
		this.dragStartLocZ = parseFloat(this.getLocZ())		
	}

	this.dragUpdate = function (mouse_x, mouse_y) {
		move_x = mouse_x-this.dragStartMouseX
		move_y = mouse_y-this.dragStartMouseY
		this.setLocX(this.dragStartLocX-move_x*.04)
		this.setLocZ(this.dragStartLocZ-move_y*.04)
		pdebug("dragUpdate x: " + this.getLocX() + " y: " + this.getLocZ(),4)
	}
})

// add makeHoverable to Object.

addProtoSafely(GLGE.Object, "makeHoverable", function() {
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
