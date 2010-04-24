/*
* Test for intersection of ray & triangle
//
// Copyright 2001, softSurfer (www.softsurfer.com)
// This code may be freely used and modified for any purpose
// providing that this copyright notice is included with it.
// SoftSurfer makes no warranty for this code, and cannot be held
// liable for any real or imagined damage resulting from its use.
// Users of this code must verify correctness for their application.

// modifications (c) 2010 Katalabs, inc.
*/

// R = ray T = triangle N = (optional) array to fill with normal
function ray_tri_intersect(R, T, N) {
//	console.log("ray_tri_i_..",R,T,N)
	/*
	for(var i=0; i<3; i++) {
		for(var j=0; j<3; j++) {
			if(typeof(T[i][j])!="number") alert("NOOO!!! " + T[i][j] + " " + typeof(T[i][j]))
		}
	}
	for(var i=0; i<2; i++) {
		for(var j=0; j<3; j++) {
			if(typeof(R[i][j])!="number") alert("NOOOoo!!!" + R[i][j] + " " + typeof(R[i][j]) )
		}
	}
	*/
	var u,v,n,uu,uv,vv
	var dir,w0,w,wu,wv
	var r,a,b,R0,I,D,s,t
	u = GLGE.subVec3(new GLGE.Vec(T[1]), T[0])
	v = GLGE.subVec3(new GLGE.Vec(T[2]), T[0])
	n = GLGE.crossVec3(u, v)
	if (N) N[0] = GLGE.toUnitVec3(n)
	R0 = new GLGE.Vec(R[0])
	dir = GLGE.subVec3(new GLGE.Vec(R[1]), R[0])
	w0 = GLGE.subVec3(R0, T[0])
	a = -GLGE.dotVec3(n, w0)
	b = GLGE.dotVec3(n, dir)
	if (Math.abs(b) < 0.0001) return null		// parallel or lies on tri
	r = a/b
    if (r < 0.0) return null                    // ray goes away from triangle
    // for a segment, also test if (r > 1.0) => no intersect
	I = GLGE.addVec3(R0, GLGE.scaleVec3(dir, r))
    // is I inside T?
	uu = GLGE.dotVec3(u, u)
	uv = GLGE.dotVec3(u, v)
	vv = GLGE.dotVec3(v, v)
	w = GLGE.subVec3(I, T[0])
	wu = GLGE.dotVec3(w, u)
	wv = GLGE.dotVec3(w, v)
    D = uv * uv - uu * vv;
    s = (uv * wv - vv * wu) / D;
    if (s < 0.0 || s > 1.0)        // I is outside T
        return null;
    t = (uv * wu - uu * wv) / D;
    if (t < 0.0 || (s + t) > 1.0)  // I is outside T
        return null;
    return I;                      // I is in T
}

