
// useful utilities for env.js

// add a fake console method that walks an object (like Chrome does so nicely!)

if (typeof(console) === "undefined") 
    console = {}

console.show = function(obj, prefix, maxdepth, depth){
    if (maxdepth == null) 
        maxdepth = 1;
    if (prefix == null) 
        prefix = "";
    if (depth == null) 
        depth = 1;
    
    //    console.log("-----------------------------------depth:",depth)    
    if (depth==1) {
        console.log(prefix + "---------------------------------------")
    }
    var indent = prefix
    for (i = 0; i < depth; i++) 
        indent += "  ";
    for (i in obj) {
        console.log(indent + i + ": " + obj[i]);
        if (depth < maxdepth) {
            console.show(obj[i], prefix, maxdepth, depth + 1);
        }
    }
}

if (console.log == null) {
    console.log = print
    o = {
        "one": 1,
        "two": 2
    };
    o.three = o
    console.show(o, "test:", 3)
}