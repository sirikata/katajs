function makeBall(){
    radius = Math.pow(2, .5)
    lats = 11
    longs = 17
    var geometryData = [];
    var normalData = [];
    var texCoordData = [];
    var indexData = [];
    
    for (var latNumber = 0; latNumber <= lats; ++latNumber) {
        for (var longNumber = 0; longNumber <= longs; ++longNumber) {
            var theta = latNumber * Math.PI / lats;
            var phi = longNumber * 2 * Math.PI / longs;
            var sinTheta = Math.sin(theta);
            var sinPhi = Math.sin(phi);
            var cosTheta = Math.cos(theta);
            var cosPhi = Math.cos(phi);
            
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longs);
            var v = latNumber / lats;
            
            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            //				debug("normal, "+x+","+y+","+z+"<br>")
            texCoordData.push(u);
            texCoordData.push(v);
            geometryData.push(radius * x);
            geometryData.push(radius * y);
            geometryData.push(radius * z);
        }
    }
    
    for (var latNumber = 0; latNumber < lats; ++latNumber) {
        for (var longNumber = 0; longNumber < longs; ++longNumber) {
            var first = (latNumber * (longs + 1)) + longNumber;
            var second = first + longs + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);
            
            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }
	
	var makeLine = function(type, buffer, intflag) {
		var s = "<" + type + ">"
		for (var i in buffer) {
			var p = buffer[i]
			if (intflag) {
				s += p
			} else {
				s += p.toFixed(5)
			}
		    if (i!=buffer.length-1) s += ","
		}
		s += "</" + type + ">"
		return s
	}
	print (makeLine("positions", geometryData))
	print (makeLine("normals", normalData))
	print (makeLine("uv1", texCoordData))
	print (makeLine("faces", indexData, true))
}

makeBall()

