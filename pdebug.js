/**
 * @author dbm
 */

function pdebug(s, l){
	if (l === undefined) {
		document.getElementById("dbg").innerHTML += s + "<br>"
	}
	else {
		document.getElementById("dbg" + l).innerHTML = s + "<br>"	
	}
}

function pdebug_clear() {
	document.getElementById("dbg").innerHTML = ""
}

function inspectObject(o) {
	pdebug_clear()
	pdebug("inspectObject:" + o)
	for (i in o) {
		pdebug("  " + i + "  :  " + o[i])
	}
}

