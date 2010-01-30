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

addProtoSafely(GLGE.Object, "makeHoverable", function(cbStart, cbEnd) {
	this.hoverable = true
	this.hoverStart = cbStart
	this.hoverStop = cbEnd
})

// add makeSelectable to Object.

addProtoSafely(GLGE.Object, "makeSelectable", function(cbSelect, cbDeselect) {
	this.selectable = true
	this.selectStart = cbSelect
	this.selectStop = cbDeselect
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

function initGLGE(){    
	// GLGE_ is global namespace.  If that bugs you, just think of it as a singleton instance
    //create the renderer.  
    GLGE_gameRenderer = new GLGE.Renderer(document.getElementById('canvas'));
    GLGE_gameScene = doc.getElement("mainscene");
    GLGE_gameRenderer.setScene(GLGE_gameScene);
    
    
	if (GLGE_gameScene.mouse) alert("uh oh, method name conflict GLGE_gameScene.mouse!")
	GLGE_gameScene.mouse = new GLGE.MouseInput(document.getElementById('canvas'));
    GLGE_keys = new GLGE.KeyInput();
	GLGE_mouseovercanvas=false
	document.getElementById("canvas").onmouseover=function(e){GLGE_mouseovercanvas=true;}
	document.getElementById("canvas").onmousemove=function(e){GLGE_mouseovercanvas=true;}
	document.getElementById("canvas").onmouseout=function(e){GLGE_mouseovercanvas=false;}
    
    GLGE_selectedObj = null
    GLGE_hoverObj = null
    GLGE_oldLeftBtn = false
	GLGE_levelmap=new GLGE.HeightMap("images/map.png",120,120,-50,50,-50,50,0,50);
	GLGE_lasttime=0;
	GLGE_frameRateBuffer=60;
	GLGE_cnt=0;
	GLGE_inc=0.2;
	setInterval(render,15);
	return GLGE_gameScene
}

function mouselook(){
    if (GLGE_mouseovercanvas) {
        var mousepos = GLGE_gameScene.mouse.getMousePosition();
        var leftbutton = GLGE_gameScene.mouse.isButtonDown(0)
        mousepos.x = mousepos.x - document.getElementById("container").offsetLeft;
        mousepos.y = mousepos.y - document.getElementById("container").offsetTop;
        pdebug("GLGE_gameScene.mouse x: " + mousepos.x + " y: " + mousepos.y + " left button: " + leftbutton, 0)
        
        if (mousepos.x && mousepos.y) {
            obj = GLGE_gameScene.pick(mousepos.x, mousepos.y);
        }
        if (leftbutton) {
            if (GLGE_oldLeftBtn == false) {
				if (obj && obj.clickable) obj.clickDown(mousepos.x, mousepos.y)
                if (obj && obj != GLGE_selectedObj) {
					if (GLGE_selectedObj && GLGE_selectedObj.selectable) GLGE_selectedObj.selectStop(mousepos.x, mousepos.y)
                    if (obj.selectable) obj.selectStart(mousepos.x, mousepos.y)
                    GLGE_selectedObj = obj;
                    pdebug("selected: " + GLGE_selectedObj.id, 2)
                }
				if (GLGE_selectedObj.dragable) GLGE_selectedObj.dragStart(mousepos.x, mousepos.y)
            }
			if (GLGE_selectedObj.dragable) GLGE_selectedObj.dragUpdate(mousepos.x, mousepos.y)
        }
        else {            
            if (obj && obj != GLGE_hoverObj) {
				if (GLGE_hoverObj && GLGE_hoverObj.hoverable) GLGE_hoverObj.hoverStop(mousepos.x, mousepos.y)
                GLGE_hoverObj = obj;
				if (obj.hoverable) obj.hoverStart(mousepos.x, mousepos.y)
                pdebug("hovering over: " + GLGE_hoverObj.id, 3)
            }
        }
        GLGE_oldLeftBtn = leftbutton
    }
}

function checkkeys(){
	var camera=GLGE_gameScene.camera;
	camerapos=camera.getPosition();
	camerarot=camera.getRotation();
	var trans=camera.getRotMatrix().inverse().x($V([0,0,-1])).flatten();
	var mag=Math.pow(Math.pow(trans[0],2)+Math.pow(trans[1],2),0.5);
	trans[0]=trans[0]/mag;
	trans[1]=trans[1]/mag;
	var yinc=0;
	var xinc=0;

	if(GLGE_keys.isKeyPressed(GLGE.KI_W)) {yinc=yinc+parseFloat(trans[1]);xinc=xinc+parseFloat(trans[0]);}
	if(GLGE_keys.isKeyPressed(GLGE.KI_UP_ARROW)) {yinc=yinc+parseFloat(trans[1]);xinc=xinc+parseFloat(trans[0]);}
	if(GLGE_keys.isKeyPressed(GLGE.KI_S)) {yinc=yinc-parseFloat(trans[1]);xinc=xinc-parseFloat(trans[0]);}
	if(GLGE_keys.isKeyPressed(GLGE.KI_DOWN_ARROW)) {yinc=yinc-parseFloat(trans[1]);xinc=xinc-parseFloat(trans[0]);}
	if(GLGE_keys.isKeyPressed(GLGE.KI_A)) {yinc=yinc+parseFloat(trans[0]);xinc=xinc-parseFloat(trans[1]);}
	if(GLGE_keys.isKeyPressed(GLGE.KI_D)) {yinc=yinc-parseFloat(trans[0]);xinc=xinc+parseFloat(trans[1]);}
	if(GLGE_keys.isKeyPressed(GLGE.KI_U)) {GLGE_inc -= 0.025}
	if(GLGE_keys.isKeyPressed(GLGE.KI_J)) {GLGE_inc += 0.025}
	if(GLGE_keys.isKeyPressed(GLGE.KI_LEFT_ARROW)) {
		camera.setRotY(camerarot.y+0.025);
	}
	if(GLGE_keys.isKeyPressed(GLGE.KI_RIGHT_ARROW)) {
		camera.setRotY(camerarot.y-0.025);
	}
	pdebug("GLGE_levelmap: " + GLGE_levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc),5)
	if(GLGE_levelmap.getHeightAt(camerapos.x+xinc,camerapos.y)>30) xinc=0;
	if(GLGE_levelmap.getHeightAt(camerapos.x,camerapos.y+yinc)>30) yinc=0;
    
    if (GLGE_levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) > 30) {
        yinc = 0;
        xinc = 0;
    }
    else {
        camera.setLocZ(GLGE_levelmap.getHeightAt(camerapos.x + xinc, camerapos.y + yinc) + 8);
    }
	if(xinc!=0 || yinc!=0){
		camera.setLocY(camerapos.y+yinc);camera.setLocX(camerapos.x+xinc);
	}
	camera.setRotX(1.56-trans[1]*GLGE_inc);
	camera.setRotZ(-trans[0]*GLGE_inc);
}


function render(){
    var now=parseInt(new Date().getTime());
    GLGE_cnt=(GLGE_cnt+1)%10;
    if(GLGE_cnt==0){
	    GLGE_frameRateBuffer=Math.round(((GLGE_frameRateBuffer*9)+1000/(now-GLGE_lasttime))/10);
	    document.getElementById("debug").innerHTML="Frame Rate:"+GLGE_frameRateBuffer;
    }
    GLGE_lasttime=now;
    mouselook();
    checkkeys();
    GLGE_gameRenderer.render();
}
