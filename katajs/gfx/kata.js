/*  Kata Javascript Graphics Layer
 *  kata.js
 *
 *  Copyright (c) 2010, katalabs, Inc.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Sirikata nor the names of its contributors may
 *    be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

Kata.include("katajs/gfx/ray_tri.js")

KJS = {}

KJS.addProtoSafely = function (cls, proto, func){
    if (cls.prototype[proto] != null) {
        alert("oh no! This prototype already exists: " + proto)
    }
    else {
        cls.prototype[proto] = func
    }
}

if (GLGE.Scene.prototype.getRoots==null) GLGE.Scene.prototype.getRoots = GLGE.Scene.prototype.getObjects

// add getObjectById method to Scene

KJS.addProtoSafely(GLGE.Scene, "getObjectById", function(id) {
	for(var i=0; i<this.getRoots().length; i++) {
		if (this.getRoots()[i].getRef()==id) return this.getRoots()[i]
	}
	return null
})

KJS.addProtoSafely(GLGE.Scene, "getObjectsById", function(id) {
	var o = []
	for(var i=0; i<this.getRoots().length; i++) {
		if (this.getRoots()[i].getRef()==id) o.push(this.getRoots()[i])
	}
	return o
})

KJS.addProtoSafely(GLGE.Scene, "addPickable", function(id) {
	if (this.pickable.indexOf(id)<0) this.pickable.push(id)
})

KJS.ObjectEx = function () {}

// add makeDragable to Object.
KJS.ObjectEx.prototype.makeDragable = function(cbStart, cbUpdate) {
	this.dragable = true
	this.dragStartCb = cbStart
	this.dragUpdateCb = cbUpdate
	this.dragStart = function (mouse_x, mouse_y) {
		this.dragStartMouseX = mouse_x
		this.dragStartMouseY = mouse_y
		this.dragStartCb(mouse_x, mouse_y)
	}
	this.dragUpdate = function (mouse_x, mouse_y) {
		this.dragUpdateCb(mouse_x-this.dragStartMouseX, mouse_y-this.dragStartMouseY)
	}
	KJS.gameScene.addPickable(this.getRef())
}

// add makeHoverable to Object.
KJS.ObjectEx.prototype.makeHoverable = function(cbStart, cbEnd) {
	this.hoverable = true
	this.hoverStart = cbStart
	this.hoverStop = cbEnd
	KJS.gameScene.addPickable(this.getRef())
}

// add makeSelectable to Object.
KJS.ObjectEx.prototype.makeSelectable = function(cbSelect, cbDeselect) {
	this.selectable = true
	this.selectStart = cbSelect
	this.selectStop = cbDeselect
	KJS.gameScene.addPickable(this.getRef())
}

KJS.ObjectEx.prototype.makeClickableCallback = function(cbDown, cbUp) {
	this.clickable = true
	this.clickCallbackDown = cbDown
	this.clickCallbackUp = cbUp
	this.clickDown = function (mouse_x, mouse_y) {
		if (this.clickCallbackDown) this.clickCallbackDown(mouse_x, mouse_y)
	}
	this.clickUp = function (mouse_x, mouse_y) {
		if (this.clickCallbackUp) this.clickCallbackUp(mouse_x, mouse_y)
	}
	KJS.gameScene.addPickable(this.getRef())
}

// get position buffer
KJS.ObjectEx.prototype.getPositions = function() {
	var posbuf
	if (this.mesh) {
		for (i=0; i<this.mesh.buffers.length; i++) {
			if (this.mesh.buffers[i].name == "position") 
				posbuf = this.mesh.buffers[i].data
		}
	}
	return posbuf
}

KJS.initComplete = false
KJS.init = function (map, objectcount, cb){
	if (cb) KJS.onInitComplete = cb
    //create the GLGE renderer.  
    KJS.gameRenderer = new GLGE.Renderer(document.getElementById('canvas'));
    KJS.gameScene = doc.getElement("mainscene");
	KJS.gameScene.objectsToLoad=objectcount
	KJS.gameScene.pickable = []
	KJS.gameScene.scriptedObjects = []
    KJS.gameRenderer.setScene(KJS.gameScene);
    
	if (KJS.gameScene.mouse) alert("uh oh, method name conflict KJS.gameScene.mouse!")
	KJS.gameScene.mouse = new GLGE.MouseInput(document.getElementById('canvas'));
    KJS.keys = new GLGE.KeyInput();
	KJS.mouseovercanvas=false
	document.getElementById("canvas").onmouseover=function(e){KJS.mouseovercanvas=true;}
	document.getElementById("canvas").onmousemove=function(e){KJS.mouseovercanvas=true;}
	document.getElementById("canvas").onmouseout=function(e){KJS.mouseovercanvas=false;}
    
    KJS.selectedObj = {}			// to avoid some null refs
    KJS.hoverObj = null
    KJS.oldLeftBtn = false
	if (map) {
		KJS.levelmap = new GLGE.HeightMap(map.image, map.width, map.height, map.lowX, map.upX, map.lowY, map.upY, map.lowZ, map.upZ);
	}
	KJS.lasttime=0;
	KJS.lasttimeFps=0;
	KJS.frameRateBuffer=10;
	KJS.cnt=0;
	KJS.inc=-0.025;

	setInterval(KJS.render,15);
	return KJS.gameScene
}

g_noselection = {}

KJS.mouselook = function(){
//	KJS.gameScene.picker = KJS.gameScene.pick
	KJS.gameScene.picker = KJS.gameScene.pickSoft

    if (KJS.mouseovercanvas) {
        var mousepos = KJS.gameScene.mouse.getMousePosition();
        var leftbutton = KJS.gameScene.mouse.isButtonDown(0)
        mousepos.x = mousepos.x - document.getElementById("container").offsetLeft;
        mousepos.y = mousepos.y - document.getElementById("container").offsetTop;
//        pdebug("KJS.gameScene.mouse x: " + mousepos.x + " y: " + mousepos.y + " left button: " + leftbutton, 0)
        
        if (mousepos.x && mousepos.y) {
            var obj = KJS.gameScene.picker(mousepos.x, mousepos.y, KJS.gameScene.hoverable);			
        }
        if (leftbutton) {
            if (KJS.oldLeftBtn == false) {
	            var obj = KJS.gameScene.picker(mousepos.x, mousepos.y, KJS.gameScene.pickable);
				if (obj==null) KJS.selectedObj = g_noselection
				if (obj && obj.clickable) obj.clickDown(mousepos.x, mousepos.y)
                if (obj && obj != KJS.selectedObj) {
					if (KJS.selectedObj && KJS.selectedObj.selectable) KJS.selectedObj.selectStop(mousepos.x, mousepos.y)
                    if (obj.selectable) obj.selectStart(mousepos.x, mousepos.y)
                    KJS.selectedObj = obj;
//                    pdebug("selected: " + KJS.selectedObj.id, 2)
                }
				if (KJS.selectedObj.dragable) KJS.selectedObj.dragStart(mousepos.x, mousepos.y)
            }
			if (KJS.selectedObj.dragable) KJS.selectedObj.dragUpdate(mousepos.x, mousepos.y)
        }
        else {
            if (obj && obj != KJS.hoverObj) {
				if (obj.hoverable) obj.hoverStart(mousepos.x, mousepos.y)
				if (KJS.hoverObj && KJS.hoverObj.hoverable) KJS.hoverObj.hoverStop(mousepos.x, mousepos.y, obj)
                KJS.hoverObj = obj;
//                pdebug("hovering over: " + KJS.hoverObj.id, 3)
            }
			if (obj == null && KJS.hoverObj && KJS.hoverObj.hoverable) {
				KJS.hoverObj.hoverStop(mousepos.x, mousepos.y)
				KJS.hoverObj=null
			}
        }
        KJS.oldLeftBtn = leftbutton
    }
}

KJS.checkkeys = function (){
    if (KJS.mouseovercanvas || KJS.forceMovement) {
		var camera = KJS.gameScene.camera;
		camerapos = camera.getPosition();
		camerarot = camera.getRotation();
		var mat = camera.getRotMatrix();
		var trans = mat.mul([0, 0, -1, 0]);
		var mag = Math.pow(Math.pow(trans.e(1), 2) + Math.pow(trans.e(2), 2), 0.5);
		var incAmt = KJS.elapsedTime / 1500.0
		if(incAmt > 0.1) incAmt=0.1
		var trans0 = trans.e(1)
		var trans1 = trans.e(2)
		trans[0] = trans.e(1)*incAmt*40 / mag;
		trans[1] = trans.e(2)*incAmt*40 / mag;
		var yinc = 0;
		var xinc = 0;
		
		if (KJS.keys.isKeyPressed(GLGE.KI_W)) {
			yinc = yinc + parseFloat(trans[1]);
			xinc = xinc + parseFloat(trans[0]);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_UP_ARROW) || KJS.forceMovement=="fwd") {
			yinc = yinc + parseFloat(trans[1]);
			xinc = xinc + parseFloat(trans[0]);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_S)) {
			yinc = yinc - parseFloat(trans[1]);
			xinc = xinc - parseFloat(trans[0]);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_DOWN_ARROW) || KJS.forceMovement=="back") {
			yinc = yinc - parseFloat(trans[1]);
			xinc = xinc - parseFloat(trans[0]);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_A)) {
			yinc = yinc + parseFloat(trans[0]);
			xinc = xinc - parseFloat(trans[1]);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_D)) {
			yinc = yinc - parseFloat(trans[0]);
			xinc = xinc + parseFloat(trans[1]);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_U)) {
			KJS.inc -= incAmt
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_J)) {
			KJS.inc += incAmt
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_LEFT_ARROW) || KJS.forceMovement=="left") {
			camera.setRotY(camerarot.y + incAmt);
		}
		if (KJS.keys.isKeyPressed(GLGE.KI_RIGHT_ARROW) || KJS.forceMovement=="right") {
			camera.setRotY(camerarot.y - incAmt);
		}
//		pdebug("KJS.levelmap: " + KJS.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc), 5)
		if (KJS.levelmap) {
//			pdebug("camera: " + camerapos.x.toFixed(2) + ", " + camerapos.y.toFixed(2) + " height: " +
//				KJS.levelmap.getHeightAt(camerapos.x, camerapos.y).toFixed(2) ,1)
			if (KJS.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y) > 30) 
				xinc = 0;
			if (KJS.levelmap.getHeightAt(camerapos.x, camerapos.y + yinc) > 30) 
				yinc = 0;
			
			if (KJS.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) > 30) {
				yinc = 0;
				xinc = 0;
			}
			else {
				camera.setLocZ(KJS.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) + 8);
			}
		}
		if (xinc != 0 || yinc != 0) {
			camera.setLocY(camerapos.y + yinc);
			camera.setLocX(camerapos.x + xinc);
		}
		camera.setRotX(1.56 - trans1 * KJS.inc);
		camera.setRotZ(-trans0 * KJS.inc);
	}
}

KJS.runScripts = function () {
	for (var i=0; i<KJS.gameScene.scriptedObjects.length; i++) {
		KJS.gameScene.scriptedObjects[i].frameScript(KJS.elapsedTime)
	}
}

KJS.objectInitCallbacks={}
KJS.addObjectInit = function (id, cb) {
	KJS.objectInitCallbacks[id] = cb
}

KJS.render = function (){
	if (KJS.onInitComplete && !KJS.initComplete) {		// if we have a callback, check
		var c = KJS.gameScene.incompleteObjects()
		if (c == 0) {
			KJS.initComplete = true
			KJS.gameScene.computeBoundingSpheres()
			KJS.onInitComplete()
		}
		else {
		    KJS.gameRenderer.render();					// somehow this pumps a process that needs to occur
			return			
		}
	}
	for (id in KJS.objectInitCallbacks) {
		var o = KJS.gameScene.getObjectById(id)
		if (o) {
			if (o.getMeshObjects().length > 0) {		// wait for mesh dl FIXME: what about multi-mesh?
				KJS.objectInitCallbacks[id](o)
				delete KJS.objectInitCallbacks[id]
			}
		}
	}

    var now=parseInt(new Date().getTime());
	KJS.elapsedTime = now-KJS.lasttime
    KJS.cnt=(KJS.cnt+1)%10;
    if(KJS.cnt==0){
	    KJS.frameRateBuffer=(10000/(now-KJS.lasttimeFps)).toFixed(1);
		KJS.lasttimeFps=now
		var dbg = document.getElementById("debug")
	    if (dbg) dbg.innerHTML="Frame Rate:"+KJS.frameRateBuffer;
    }
    KJS.lasttime=now;
    KJS.mouselook();
    KJS.checkkeys();
	KJS.runScripts();
    KJS.gameRenderer.render();
}

// return point at which mouse picks object + distance from camera, or null
// also returns normal
KJS.ObjectEx.prototype.getPickPoint = function(mx, my, coordType){
    // create raycast from camera to mouse xy
	var mobjs = this.getMeshObjects()
	if (mobjs.length==0) return null
	var mesh = mobjs[0].mesh
    if (mx == null || coordType=="pixels") {
		if (mx == null) {
			var mousepos = KJS.gameScene.mouse.getMousePosition();
			mx = mousepos.x - document.getElementById("container").offsetLeft;
			my = mousepos.y - document.getElementById("container").offsetTop;
		}
		var can = document.getElementById("container").getElementsByTagName("canvas")[0]
		var w = parseFloat(can.width)
		var h = parseFloat(can.height)
		var focal = 1.03 // ad-hack; get from camera perspective matrix & things of that nature
		mx = focal * (mx / w - 0.5)
		my = -focal * (h / w) * (my / h - 0.5)
	}
    var cam = KJS.gameScene.camera
    var mro = GLGE.rotateMatrix(cam.getRotX(), cam.getRotY(), cam.getRotZ(), GLGE.ROT_XZY)
    var mlo = GLGE.translateMatrix(cam.getLocX(), cam.getLocY(), cam.getLocZ())
    var mat = mlo.x(mro) // camera matrix    
//    pdebug("mx: " + mx + " my: " + my)
    var v = new GLGE.Vec([mx, my, -1, 1]) // camera points along -Z axis
    v = mat.x(v) // transform to camera matrix
    var P0 = [parseFloat(cam.getLocX()), parseFloat(cam.getLocY()), parseFloat(cam.getLocZ())]
    var vP0 = new GLGE.Vec(P0)
	if (!this.rayVsBoundingSphere(vP0, new GLGE.Vec([v.e(1), v.e(2), v.e(3)]) ) ) {
		return null
	}
    var P1 = [v.e(1), v.e(2), v.e(3)]
    var R = [P0, P1]
//    pdebug("R = [[" + R[0] + "],[" + R[1] + "]]")
    // get wall matrix
	var root = this.getRoot()
    mro = GLGE.rotateMatrix(root.getRotX(), root.getRotY(), root.getRotZ(), GLGE.ROT_XZY) // our rotation matrix
    mlo = GLGE.translateMatrix(root.getLocX(), root.getLocY(), root.getLocZ()) // our location matrix
    mat = mlo.x(mro) // our full matrix
    // scale wall vertices
    var sx = parseFloat(root.getScaleX())
    var sy = parseFloat(root.getScaleY())
    var sz = parseFloat(root.getScaleZ())
    var minI = null
    var mindist = 999999.9
	var minN = null
	// get vertex coords
    var p = mobjs[0].getPositions()
	var ff = mesh.faces.data
	var f = []
	for (i=0; i<ff.length; i++) f[i] = parseInt(ff[i]);				///	FIXME: this is stupid -- shouldn't be strings!
//	console.log(p,f)
    for (var i = 0; i < f.length; i += 3) { // for each tri
        var A = new GLGE.Vec([sx * p[f[i]*3], sy * p[f[i]*3 + 1], sz * p[f[i]*3 + 2], 1]) // get vertex points for triangle ABC
        var B = new GLGE.Vec([sx * p[f[i+1]*3], sy * p[f[i+1]*3 + 1], sz * p[f[i+1]*3 + 2], 1])
        var C = new GLGE.Vec([sx * p[f[i+2]*3], sy * p[f[i+2]*3 + 1], sz * p[f[i+2]*3 + 2], 1])
        A = mat.x(A) // convert them to global coords
        B = mat.x(B)
        C = mat.x(C)
        var T = [A.data.slice(0, 3), B.data.slice(0, 3), C.data.slice(0, 3)]
        //		pdebug("T: " + T)
		var N = []
        var I = ray_tri_intersect(R, T, N)
        if (I) {
            dist = vP0.distanceFrom(I)
            if (dist < mindist) {
                mindist = dist
                minI = I
				minN = N[0]
            }
        }
    }
    if (minI == null) {
		return null
    }
    else {
		return [minI.data, mindist, minN]
    }
}

// return pick point of nearest object in olist under cursor, or null if none
// list can include actual objects or string id's
KJS.getNearestObject = function (olist, x, y, coordType) {
    var dist = 9999999.9
    var place = null
	var hit = null
	var norm = null
    for (var i=0; i<olist.length; i++) {
		var obj = olist[i]
		if (typeof(obj)=="string") obj = KJS.gameScene.getObjectById(obj)
		if (!obj) continue
		var pdn = obj.getPickPoint(x,y,coordType)
        if (pdn) {
            if (pdn[1] < dist) {
                place = pdn[0]
                dist = pdn[1]
				hit = i
				norm = pdn[2]
            }
        }
    }
	if (place)
		return [place, hit, norm]
	return null
}

// create a standard texture-mapped object with new material & texture; add to the scene
// if no texture, do not create material
KJS.createObjectAndAddToScene = function (id, mesh, texurl, cb) {
	var obj = new GLGE.Object()
	obj.setId(id)
	obj.setMesh(mesh)
	if (texurl) {
		var ml = new GLGE.MaterialLayer(0,GLGE.M_COLOR,GLGE.UV1,null,null)
		var mat = new GLGE.Material()
		mat.id = id + "_mat"
		var tx = new GLGE.Texture(texurl, cb)
		ml.setTexture(tx)
		mat.addTexture(tx)
		mat.addMaterialLayer(ml)
		obj.setMaterial(mat)
	}
	scene.addObject(obj)
	return obj
}

/*
// rewrite the Texture class (this may have to change -- should be incorporated into GLGE)
GLGE.Texture=function(url, cb){
	this.image=new Image();
	this.image.texture=this;
	this.cbOnLoad=cb
	this.image.onload = function(){
		this.texture.state=1;
		if (this.texture.cbOnLoad) {
			this.texture.cbOnLoad(this)
		}
	}
	this.image.src=url;	
	this.state=0;
	this.glTexture=null;
}
*/
// line segment of balls, used for editing
// beg, end are GLGE.Vec
KJS.lineSegOfBalls = function(beg, end, num, size, color){
//    console.log("lineSegOfBalls:", beg, end, num, size, color)
    num -= 1
    var div = 1.0 / num
    var delta = [(end.e(1) - beg.e(1)) * div, (end.e(2) - beg.e(2)) * div, (end.e(3) - beg.e(3)) * div]
//    console.log("delta:", delta)
}

/// software-only pick function
KJS.addProtoSafely(GLGE.Scene, "pickSoft", function(x, y, objlist){
	//	objlist=null
	if (objlist == null) {
		objlist = this.pickable
	}
	var s = ""
	for (var i = 0; i < objlist.length; i++) {
		s += objlist[i] + " "
	}
	var place_hit_norm = KJS.getNearestObject(objlist, x, y, "pixels")
	if (place_hit_norm) {
		return this.getObjectById(objlist[place_hit_norm[1]])
	}
	return null
})

///	given a thing, dig in & find all the objects with meshes
/// tried to add this to Groups, but the groups in scene.groups doesn't seem to have a Groups prototype
///	adding to Collada too now
KJS.ObjectEx.prototype.getMeshObjects = function () {
//	console.log("getMeshObjects on:", o)
	var objs = []
	if (this.mesh) {
//		console.log("  mesh obj:",this)
		objs.push(this)
	}
	if (this.objects) {
//		console.log("  mo objects:", this.objects.length)
		for(var i=0; i<this.objects.length; i++) {
//			console.log("    i:",i)
			objs = objs.concat(this.objects[i].getMeshObjects())
		}
	}
//	console.log("getMeshObjects returns:", objs)
	return objs
}

/// compute bounding sphere, add boundingRadius, boundingCenter
KJS.ObjectEx.prototype.computeBoundingSphere = function(){
	root = this.getRoot()								///	give all objects the bounding sphere of the group
    var sx = parseFloat(root.getScaleX())
    var sy = parseFloat(root.getScaleY())
    var sz = parseFloat(root.getScaleZ())
    var p = this.getPositions()
	if (!p) return
    
    // first compute center
    var O = new GLGE.Vec([0, 0, 0])
    for (var i = 0; i < p.length; i+=3) { // for each vertex
        var V = new GLGE.Vec([sx * p[i], sy * p[i+1], sz * p[i+2]])
        O = GLGE.addVec3(O, V)
    }
	var k = 3.0 / p.length
	O[0]*= k
	O[1]*=k
	O[2]*=k
	this.boundingCenter = O
	var r = 0
    for (var i = 0; i < p.length; i+=3) { // for each vertex
        var V = new GLGE.Vec([sx * p[i], sy * p[i+1], sz * p[i+2]])
		var d = GLGE.distanceVec3(V, O)
		if (d > r) r = d
    }
	this.boundingRadius = r
}

KJS.addProtoSafely(GLGE.Scene, "computeBoundingSpheres", function() {
	for (var i=0; i<this.getRoots().length; i++) {
		this.getRoots()[i].computeBoundingSphere()
	}
})

//	return count of objects not fully loaded
bugg=0
KJS.addProtoSafely(GLGE.Scene, "incompleteObjects", function() {
	if(bugg) return
	if (this.getRoots().length < this.objectsToLoad) return this.objectsToLoad-this.getRoots().length
	var count = 0
	var roots = this.getRoots()
	for (i=0; i<roots.length; i++) {
		if (roots[i].getMeshObjects==null) {
			console.log("obj lacks method:", roots[i])
			bugg++
		}
		if ( (!roots[i].getMeshObjects().length) || (!roots[i].getRef()) ){
			count ++	
		}
	}
	return count
})

// remove object from scene FIXME: only works for atomic objects, not Groups or Collada
KJS.addProtoSafely(GLGE.Scene, "removeObjectById", function(id) {
	var j = null
	var temp
	for (var i=0; i<this.objects.length; i++) {
		if (this.objects[i].getRef() == id) {
			j = i
			break
		}
	}
	if (j != null) {
		this.objects[i] = this.objects[this.objects.length-1]
		this.objects.pop()
	}
	j = null
	for (var i=0; i<this.pickable.length; i++) {
		if (this.pickable[i] == id) {
			j = i
			break
		}
	}
	if (j != null) {
		this.pickable[i] = this.pickable[this.pickable.length-1]
		this.pickable.pop()
	}
})

// test ray against our bounding sphere
KJS.ObjectEx.prototype.rayVsBoundingSphere = function(RayBeg, RayEnd){
	if (this.boundingRadius == null) {
		if (this.mesh) {
			this.computeBoundingSphere()			// ech, gotta do it here due to async mesh load
		}
		else {
			return true 							// better safe than sorry!
		}
	}
	var ret;
	var c;
	
	// gotta rotate boundingCenter by our matrix (FIXME: this is all crap!  Objects should be normed with proper centers)
	var root = this.getRoot()
	if (root.getRotX() || root.getRotY() || root.getRotZ()) {
		var mat = GLGE.rotateMatrix([root.getRotX(), root.getRotY(), root.getRotZ()], GLGE.ROT_XZY)
		c = mat.cross(this.boundingCenter)
		c = new GLGE.Vec([c.e(1), c.e(2), c.e(3)])		// make it length 3
	}
	else {
		c = this.boundingCenter
	}
	var S = c.add([parseFloat(root.getLocX()),parseFloat(root.getLocY()),parseFloat(root.getLocZ())])
	var r = this.boundingRadius
	var d = S.distanceFrom(RayBeg)					// distance from ray origin to sphere center
	if (d < r) 
		ret = true // origin is inside sphere
	else {
		var a = S.sub(RayBeg).angle(RayEnd.sub(RayBeg)) // angle between ray and center of sphere
		if (a > 1.5708) {
			ret = false // sphere is behind us
		}
		else {
			var d2 = Math.sin(a) * d // distance from sphere center to nearest point on ray
			if (d2 < r) {
				ret = true
			}
			else {
				ret = false
			}
		}
	}
	return ret
}

//console.log("GLGE:", GLGE)
GLGE.augment(KJS.ObjectEx, GLGE.Object)
GLGE.augment(KJS.ObjectEx, GLGE.Group)
GLGE.augment(KJS.ObjectEx, GLGE.Collada)
