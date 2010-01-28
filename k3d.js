/**
 * @author dbm
 */

function addProtoSafely(cls, proto, func){
    if (cls.prototype[proto] != null) {
        alert("oh no! This prototype already exists: " + proto)
    }
    else {
        cls.prototype[proto] = func
    }
}

addProtoSafely(GLGE.Object, "setStatus", function(status) {
    if (status != this.status) {
        if (status == null) {
//			pdebug("set material to: " + obj.original_material)
            this.setMaterial(this.original_material)
        }
        else {
            if (this.status == null) {
                this.original_material = this.getMaterial()
            }
//			pdebug("set material to: " + status + "_mat")
            this.setMaterial(eval(status + "_mat"))
        }
		this.status = status
    }
})
