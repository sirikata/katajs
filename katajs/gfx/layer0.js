var layer0_glsl='#version 100\n'+
'\n'+
'precision highp float;\n'+
'\n'+
'uniform sampler2D GLGE_RENDER;\n'+
'varying vec2 texCoord;\n'+
'\n'+
'void main(void){\n'+
'	vec4 color = texture2D(GLGE_RENDER, texCoord);\n'+
'\n'+
'	float intensity = 0.0;\n'+
'	if(color.r==1.0 && color.g==0.0 && color.b==1.0) intensity=1.0;\n'+
'	gl_FragColor = vec4(vec3(intensity),1.0);\n'+
'}\n'
