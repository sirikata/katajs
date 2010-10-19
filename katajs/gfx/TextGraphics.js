/**
 *@constructor
 */
TextGraphics=function(callbackFunction,parentElement) {
    var thus = this;
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
        var div=document.createElement("div");
        div.style.padding="0.0em";
        div.style.position="absolute"
        div.style.border="solid 10px #10107c"
        div.style.backgroundColor="#000008"; 
        div.style.width = "300px";
        div.style.height = "300px";
        div.style.color="#ffffff"; 
        div.style.left="0px";
        div.style.top="0px";
        div.style.zIndex="1";
        div.id=msg.id;
        if (msg.parent) {
            element=returnObjById(msg.parent);
            if (element) {
                element.appendChild(div);
            }else {
                parentElement.appendChild(div);
            }
        }else {
            parentElement.appendChild(div);
        }
        div.innerHTML='<p class="alignleft">Object Properties</p>';
        thus.methodTable["Move"](msg);
    }
    this.methodTable["Move"]=function(msg) {
        element=returnObjById(msg.id);
        if (msg.pos && msg.pos.length == 3) {
            element.style.left=msg.pos[0]*10+"px";
            element.style.top=msg.pos[1]*10+"px";
            element.style.zIndex=msg.pos[2];
            element.style.borderColor="rgb("+(msg.pos[2]*10)+","+(msg.pos[2]*10)+",124)";
        }
        if (msg.scale) {
            var xscale = Math.sqrt(msg.scale[0]*msg.scale[0]+msg.scale[1]*msg.scale[1]);
            var yscale = Math.sqrt(msg.scale[0]*msg.scale[0]+msg.scale[2]*msg.scale[2]);
            element.style.width = (300*xscale)+"px";
            element.style.height = (300*yscale)+"px";
        }
    }
    this.methodTable["Destroy"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            div.parentNode.removeChild(div);        
        }
    }
    var getOrCreateP=function(elementName) {
        var q=returnObjById(elementName);        
        if(q) {
            
        }else {
            q=document.createElement("p");
            q.id=elementName;
        }
        return q;
    }
    this.methodTable["MeshShaderUniform"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=getOrCreateP("Uniform"+msg.name+msg.id);
            q.innerHTML="Uniform "+msg.name+"="+msg.value;
            div.appendChild(q);
        }        
    }
    this.methodTable["Mesh"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=getOrCreateP("Mesh"+msg.id);
            q.innerHTML="Mesh "+msg.mesh;
            div.appendChild(q);
        }        
    }
    var destroyX=function(msg,X) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=returnObjById(X+msg.id);
            if (q) {
                div.removeChild(q);
            }
        }
    }
    this.methodTable["DestroyMesh"]=function(msg) {
        destroyX(msg,"Mesh");
    }
    this.methodTable["Light"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=getOrCreateP("Light"+msg.id);
            q.innerHTML="Light "+msg.type;
            div.appendChild(q);
        }        
    }
    this.methodTable["DestroyLight"]=function(msg) {
        destroyX(msg,"Light");
    }
    
    this.methodTable["Camera"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=getOrCreateP("Camera"+msg.id);
            q.innerHTML="Camera "+msg.primary;
            div.appendChild(q);
        }        
    }
    this.methodTable["AttachCamera"]=function(msg) {
        if (msg.id) {
            var div=returnObjById(msg.id);
            if (div) {
                var q=getOrCreateP(msg.texname+"CameraAttachment"+msg.id);
                q.innerHTML="Camera "+msg.camid+" attached to texture "+msg.texname;
                div.appendChild(q);
            }
        }else {
            destroyX(msg,msg.texname+"CameraAttachment");
        }
    }
    this.methodTable["DestroyCamera"]=function(msg) {
        destroyX(msg,"Camera");
    }

    this.methodTable["IFrame"]=function(msg) {

        var div=returnObjById(msg.id);
        if (div) {
            var q=returnObjById("IFrame"+msg.id);        
            if(q) {
                
            }else {
                q=document.createElement("iframe");                
                q.id="IFrame"+msg.id;
            }
            q.setAttribute("src",msg.uri);
            div.appendChild(q);
        }        
    }
    this.methodTable["DestroyIFrame"]=function(msg) {
        destroyX(msg,"IFrame");
    }

    this._testInputCounter=0;               /// kluge to force some fake input for testing
    this.send=function(obj) {
        if (obj.msg=="Create" || obj.msg=="Camera" || obj.msg=="AttachCamera") console.log("ENVJSTEST:",obj.msg, obj.id);            
        if (obj.msg=="Move") console.log("ENVJSTEST:", obj.msg, obj.id, obj.pos, obj.orient, obj.vel, obj.scale);            
        if (obj.msg=="Mesh") console.log("ENVJSTEST:", obj.msg, obj.id, obj.mesh);
        console.log("TextGraphics.send:", obj.msg, obj.id, obj, "--------------------")
        console.show && console.show(obj, "TextGraphics.send:")
        var msg;
        if (this._testInputCounter++ == 4) {
            msg = {
                msg: "keydown",
                event: {
                    keyCode: 65,
                    shiftKey: false
                }
            };
            if (this._inputCb) 
                this._inputCb(msg)
        }
        if (this._testInputCounter == 8) {
            msg = {
                msg: "mousemove",
                event: {
                    x: 180,
                    y: 100
                }
            };
            if (this._inputCb) 
                this._inputCb(msg)
        }
        if (this._testInputCounter == 10) {
            msg = {
                msg: "mousedown",
                event: {
                    which:0
                }
            };
            if (this._inputCb) 
                this._inputCb(msg)
        }
        return this.methodTable[obj.msg](obj);
    }

    /*
     * set callback for receiving input (kbd & mouseclicks, etc)
     * designed using message passing for eventual webworkerhood
     */
    this.setInputCallback=function(cb) {
        this._inputCb = cb;
    }

    this.destroy=function(){}
}

// Register as a GraphicsSimulation if possible.
Kata.require([
    'katajs/oh/GraphicsSimulation.js'
], function() {
    Kata.GraphicsSimulation.registerDriver("text", TextGraphics);
}, "katajs/gfx/TextGraphics.js");
