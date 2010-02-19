/*  Kata Javascript Graphics Layer
 *  k3d.js
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

K3D = {}

K3D.addProtoSafely = function (cls, proto, func){
    if (cls.prototype[proto] != null) {
        alert("oh no! This prototype already exists: " + proto)
    }
    else {
        cls.prototype[proto] = func
    }
}

// add getObjectById method to Scene

K3D.addProtoSafely(GLGE.Scene, "getObjectById", function(id) {
	for(var i=0; i<this.objects.length; i++) {
		if (this.objects[i].id==id) return this.objects[i]
	}
	return null
})

// add makeDragable to Object.

K3D.addProtoSafely(GLGE.Object, "makeDragable", function(cbStart, cbUpdate) {
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
})

// add makeHoverable to Object.

K3D.addProtoSafely(GLGE.Object, "makeHoverable", function(cbStart, cbEnd) {
	this.hoverable = true
	this.hoverStart = cbStart
	this.hoverStop = cbEnd
})

// add makeSelectable to Object.

K3D.addProtoSafely(GLGE.Object, "makeSelectable", function(cbSelect, cbDeselect) {
	this.selectable = true
	this.selectStart = cbSelect
	this.selectStop = cbDeselect
})

K3D.addProtoSafely(GLGE.Object, "makeClickableCallback", function(cbDown, cbUp) {
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
bugg=0
K3D.addProtoSafely(GLGE.Object, "getPositions", function() {
	var posbuf
	if (this.mesh) {
		for (i in this.mesh.buffers) {
			if (this.mesh.buffers[i].name == "position") 
				posbuf = this.mesh.buffers[i].data
		}
	}
	else {
		pdebug("meshless object: " + this.id + " " + bugg++,8)
	}
	return posbuf
})

// does a ray intersect this object? return null or point
K3D.addProtoSafely(GLGE.Object, "rayIntersect", function() {
	
})

K3D.initComplete = false
K3D.init = function (map){
    //create the GLGE renderer.  
    K3D.gameRenderer = new GLGE.Renderer(document.getElementById('canvas'));
    K3D.gameScene = doc.getElement("mainscene");
    K3D.gameRenderer.setScene(K3D.gameScene);
    
    
	if (K3D.gameScene.mouse) alert("uh oh, method name conflict K3D.gameScene.mouse!")
	K3D.gameScene.mouse = new GLGE.MouseInput(document.getElementById('canvas'));
    K3D.keys = new GLGE.KeyInput();
	K3D.mouseovercanvas=false
	document.getElementById("canvas").onmouseover=function(e){K3D.mouseovercanvas=true;}
	document.getElementById("canvas").onmousemove=function(e){K3D.mouseovercanvas=true;}
	document.getElementById("canvas").onmouseout=function(e){K3D.mouseovercanvas=false;}
    
    K3D.selectedObj = null
    K3D.hoverObj = null
    K3D.oldLeftBtn = false
	if (map) {
		K3D.levelmap = new GLGE.HeightMap(map.image, map.width, map.height, map.lowX, map.upX, map.lowY, map.upY, map.lowZ, map.upZ);
	}
	K3D.lasttime=0;
	K3D.lasttimeFps=0;
	K3D.frameRateBuffer=10;
	K3D.cnt=0;
	K3D.inc=0;

	setInterval(K3D.render,15);
	return K3D.gameScene
}

K3D.mouselook = function(){
    if (K3D.mouseovercanvas) {
        var mousepos = K3D.gameScene.mouse.getMousePosition();
        var leftbutton = K3D.gameScene.mouse.isButtonDown(0)
        mousepos.x = mousepos.x - document.getElementById("container").offsetLeft;
        mousepos.y = mousepos.y - document.getElementById("container").offsetTop;
//        pdebug("K3D.gameScene.mouse x: " + mousepos.x + " y: " + mousepos.y + " left button: " + leftbutton, 0)
        
        if (mousepos.x && mousepos.y) {
//            var obj = K3D.gameScene.pick(mousepos.x, mousepos.y);
            var obj = K3D.gameScene.pickSoft(mousepos.x, mousepos.y);
        }
        if (leftbutton) {
            if (K3D.oldLeftBtn == false) {
				if (obj && obj.clickable) obj.clickDown(mousepos.x, mousepos.y)
                if (obj && obj != K3D.selectedObj) {
					if (K3D.selectedObj && K3D.selectedObj.selectable) K3D.selectedObj.selectStop(mousepos.x, mousepos.y)
                    if (obj.selectable) obj.selectStart(mousepos.x, mousepos.y)
                    K3D.selectedObj = obj;
//                    pdebug("selected: " + K3D.selectedObj.id, 2)
                }
				if (K3D.selectedObj.dragable) K3D.selectedObj.dragStart(mousepos.x, mousepos.y)
            }
			if (K3D.selectedObj.dragable) K3D.selectedObj.dragUpdate(mousepos.x, mousepos.y)
        }
        else {            
            if (obj && obj != K3D.hoverObj) {
				if (K3D.hoverObj && K3D.hoverObj.hoverable) K3D.hoverObj.hoverStop(mousepos.x, mousepos.y)
                K3D.hoverObj = obj;
				if (obj.hoverable) obj.hoverStart(mousepos.x, mousepos.y)
//                pdebug("hovering over: " + K3D.hoverObj.id, 3)
            }
        }
        K3D.oldLeftBtn = leftbutton
    }
}

K3D.checkkeys = function (){
    if (K3D.mouseovercanvas || K3D.forceMovement) {
		var camera = K3D.gameScene.camera;
		camerapos = camera.getPosition();
		camerarot = camera.getRotation();
		var mat = camera.getRotMatrix();
		var trans = mat.x([0, 0, -1]);
		var mag = Math.pow(Math.pow(trans.e(1), 2) + Math.pow(trans.e(2), 2), 0.5);
		var elapsed 		
		var incAmt = K3D.elapsedTime / 1500.0
		if(incAmt > 0.1) incAmt=0.1
		var trans0 = trans.e(1)
		var trans1 = trans.e(2)
		trans[0] = trans.e(1)*incAmt*40 / mag;
		trans[1] = trans.e(2)*incAmt*40 / mag;
		var yinc = 0;
		var xinc = 0;
		
		if (K3D.keys.isKeyPressed(GLGE.KI_W)) {
			yinc = yinc + parseFloat(trans[1]);
			xinc = xinc + parseFloat(trans[0]);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_UP_ARROW) || K3D.forceMovement=="fwd") {
			yinc = yinc + parseFloat(trans[1]);
			xinc = xinc + parseFloat(trans[0]);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_S)) {
			yinc = yinc - parseFloat(trans[1]);
			xinc = xinc - parseFloat(trans[0]);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_DOWN_ARROW) || K3D.forceMovement=="back") {
			yinc = yinc - parseFloat(trans[1]);
			xinc = xinc - parseFloat(trans[0]);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_A)) {
			yinc = yinc + parseFloat(trans[0]);
			xinc = xinc - parseFloat(trans[1]);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_D)) {
			yinc = yinc - parseFloat(trans[0]);
			xinc = xinc + parseFloat(trans[1]);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_U)) {
			K3D.inc -= incAmt
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_J)) {
			K3D.inc += incAmt
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_LEFT_ARROW) || K3D.forceMovement=="left") {
			camera.setRotY(camerarot.y + incAmt);
		}
		if (K3D.keys.isKeyPressed(GLGE.KI_RIGHT_ARROW) || K3D.forceMovement=="right") {
			camera.setRotY(camerarot.y - incAmt);
		}
//		pdebug("K3D.levelmap: " + K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc), 5)
		if (K3D.levelmap) {
//			pdebug("camera: " + camerapos.x.toFixed(2) + ", " + camerapos.y.toFixed(2) + " height: " +
//				K3D.levelmap.getHeightAt(camerapos.x, camerapos.y).toFixed(2) ,1)
			if (K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y) > 30) 
				xinc = 0;
			if (K3D.levelmap.getHeightAt(camerapos.x, camerapos.y + yinc) > 30) 
				yinc = 0;
			
			if (K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) > 30) {
				yinc = 0;
				xinc = 0;
			}
			else {
				camera.setLocZ(K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) + 8);
			}
		}
		if (xinc != 0 || yinc != 0) {
			camera.setLocY(camerapos.y + yinc);
			camera.setLocX(camerapos.x + xinc);
		}
		camera.setRotX(1.56 - trans1 * K3D.inc);
		camera.setRotZ(-trans0 * K3D.inc);
	}
}

K3D.render = function (){
	if (!K3D.initComplete) {
		var c = K3D.gameScene.incompleteObjects()
//		console.log("complete:",c)
		if (c == 0) {
			K3D.initComplete = true
			K3D.gameScene.computeBoundingSpheres()
		}
		else {
		    K3D.gameRenderer.render();					// somehow this pumps a process that needs to occur
			return			
		}
	}

    var now=parseInt(new Date().getTime());
	K3D.elapsedTime = now-K3D.lasttime
    K3D.cnt=(K3D.cnt+1)%10;
    if(K3D.cnt==0){
	    K3D.frameRateBuffer=(10000/(now-K3D.lasttimeFps)).toFixed(1);
		K3D.lasttimeFps=now
	    document.getElementById("debug").innerHTML="Frame Rate:"+K3D.frameRateBuffer;
    }
    K3D.lasttime=now;
    K3D.mouselook();
    K3D.checkkeys();
    K3D.gameRenderer.render();
}

// return point at which mouse picks object + distance from camera, or null
// also returns normal
K3D.addProtoSafely(GLGE.Object, "getPickPoint", function(mx, my, coordType){
    // create raycast from camera to mouse xy
    var cam = K3D.gameScene.camera
    var mro = GLGE.rotateMatrix(cam.getRotX(), cam.getRotY(), cam.getRotZ(), GLGE.ROT_XZY)
    var mlo = GLGE.translateMatrix(cam.getLocX(), cam.getLocY(), cam.getLocZ())
    var mat = mlo.x(mro) // camera matrix    
    if (mx == null || coordType=="pixels") {
		if (mx == null) {
			var mousepos = K3D.gameScene.mouse.getMousePosition();
			mx = mousepos.x - document.getElementById("container").offsetLeft;
			my = mousepos.y - document.getElementById("container").offsetTop;
		}
		var can = document.getElementById("container").getElementsByTagName("canvas")[0]
		var w = parseFloat(can.width)
		var h = parseFloat(can.height)
		var focal = 1.1 // ad-hack; get from camera perspective matrix & things of that nature
		mx = focal * (mx / w - 0.5)
		my = -focal * (h / w) * (my / h - 0.5)
	}
//    pdebug("mx: " + mx + " my: " + my)
    var v = new GLGE.Vec([mx, my, -1, 1]) // camera points along -Z axis
    v = mat.x(v) // transform to camera matrix
    var P0 = [parseFloat(cam.getLocX()), parseFloat(cam.getLocY()), parseFloat(cam.getLocZ())]
    var vP0 = new GLGE.Vec(P0)
    var P1 = [v.e(1), v.e(2), v.e(3)]
    var R = [P0, P1]
//    pdebug("R = [[" + R[0] + "],[" + R[1] + "]]")
    // get wall matrix
    mro = GLGE.rotateMatrix(this.getRotX(), this.getRotY(), this.getRotZ(), GLGE.ROT_XZY) // our rotation matrix
    mlo = GLGE.translateMatrix(this.getLocX(), this.getLocY(), this.getLocZ()) // our location matrix
    mat = mlo.x(mro) // our full matrix
    // scale wall vertices
    var sx = parseFloat(this.getScaleX())
    var sy = parseFloat(this.getScaleY())
    var sz = parseFloat(this.getScaleZ())
    var minI = null
    var mindist = 999999.9
	var minN = null
	// get vertex coords
    var p = this.getPositions()
	var ff = this.mesh.faces.data
	var f = []
	for (i in ff) f[i] = parseInt(ff[i]);				///	FIXME: this is stupid -- shouldn't be strings!
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
})

// return pick point of nearest object in olist under cursor, or null if none
// list can include actual objects or string id's
K3D.getNearestObject = function (olist, x, y, coordType) {
    var dist = 9999999.9
    var place = null
	var hit = null
	var norm = null
    for (var i in olist) {
		var obj = olist[i]
		if (typeof(obj)=="string") obj = K3D.gameScene.getObjectById(obj)
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
K3D.createObjectAndAddToScene = function (id, mesh, texurl, cb) {
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

// line segment of balls, used for editing
// beg, end are GLGE.Vec
K3D.lineSegOfBalls = function(beg, end, num, size, color){
//    console.log("lineSegOfBalls:", beg, end, num, size, color)
    num -= 1
    var div = 1.0 / num
    var delta = [(end.e(1) - beg.e(1)) * div, (end.e(2) - beg.e(2)) * div, (end.e(3) - beg.e(3)) * div]
//    console.log("delta:", delta)
}

/// software-only pick function
K3D.addProtoSafely(GLGE.Scene, "pickSoft", function(x, y) {
	var place_hit_norm = K3D.getNearestObject(this.objects, x, y, "pixels")
	if (place_hit_norm) {
		return this.objects[place_hit_norm[1]]
	}
	return null
})

/// compute bounding sphere, add boundingRadius, boundingCenter
K3D.addProtoSafely(GLGE.Object, "computeBoundingSphere", function(){
    var sx = parseFloat(this.getScaleX())
    var sy = parseFloat(this.getScaleY())
    var sz = parseFloat(this.getScaleZ())
    var p = this.getPositions()
	if (!p) return
    
    // first compute center
    var O = new GLGE.Vec([0, 0, 0])
    for (var i = 0; i < p.length; i+=3) { // for each vertex
        var V = new GLGE.Vec([sx * p[i], sy * p[i+1], sz * p[i+2]])
        O = O.add(V)
    }
    O = O.mul(3.0 / p.length)
	this.boundingCenter = O
	var r = 0
    for (var i = 0; i < p.length; i+=3) { // for each vertex
        var V = new GLGE.Vec([sx * p[i], sy * p[i+1], sz * p[i+2]])
		var d = V.distanceFrom(O)
		if (d > r) r = d
    }
	this.boundingRadius = r
})

K3D.addProtoSafely(GLGE.Scene, "computeBoundingSpheres", function() {
	for (var i in this.objects) {
		this.objects[i].computeBoundingSphere()
	//	console.log("object:", this.objects[i], this.objects[i].id, "radius:", this.objects[i].boundingRadius)
	}
})

//	return count of objects not fully loaded
K3D.addProtoSafely(GLGE.Scene, "incompleteObjects", function() {
	var count = 0
	for (var i in this.objects) {
		if (!this.objects[i].mesh) {
			count ++	
		}
	}
	return count
})
