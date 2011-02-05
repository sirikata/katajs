layer2_no_sunbeams_glsl='#version 100\n'+
'\n'+
'precision highp float;\n'+
'\n'+
'uniform sampler2D GLGE_RENDER;\n'+
'uniform sampler2D GLGE_PASS0;\n'+
'uniform sampler2D TEXTURE0;\n'+
'uniform vec3 lightpos;\n'+
'uniform mat4 invProjView;\n'+
'\n'+
'varying vec2 texCoord;\n'+
'\n'+
'vec3 result=vec3(0.0,0.0,0.0);\n'+
'vec3 suncolor=vec3(0.9,0.9,0.8);\n'+
'\n'+
'void main(void){\n'+
'	vec2 lightvec=texCoord-lightpos.xy;\n'+
'	float lightdist=length(lightvec*vec2(1.0,0.444));\n'+
'	vec3 suncolor=(1.0-pow(lightdist,0.1))*suncolor;\n'+
'	if(lightdist<0.005) suncolor=suncolor*pow((0.005-lightdist)/0.005+1.0,2.0);\n'+
'	if(lightpos.z<0.0) suncolor=vec3(0.0);\n'+
'	float intensity=texture2D(GLGE_PASS0,texCoord).r;\n'+
'	vec3 col=texture2D(GLGE_RENDER,texCoord).rgb+vec3(0.1,0.1,0.1);\n'+
'	if(col.r==1.1 && col.b==1.1 && col.g==0.1) intensity=1.0;\n'+
'	vec4 skycoord=invProjView*vec4(vec3((texCoord-0.5)*2.0,0.0),1.0);\n'+
'	skycoord=invProjView*vec4(vec3((texCoord-0.5)*2.0,1.0),1.0);\n'+
'	skycoord.xyz=normalize(skycoord.xyz/skycoord.w);\n'+
'    skycoord.xyz=skycoord.xzy;\n'+
'    skycoord.y=-skycoord.y;\n'+
'	//result=max(suncolor,0.0)/0.4;\n'+
'	result=max(suncolor,0.0)/0.4+texture2D(TEXTURE0,(skycoord.xy/(1.4+skycoord.z)+1.0)/2.0).rgb*intensity+texture2D(GLGE_RENDER,texCoord).rgb*(1.0-intensity);\n'+
'	if(intensity<1.0) result=suncolor*intensity*5.5+vec3(pow(col.r,2.0),pow(col.g,2.0),pow(col.b,2.0));	\n'+
'	gl_FragColor = vec4(result,1.0);	\n'+
'}	\n'
