/*
* Test for intersection of ray & triangle
*/

function intersect_RayTriangle(R, T) {
	var u,v,n
	var dir,w0,w
	var r,a,b,R0
	u = Vector.create(T[1]).subtract(T[0])
	v = Vector.create(T[2]).subtract(T[0])
	n = u.cross(v)
	R0 = Vector.create(R[0])
	dir = Vector.create(R[1]).subtract(R[0])
	w0 = R0.subtract(T[0])
	a = -n.dot(w0)
	b = n.dot(dir)
	r = a/b							/// note if b==0 this returns NaN's
    if (r < 0.0)                    // ray goes away from triangle
        return null;                  // => no intersect
    // for a segment, also test if (r > 1.0) => no intersect
	I = R0.add(dir.multiply(r))
    // is I inside T?
	uu = u.dot(u)
	uv = u.dot(v)
	vv = v.dot(v)
	w = I.subtract(T[0])
	wu = w.dot(u)
	wv = w.dot(v)
    D = uv * uv - uu * vv;
    s = (uv * wv - vv * wu) / D;
    if (s < 0.0 || s > 1.0)        // I is outside T
        return null;
    t = (uv * wu - uu * wv) / D;
    if (t < 0.0 || (s + t) > 1.0)  // I is outside T
        return null;

    return I;                      // I is in T
}

