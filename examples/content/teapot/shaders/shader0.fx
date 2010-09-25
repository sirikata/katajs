// glslv output by Cg compiler
// cgc version 2.2.0006, build date Mar 31 2009
// command line args: -profile glslv
//vendor NVIDIA Corporation
//version 2.2.0.6
//profile glslv
//program BumpReflectVS
//semantic world : World
//semantic worldInverseTranspose : WorldInverseTranspose
//semantic worldViewProj : WorldViewProjection
//semantic viewInverse : ViewInverse
//semantic BumpHeight
//semantic NormalSampler
//semantic EnvSampler
//var float4x4 world : World : _world[0], 4 : -1 : 1
//var float4x4 worldInverseTranspose : WorldInverseTranspose : _worldInverseTranspose[0], 4 : -1 : 1
//var float4x4 worldViewProj : WorldViewProjection : _worldViewProj[0], 4 : -1 : 1
//var float4x4 viewInverse : ViewInverse : _viewInverse[0], 4 : -1 : 1
//var float BumpHeight :  :  : -1 : 0
//var sampler2D NormalSampler :  :  : -1 : 0
//var samplerCUBE EnvSampler :  :  : -1 : 0
//var float4 IN.Position : $vin.POSITION : POSITION : 0 : 1
//var float3 IN.TexCoord : $vin.TEXCOORD0 : TEXCOORD0 : 0 : 1
//var float4 IN.Tangent : $vin.ATTR9 : $ATTR9 : 0 : 1
//var float4 IN.Binormal : $vin.ATTR10 : $ATTR10 : 0 : 1
//var float4 IN.Normal : $vin.ATTR8 : $ATTR8 : 0 : 1
//var float4 BumpReflectVS.Position : $vout.POSITION : POSITION : -1 : 1
//var float2 BumpReflectVS.TexCoord : $vout.TEXCOORD0 : TEXCOORD0 : -1 : 1
//var float3 BumpReflectVS.worldEyeVec : $vout.TEXCOORD1 : TEXCOORD1 : -1 : 1
//var float3 BumpReflectVS.WorldNormal : $vout.TEXCOORD2 : TEXCOORD2 : -1 : 1
//var float3 BumpReflectVS.WorldTangent : $vout.TEXCOORD3 : TEXCOORD3 : -1 : 1
//var float3 BumpReflectVS.WorldBinorm : $vout.TEXCOORD4 : TEXCOORD4 : -1 : 1
//default BumpHeight = 0.2

attribute vec4 position;
attribute vec4 texCoord0;
vec4 _glPositionTemp;
uniform vec4 dx_clipping;


struct v2f {
    vec4 _Position;
    vec2 _TexCoord;
    vec3 _worldEyeVec;
    vec3 _WorldNormal;
    vec3 _WorldTangent;
    vec3 _WorldBinorm;
};

attribute vec4 tangent;
attribute vec4 binormal;
attribute vec4 normal;
varying vec2 intershader0;
varying vec3 intershader1;
varying vec3 intershader2;
varying vec3 intershader3;
varying vec3 intershader4;
varying vec3 intershader5;
uniform mat4 world;
uniform mat4 worldInverseTranspose;
uniform mat4 worldViewProjection;
uniform mat4 viewInverse;

 // main procedure, the original name was BumpReflectVS
void main()
{

v2f _ret_0;
vec4 _r0009;
vec4 _r0011;
vec4 _r0013;
vec4 _r0015;
vec4 _r0017;
vec3 _TMP18;
vec3 _v0019;
float _x0023;
vec3 _TMP24;

    _r0009 = position.x*worldViewProjection[0];
    _r0009 = _r0009 + position.y*worldViewProjection[1];
    _r0009 = _r0009 + position.z*worldViewProjection[2];
    _r0009 = _r0009 + position.w*worldViewProjection[3];
    _r0011 = normal.x*worldInverseTranspose[0];
    _r0011 = _r0011 + normal.y*worldInverseTranspose[1];
    _r0011 = _r0011 + normal.z*worldInverseTranspose[2];
    _r0011 = _r0011 + normal.w*worldInverseTranspose[3];
    _r0011.xyz;
    _r0013 = tangent.x*worldInverseTranspose[0];
    _r0013 = _r0013 + tangent.y*worldInverseTranspose[1];
    _r0013 = _r0013 + tangent.z*worldInverseTranspose[2];
    _r0013 = _r0013 + tangent.w*worldInverseTranspose[3];
    _r0013.xyz;
    _r0015 = binormal.x*worldInverseTranspose[0];
    _r0015 = _r0015 + binormal.y*worldInverseTranspose[1];
    _r0015 = _r0015 + binormal.z*worldInverseTranspose[2];
    _r0015 = _r0015 + binormal.w*worldInverseTranspose[3];
    _r0015.xyz;
    _r0017 = position.x*world[0];
    _r0017 = _r0017 + position.y*world[1];
    _r0017 = _r0017 + position.z*world[2];
    _r0017 = _r0017 + position.w*world[3];
    _TMP24.x = viewInverse[3].x;
    _TMP24.y = viewInverse[3].y;
    _TMP24.z = viewInverse[3].z;
    _v0019 = _r0017.xyz - _TMP24;
    _x0023 = dot(_v0019, _v0019);
    _TMP18 = inversesqrt(_x0023)*_v0019;
    _ret_0._Position = _r0009;
    _ret_0._TexCoord = texCoord0.xy;
    _ret_0._worldEyeVec = _TMP18;
    _ret_0._WorldNormal = _r0011.xyz;
    _ret_0._WorldTangent = _r0013.xyz;
    _ret_0._WorldBinorm = _r0015.xyz;
    intershader1.xyz = _TMP18;
    intershader3.xyz = _r0013.xyz;
    intershader4.xyz = _r0015.xyz;
    _glPositionTemp = _r0009; gl_Position = vec4(_glPositionTemp.x + _glPositionTemp.w * dx_clipping.x, dx_clipping.w * (_glPositionTemp.y + _glPositionTemp.w * dx_clipping.y), _glPositionTemp.z * 2.0 - _glPositionTemp.w, _glPositionTemp.w);
    intershader2.xyz = _r0011.xyz;
    intershader0.xy = texCoord0.xy;
} // main end


// #o3d SplitMarker
// #o3d MatrixLoadOrder RowMajor

// glslf output by Cg compiler
// cgc version 2.2.0006, build date Mar 31 2009
// command line args: -profile glslf
//vendor NVIDIA Corporation
//version 2.2.0.6
//profile glslf
//program BumpReflectPS
//semantic world : World
//semantic worldInverseTranspose : WorldInverseTranspose
//semantic worldViewProj : WorldViewProjection
//semantic viewInverse : ViewInverse
//semantic BumpHeight
//semantic NormalSampler
//semantic EnvSampler
//var float4x4 world : World : , 4 : -1 : 0
//var float4x4 worldInverseTranspose : WorldInverseTranspose : , 4 : -1 : 0
//var float4x4 worldViewProj : WorldViewProjection : , 4 : -1 : 0
//var float4x4 viewInverse : ViewInverse : , 4 : -1 : 0
//var float BumpHeight :  : _BumpHeight : -1 : 1
//var sampler2D NormalSampler :  : _NormalSampler : -1 : 1
//var samplerCUBE EnvSampler :  : _EnvSampler : -1 : 1
//var float2 IN.TexCoord : $vin.TEXCOORD0 : TEXCOORD0 : 0 : 1
//var float3 IN.worldEyeVec : $vin.TEXCOORD1 : TEXCOORD1 : 0 : 1
//var float3 IN.WorldNormal : $vin.TEXCOORD2 : TEXCOORD2 : 0 : 1
//var float3 IN.WorldTangent : $vin.TEXCOORD3 : TEXCOORD3 : 0 : 1
//var float3 IN.WorldBinorm : $vin.TEXCOORD4 : TEXCOORD4 : 0 : 1
//var float4 BumpReflectPS : $vout.COLOR : COLOR : -1 : 1
//default BumpHeight = 0.2



struct v2f {
    vec2 _TexCoord;
    vec3 _worldEyeVec1;
    vec3 _WorldNormal;
    vec3 _WorldTangent;
    vec3 _WorldBinorm;
};

uniform float BumpHeight;
uniform sampler2D NormalSampler;
uniform samplerCube EnvSampler;
varying vec2 intershader0;
varying vec3 intershader1;
varying vec3 intershader2;
varying vec3 intershader3;
varying vec3 intershader4;
varying vec3 intershader5;

 // main procedure, the original name was BumpReflectPS
void main()
{

vec4 _ret_0;
vec3 _TMP11;
float _x0016;
vec3 _TMP17;
float _x0022;
vec3 _TMP23;
float _x0028;
vec3 _TMP29;
float _x0034;
vec3 _TMP35;
float _x0040;
vec3 _TMP41;
vec3 _c0046;
    vec2 _bump;
    vec3 _nb;

    _bump = (texture2D(NormalSampler, intershader0.xy).xy*2.00000000E+000 - 1.00000000E+000)*BumpHeight;
    _x0016 = dot(intershader2.xyz, intershader2.xyz);
    _TMP11 = inversesqrt(_x0016)*intershader2.xyz;
    _x0022 = dot(intershader3.xyz, intershader3.xyz);
    _TMP17 = inversesqrt(_x0022)*intershader3.xyz;
    _x0028 = dot(intershader4.xyz, intershader4.xyz);
    _TMP23 = inversesqrt(_x0028)*intershader4.xyz;
    _nb = _TMP11 + _bump.x*_TMP17 + _bump.y*_TMP23;
    _x0034 = dot(_nb, _nb);
    _TMP29 = inversesqrt(_x0034)*_nb;
    _x0040 = dot(intershader1.xyz, intershader1.xyz);
    _TMP35 = inversesqrt(_x0040)*intershader1.xyz;
    _TMP41 = _TMP35 - (2.00000000E+000*_TMP29)*dot(_TMP29, _TMP35);
    _c0046 = vec3(_TMP41.x, _TMP41.y, _TMP41.z);
    _ret_0 = textureCube(EnvSampler, _c0046);
    gl_FragColor = _ret_0;
} // main end

