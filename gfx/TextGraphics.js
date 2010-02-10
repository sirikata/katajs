

/**
 *@constructor
 */
TextGraphics=function(callbackFunction,parentElement) {
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
        div.style.width="256px";
        div.style.height="256px";
        div.style.padding="0.5em";
        div.style.position="absolute"
        div.style.border="solid 10px #10107c"
        div.style.backgroundColor="#000008"; 
        div.style.color="#ffffff"; 
        div.style.left=msg.pos[0]+"px";
        div.style.top=msg.pos[1]+"px";
        div.style.zIndex=msg.pos[2];
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
        div.innerHTML='<p class="alignleft">Object Properties</p>'
    }
    this.methodTable["Move"]=function(msg) {
        element=returnObjById(msg.id);
        element.style.left=msg.pos[0]+"px";
        element.style.top=msg.pos[1]+"px";
        element.style.zIndex=msg.pos[2];
    }
    this.methodTable["Destroy"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            div.parentNode.removeChild(div);        
        }
    }
    this.methodTable["Mesh"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=returnObjById("Mesh"+msg.id);
            if (q) {
                
            }else {
                q=document.createElement("p");
                q.id="Mesh"+msg.id;
            }
            q.innerHTML="Mesh "+msg.mesh;
            div.appendChild(q);
        }        
    }
    this.methodTable["DestroyMesh"]=function(msg) {
        var div=returnObjById(msg.id);
        if (div) {
            var q=returnObjById("Mesh"+msg.id);
            if (q) {
                div.removeChild(q);
            }
        }
    }
    this.send=function(obj) {
        return this.methodTable[obj.msg](obj);
    }
    this.destroy=function(){}
}