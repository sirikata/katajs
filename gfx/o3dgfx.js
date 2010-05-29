/*  Kata Javascript Graphics - O3D Interface
 *  o3dgfx.js
 *
 *  Copyright (c) 2010, Patrick Reiter Horn
 *  All rights reserved.
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
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.util');
o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.scene');

RenderTarget=function(element,width,height,fov,hither,yon) {
  return {element:element,width:width,height:height,fov:fov,hither:higher,yon:yon};
}
/**
 * Constructor for O3DGraphics interface.
 *@constructor
 */
O3DGraphics=function(callbackFunction,parentElement) {
    var thus = this;
    this.callback=callbackFunction;
    this.parentEl=parentElement;
    this.initEvents=[];
    this.methodTable={};
    
    this.loadingElement = document.createElement("div");
    this.parentEl.appendChild(loadingElement);
    
    this.sceneLoadedCallback = function(renderTarg, pack, parent, exception) {
        enableInput(true);
        if (exception) {
          alert("Could not load: " + path + "\n" + exception);
          this.loadingElement.innerHTML = "loading failed.";
        } else {
          this.loadingElement.innerHTML = "loading finished.";
          // Generate draw elements and setup material draw lists.
          o3djs.pack.preparePack(pack, renderTarg.mViewInfo);
          // FIXME: Why root?
          var bbox = o3djs.util.getBoundingBoxOfTree(renderTarg.element.client.root);
          // Aim camera at object?
          /*
          g_camera.target = g_math.lerpVector(bbox.minExtent, bbox.maxExtent, 0.5);
          var diag = g_math.length(g_math.subVector(bbox.maxExtent,
                                                    bbox.minExtent));
          g_camera.eye = g_math.addVector(g_camera.target, [0, 0, 1.5 * diag]);
          g_camera.nearPlane = diag / 1000;
          g_camera.farPlane = diag * 10;
          setClientSize();
          updateCamera();
          updateProjection();
          */

          // Manually connect all the materials' lightWorldPos params to the context
          // FIXME: What is this for?
          /*
          var materials = pack.getObjectsByClassName('o3d.Material');
          for (var m = 0; m < materials.length; ++m) {
            var material = materials[m];
            var param = material.getParam('lightWorldPos');
            if (param) {
              param.bind(g_lightPosParam);
            }
          }
          */

          // Comment out the next line to dump lots of info.
          if (true) {
            o3djs.dump.dump('---dumping context---\n');
            o3djs.dump.dumpParamObject(context);

            o3djs.dump.dump('---dumping root---\n');
            o3djs.dump.dumpTransformTree(client.root);

            o3djs.dump.dump('---dumping render root---\n');
            o3djs.dump.dumpRenderNodeTree(client.renderGraphRoot);

            o3djs.dump.dump('---dump g_pack shapes---\n');
            var shapes = pack.getObjectsByClassName('o3d.Shape');
            for (var t = 0; t < shapes.length; t++) {
              o3djs.dump.dumpShape(shapes[t]);
            }

            o3djs.dump.dump('---dump g_pack materials---\n');
            var materials = pack.getObjectsByClassName('o3d.Material');
            for (var t = 0; t < materials.length; t++) {
              o3djs.dump.dump (
                  '  ' + t + ' : ' + materials[t].className +
                  ' : "' + materials[t].name + '"\n');
              o3djs.dump.dumpParams(materials[t], '    ');
            }

            o3djs.dump.dump('---dump g_pack textures---\n');
            var textures = pack.getObjectsByClassName('o3d.Texture');
            for (var t = 0; t < textures.length; t++) {
              o3djs.dump.dumpTexture(textures[t]);
            }

            o3djs.dump.dump('---dump g_pack effects---\n');
            var effects = pack.getObjectsByClassName('o3d.Effect');
            for (var t = 0; t < effects.length; t++) {
              o3djs.dump.dump ('  ' + t + ' : ' + effects[t].className +
                      ' : "' + effects[t].name + '"\n');
              o3djs.dump.dumpParams(effects[t], '    ');
            }
          }
        }
    }
    this.loadScene = function(context, path, mat, par) {
      // FIXME: clientElements[0]?
      var renderTarg = this.mRenderTargets[0];
      var pack = renderTarg.element.client.createPack();

      // Create a new transform for the loaded file
      var parent = pack.createObject('Transform');
      parent.parent = par || client.root;
      parent.localMatrix = mat || parent.localMatrix;
      if (path != null) {
        this.loadingElement.innerHTML = "Loading: " + path;
        enableInput(false);
        try {
          var thus = this;
          o3djs.scene.loadScene(renderTarg.element.client, pack, parent, path,
            function(p, par, exc) {
              thus.sceneLoadedCallback.apply(this, renderTarg, p, par, exc);
            });
        } catch (e) {
          enableInput(true);
          this.loadingElement.innerHTML = "loading failed : " + e;
        }
      }

      return parent;
    }

    
    this.send=function(obj) {
        initEvents[initEvents.length]=obj;
    }
    this.asyncInit=function (clientElements) {
        var thus=this;
        this.mRenderTargets={}//this contains info about each render target, be it a texture or a clientElement (client elements are mapped by #, textures by uuid)
        this.mSpaceRoots={}//this will contain scene graph roots for each space
        for (var i=0;i<clientElements.length;i++) {
          this.mRenderTargets[i]=RenderTarget(clientElements[i],
                                             parseInt(clientElements[i].width),
                                             parseInt(clientElements[i].height),
                                             o3d.math.degToRad(45),
                                             0.1,
                                             50000);
           if(i==0) {
             this.mRenderTargets[0].mViewInfo = o3djs.rendergraph.createBasicView(clientElements[0].createPack(),
                                                                clientElements[0].root,
                                                                clientElements[0].renderGraphRoot);
           }else {
             this.mRenderTargets[i].mViewInfo = o3djs.rendergraph.createExtraView(this.mRenderTargets[0].mViewInfo,
                                                                clientElements[i].root,//FIXME: not sure if this should be the canonical view or the secondary views
                                                                clientElements[i].renderGraphRoot);           
           }
                                        
        }
        /* FIXME: can be done when camera is created
        this.mViewInfo.drawContext.projection = o3djs.math.matrix4.perspective(
                     o3d.math.degToRad(45), g_o3dWidth / g_o3dHeight,
                     this.mNearPlane,this.mFarPlane)
                     ;*/
                                             
        this.methodTable={}
        this.methodTable["Create"]=function(msg) {//this function creates a scene graph node

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
            if (msg.camid) {
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
        
        this.send=function(obj) {
            return this.methodTable[obj.msg](obj);
        }
        this.destroy=function(){}
        for (var i=0;i<this.initEvents.length;++i) {
          this.send(this.initEvents[i]);
        }
        delete this.initEvents;
        o3djs.event.addEventListener(this.mClientElements[0],
                                     'mousedown',
                                     function (e){thus.startDragging(e);});
        o3djs.event.addEventListener(this.mClientElements[0],
                                     'mousemove',
                                     function(e){thus.drag(e);});
        o3djs.event.addEventListener(this.mClientElements[0],
                                     'mouseup',
                                     function(e){thus.stopDragging(e);});
        o3djs.event.addEventListener(this.mClientElements[0],
                                     'wheel',
                                     function(e){thus.scrollMe(e);});
    }
    o3djs.webgl.makeClients(function(clientElements){thus.asyncInit(clientElements);});
}
