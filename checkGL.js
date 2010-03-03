var canvas = document.getElementById("canvas")
if (canvas) {
    try {
        var gl = canvas.getContext("experimental-webgl", {});
        if (!gl) {
            window.location = "noGL.html"
        }
    } 
    catch (e) {
        window.location = "noGL.html"
    }
}
else {
    window.location = "noGL.html"
}
