var layer1_glsl='#version 100\n'+
'\n'+
'precision highp float;\n'+
'\n'+
'uniform sampler2D GLGE_RENDER;\n'+
'uniform sampler2D GLGE_PASS0;\n'+
'uniform vec3 lightpos;\n'+
'varying vec2 texCoord;\n'+
'\n'+
'void main(void){\n'+
'	float intensity=0.0;\n'+
'	vec2 lightvec=texCoord-lightpos.xy;\n'+
'	lightvec=lightvec*(1.0-clamp(length(lightvec),0.0,1.0));\n'+
'	if((lightpos.z)>0.0){\n'+
'		for(int i=1;i<30;i++){\n'+
'			intensity+=texture2D(GLGE_PASS0, texCoord-lightvec*0.045*float(i)).r*pow(length(lightvec),2.5);\n'+
'		}\n'+
'	}\n'+
'	intensity+=texture2D(GLGE_PASS0, texCoord).r;\n'+
'	gl_FragColor = vec4(vec3(intensity),1.0);\n'+
'}\n';
