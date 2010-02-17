import sys, time, os
from xml.dom import minidom
Z_UP=True       #converting from old Sirikata, new_z = old_y, new_y = -old_z

def mv(f1,f2):
    cmd = "mv " + f1 + " " + f2
    do(cmd)

def do(s):
    os.system(s)
    
def fix(n):
    return "%8.6f" % n

def getCdnAsset(fn):
    if not os.path.exists(fn):
        cmd = "wget http://www.sirikata.com/content/names/" + fn
        
        do(cmd)
        f = open(fn)
        s = f.read().strip()
        f.close()
        hsh = s[9:]
        if len(hsh)==64:
            cmd = "wget http://www.sirikata.com/content/assets/" + hsh
            
            do(cmd)
            cmd = "mv " + hsh + " " + fn
            
            do(cmd)
        else:
            print >> sys.stderr, "bad hash file, wrong length"
    else:
        print >> sys.stderr, "won't overwrite", fn

if not os.path.exists("data"):
    do("mkdir data")
name = sys.argv[1]
getCdnAsset(name+".mesh")
mv(name+".mesh", "data/")
do("OgreXMLConverter " + "data/"+name+".mesh")
fmodel = name + ".mesh.xml"
print >> sys.stderr, "model:", fmodel

x = minidom.parse("data/"+fmodel)

mesh = x.getElementsByTagName("mesh")[0]
submeshes = x.getElementsByTagName("submeshes")[0]
seenTex = set()

basename = name
fglge = open("data/" + name + ".glge", "w")
for subnum, submesh in enumerate(submeshes.getElementsByTagName("submesh")):
    if subnum>0:
        name = basename + "_sub" + str(subnum)
    else:
        name = basename
    print >> sys.stderr, "-----------submesh:", submesh
    material = submesh.getAttribute("material")
    matname = material[material.rfind(":")+1:]
    print >> sys.stderr, "material:", material
    fscript = basename + ".os"
    print >> sys.stderr, "script:", fscript
    getCdnAsset(fscript)
    mv(fscript, "data/"+fscript)
    f=open("data/"+fscript)
    lins = f.readlines()
    f.close()
    uvsets = {}
    dltextures = []
    dlunits = []
    osMat=""
    for i, lin in enumerate(lins):
        lin = lin.strip()
        if lin[:9]=="material ":
            osMat = lin[9:].split()[0]
        if not osMat==matname:
            continue
        if lin[:13]=="texture_unit ":
            unit = lin[13:]
        if ".dds" in lin and lin[:8]=="texture ":
            print >> sys.stderr, "  texture unit:", unit
            print >> sys.stderr, "    texture:", lin[8:]
            dltextures.append(lin[8:].strip())
            dlunits.append(unit)
            nxt = lins[i+1].strip()
            if nxt[:14]=="tex_coord_set ":
                uvsets[unit] = int(nxt[14])
                print >> sys.stderr, "    uv set for this texture:", uvsets[unit]
            else:
                print >> sys.stderr, "expected tex_coord_set..."
                0/0
    for i in uvsets:
        uvset = uvsets[i]
    ##    if uvset != 0:
    ##        print >> sys.stderr, "***WARNING*** uvset conflict!"
    ##        r = raw_input()
    ##        if len(r) and r[0]!="y":
    ##            exit()

    print >> sys.stderr, "capturing Diffuse uvset (" + str(uvset) + ")"

    faces = submesh.getElementsByTagName("faces")[0]
    geometry = submesh.getElementsByTagName("geometry")[0]
    vertexcount = int(geometry.getAttribute("vertexcount"))
    vertexbuffer = geometry.getElementsByTagName("vertexbuffer")[0]
    verts = vertexbuffer.getElementsByTagName("vertex")
    positions = []
    normals = []
    uvs = []

    for v in verts:
        pos = v.getElementsByTagName("position")[0]
        norm = v.getElementsByTagName("normal")[0]
        uv = v.getElementsByTagName("texcoord")[uvset]
        px = pos.getAttribute("x")
        py = pos.getAttribute("y")
        pz = pos.getAttribute("z")
        nx = norm.getAttribute("x")
        ny = norm.getAttribute("y")
        nz = norm.getAttribute("z")
        u = uv.getAttribute("u")
        v = uv.getAttribute("v")
        if Z_UP:
            positions += [float(px), -float(pz), float(py)]
            normals += [float(nx), -float(nz), float(ny)]
        else:
            positions += [float(px), float(py), float(pz)]
            normals += [float(nx), float(ny), float(nz)]
        uvs += [float(u), float(v)]

    indices = []
    triangles = faces.getElementsByTagName("face")
    for t in triangles:
        v1 = t.getAttribute("v1")
        v2 = t.getAttribute("v2")
        v3 = t.getAttribute("v3")
        indices += [int(v1), int(v2), int(v3)]

    ##print "positions:", positions
    ##print "normals:", normals
    ##print "uvs:", uvs
    ##print "indices:", indices

    print >> fglge, '<mesh id="' + name + '_mesh">'
    print >> fglge,  "    <positions>",
    for i, p in enumerate(positions):
        if i==len(positions)-1:
            print >> fglge, fix(p),
        else:
            print>> fglge, fix(p) + ",",
    print >> fglge,  "</positions>"
    print >> fglge,  "    <normals>",
    for i, n in enumerate(normals):
        if i==len(normals)-1:
            print >> fglge,  fix(n),
        else:
            print >> fglge,  fix(n) + ",",
    print >> fglge,  "</normals>"
    print >> fglge,  "    <uv1>",
    for i, j in enumerate(uvs):
        if i==len(uvs)-1:
            print >> fglge,  fix(j),
        else:
            print >> fglge,  fix(j) + ",",
    print >> fglge,  "</uv1>"
    print >> fglge,  "    <faces>",
    for i, j in enumerate(indices):
        if i==len(indices)-1:
            print >> fglge,  j,
        else:
            print >> fglge,  str(j) + ",",
    print >> fglge,  "</faces>"
    print >> fglge,  "</mesh>"

    print >> fglge, '<material id="' + name + '_mat">'
    for tx, unit in zip(dltextures, dlunits):
        if tx in seenTex:
            continue
        seenTex.add(tx)
        if tx[0] == '"' and tx[-1] == '"':
            tx = tx[1:-1]
        if tx[:8] == "meru:///":
            tx = tx[8:]
        if "." in tx:
            tx = tx[:tx.rfind(".")]
        if tx == "white":
            continue
        print >> fglge, '    <texture id="' + tx + '" src="images/' + tx + '.jpg" />'
        try:
            texType = {"Diffuse":"M_COLOR","Specular":"M_SPECULAR","Normal":"M_NOR","Bump":"M_BUMP"}[unit]
            print >> fglge, '    <material_layer texture="#' + tx + '" mapinput = "UV1" mapto="'+texType+'" />'
        except:
            pass
    print >> fglge, '</material>'

    print >> sys.stderr, "attempting to download textures"
    for tx in dltextures:
        if tx[0] == '"' and tx[-1] == '"':
            tx = tx[1:-1]
        if tx[:8] == "meru:///":
            tx = tx[8:]
        print "tx:", tx
        if not os.path.exists("data/"+tx):
            getCdnAsset(tx)
            mv(tx, "data/"+tx)

fglge.close()

