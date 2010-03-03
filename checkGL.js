var canvas = document.getElementById("canvas")
console.log("canvas:",canvas)
if (canvas) {
	var gl = canvas.getContext("experimental-webgl", {});
	if (!gl) {
		alert("ach")
	}
}
else {
	alert("ech")
}
	
