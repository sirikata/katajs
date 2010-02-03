/**
 * @author dbm
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
K3D.addProtoSafely(GLGE.Object, "getPositions", function() {
	for (i in this.mesh.buffers) {
		if(this.mesh.buffers[i].name=="position") posbuf = this.mesh.buffers[i].data 
	}
	return posbuf
})

// does a ray intersect this object? return null or point
K3D.addProtoSafely(GLGE.Object, "rayIntersect", function() {
	
})

K3D.init = function (){
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
	K3D.levelmap=new GLGE.HeightMap("images/map.png",120,120,-50,50,-50,50,0,50);
	K3D.lasttime=0;
	K3D.frameRateBuffer=60;
	K3D.cnt=0;
	K3D.inc=0.2;
	setInterval(K3D.render,15);
	return K3D.gameScene
}

K3D.mouselook = function(){
    if (K3D.mouseovercanvas) {
        var mousepos = K3D.gameScene.mouse.getMousePosition();
        var leftbutton = K3D.gameScene.mouse.isButtonDown(0)
        mousepos.x = mousepos.x - document.getElementById("container").offsetLeft;
        mousepos.y = mousepos.y - document.getElementById("container").offsetTop;
        pdebug("K3D.gameScene.mouse x: " + mousepos.x + " y: " + mousepos.y + " left button: " + leftbutton, 0)
        
        if (mousepos.x && mousepos.y) {
            var obj = K3D.gameScene.pick(mousepos.x, mousepos.y);
        }
        if (leftbutton) {
            if (K3D.oldLeftBtn == false) {
				if (obj && obj.clickable) obj.clickDown(mousepos.x, mousepos.y)
                if (obj && obj != K3D.selectedObj) {
					if (K3D.selectedObj && K3D.selectedObj.selectable) K3D.selectedObj.selectStop(mousepos.x, mousepos.y)
                    if (obj.selectable) obj.selectStart(mousepos.x, mousepos.y)
                    K3D.selectedObj = obj;
                    pdebug("selected: " + K3D.selectedObj.id, 2)
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
                pdebug("hovering over: " + K3D.hoverObj.id, 3)
            }
        }
        K3D.oldLeftBtn = leftbutton
    }
}

K3D.checkkeys = function (){
	var camera=K3D.gameScene.camera;
	camerapos=camera.getPosition();
	camerarot=camera.getRotation();
	var mat=camera.getRotMatrix();
	var trans=mat.x([0,0,-1]);
	var mag=Math.pow(Math.pow(trans.e(1),2)+Math.pow(trans.e(2),2),0.5);
	trans[0]=trans.e(1)/mag;
	trans[1]=trans.e(2)/mag;
	var yinc=0;
	var xinc=0;

	if(K3D.keys.isKeyPressed(GLGE.KI_W)) {yinc=yinc+parseFloat(trans[1]);xinc=xinc+parseFloat(trans[0]);}
	if(K3D.keys.isKeyPressed(GLGE.KI_UP_ARROW)) {yinc=yinc+parseFloat(trans[1]);xinc=xinc+parseFloat(trans[0]);}
	if(K3D.keys.isKeyPressed(GLGE.KI_S)) {yinc=yinc-parseFloat(trans[1]);xinc=xinc-parseFloat(trans[0]);}
	if(K3D.keys.isKeyPressed(GLGE.KI_DOWN_ARROW)) {yinc=yinc-parseFloat(trans[1]);xinc=xinc-parseFloat(trans[0]);}
	if(K3D.keys.isKeyPressed(GLGE.KI_A)) {yinc=yinc+parseFloat(trans[0]);xinc=xinc-parseFloat(trans[1]);}
	if(K3D.keys.isKeyPressed(GLGE.KI_D)) {yinc=yinc-parseFloat(trans[0]);xinc=xinc+parseFloat(trans[1]);}
	if(K3D.keys.isKeyPressed(GLGE.KI_U)) {K3D.inc -= 0.025}
	if(K3D.keys.isKeyPressed(GLGE.KI_J)) {K3D.inc += 0.025}
	if(K3D.keys.isKeyPressed(GLGE.KI_LEFT_ARROW)) {
		camera.setRotY(camerarot.y+0.025);
	}
	if(K3D.keys.isKeyPressed(GLGE.KI_RIGHT_ARROW)) {
		camera.setRotY(camerarot.y-0.025);
	}
	pdebug("K3D.levelmap: " + K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc),5)
	if(K3D.levelmap.getHeightAt(camerapos.x+xinc,camerapos.y)>30) xinc=0;
	if(K3D.levelmap.getHeightAt(camerapos.x,camerapos.y+yinc)>30) yinc=0;
    
    if (K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) > 30) {
        yinc = 0;
        xinc = 0;
    }
    else {
        camera.setLocZ(K3D.levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) + 8);
    }
	if(xinc!=0 || yinc!=0){
		camera.setLocY(camerapos.y+yinc);camera.setLocX(camerapos.x+xinc);
	}
	camera.setRotX(1.56-trans[1]*K3D.inc);
	camera.setRotZ(-trans[0]*K3D.inc);
}


K3D.render = function (){
    var now=parseInt(new Date().getTime());
    K3D.cnt=(K3D.cnt+1)%10;
    if(K3D.cnt==0){
	    K3D.frameRateBuffer=Math.round(((K3D.frameRateBuffer*9)+1000/(now-K3D.lasttime))/10);
	    document.getElementById("debug").innerHTML="Frame Rate:"+K3D.frameRateBuffer;
    }
    K3D.lasttime=now;
    K3D.mouselook();
    K3D.checkkeys();
    K3D.gameRenderer.render();
}

// return point at which mouse picks object + distance from camera, or null
// also returns normal
K3D.addProtoSafely(GLGE.Object, "getPickPoint", function(){
    // create raycast from camera to mouse xy
    var cam = K3D.gameScene.camera
    var mro = Matrix.rotMat(cam.getRotX(), cam.getRotY(), cam.getRotZ())
    var mlo = Matrix.transMat(cam.getLocX(), cam.getLocY(), cam.getLocZ())
    var mat = mlo.x(mro) // camera matrix    
    var mousepos = K3D.gameScene.mouse.getMousePosition();
    var w = 900.0
    var h = 500.0
    var mx = mousepos.x - document.getElementById("container").offsetLeft;
    var my = mousepos.y - document.getElementById("container").offsetTop;
    var focal = 1.1							// ad-hack; get from camera perspective matrix & things of that nature
    mx = focal * (mx / w - 0.5)
    my = -focal * (h / w) * (my / h - 0.5)
//    pdebug("mx: " + mx + " my: " + my)
    var v = Vector.create([mx, my, -1, 1]) // camera points along -Z axis
    v = mat.x(v) // transform to camera matrix
    var P0 = [parseFloat(cam.getLocX()), parseFloat(cam.getLocY()), parseFloat(cam.getLocZ())]
    var vP0 = Vector.create(P0)
    var P1 = [v.e(1), v.e(2), v.e(3)]
    var R = [P0, P1]
//    pdebug("R = [[" + R[0] + "],[" + R[1] + "]]")
    // get wall matrix
    mro = Matrix.rotMat(this.getRotX(), this.getRotY(), this.getRotZ()) // our rotation matrix
    mlo = Matrix.transMat(this.getLocX(), this.getLocY(), this.getLocZ()) // our location matrix
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
    for (var i = 0; i < p.length; i += 9) { // for each tri
        var A = Vector.create([sx * p[i], sy * p[i + 1], sz * p[i + 2], 1]) // get vertex points for triangle ABC
        var B = Vector.create([sx * p[i + 3], sy * p[i + 4], sz * p[i + 5], 1])
        var C = Vector.create([sx * p[i + 6], sy * p[i + 7], sz * p[i + 8], 1])
        A = mat.x(A) // convert them to global coords
        B = mat.x(B)
        C = mat.x(C)
        var T = [A.elements.slice(0, 3), B.elements.slice(0, 3), C.elements.slice(0, 3)]
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
		return [minI.elements, mindist, minN]
    }
})

// return pick point of nearest object in olist under cursor, or null if none
// list can include actual objects or string id's
K3D.getNearestObject = function (olist) {
    var dist = 9999999.9
    var place = null
	var hit = null
	var norm = null
    for (var i in olist) {
		var obj = olist[i]
		if (typeof(obj)=="string") obj = K3D.gameScene.getObjectById(obj)
		var pdn = obj.getPickPoint()
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
