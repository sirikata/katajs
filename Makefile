### PBJ Vars

PBJDIR=externals/protojs
PBJBIN=$(PBJDIR)/pbj

INPUTDIR=externals/sirikata-protocol
OUTPUTDIR=katajs/oh/plugins/sirikata/impl

THESE_PBJ=$(wildcard $(INPUTDIR)/*.pbj)
THESE_PBJJS=$(patsubst $(INPUTDIR)/%,$(OUTPUTDIR)/%.js,$(THESE_PBJ))
ALL_PBJJS += $(THESE_PBJJS)

### Closure Vars
CLOSURESRCS=katajs/core/Core.js externals/GLGE/src/core/glge.js externals/GLGE/src/core/glge_math.js externals/GLGE/src/core/glge_document.js externals/GLGE/src/core/glge_event.js externals/GLGE/src/core/glge_animatable.js externals/GLGE/src/core/glge_placeable.js  externals/GLGE/src/core/glge_jsonloader.js externals/GLGE/src/core/glge_quicknote.js externals/GLGE/src/core/glge_messages.js  externals/GLGE/src/core/glge_group.js externals/GLGE/src/renderable/glge_object.js externals/GLGE/src/physics/glge_physicsabstract.js $(shell find externals/GLGE/src  -name '*.js' -and -not -path "*externals/GLGE/src/core/*" -and -not -path "*externals/GLGE/src/extra/*" -and -not -name glge_object.js -and -not -name glge_physicsabstract.js |sort -r)

CLOSURESRCS+=$(shell find externals/GLGE/src/extra -name "*.js"|sort -r)

CLOSURESRCS+= externals/protojs/protobuf.js externals/protojs/pbj.js \
	katajs/gfx/WebGLCompat.js katajs/gfx/glgegfx.js katajs/gfx/TextGraphics.js katajs/gfx/layer0.js katajs/gfx/layer1.js katajs/gfx/layer2.js katajs/gfx/layer2_no_sunbeams.js

CLOSURESRCS+=$(shell find katajs/core katajs/oh katajs/network katajs/space -name '*.js' -and -not -name 'Core.js' -and -not -name 'GenericWorker.js' -and -not -name "layer*.js"|sort)

CLOSUREOUT=katajs.compiled.js

CLOSURE=java -jar compiler.jar
CLOSUREARGS=--js $$before
CLOSUREARGS+=$(patsubst %,--js %,$(CLOSURESRCS))
CLOSUREARGS+=--js $$after
CLOSUREARGS+=--externs contrib/closure_preinclude.js
CLOSUREARGS+=--formatting pretty_print
#CLOSUREARGS+=--warning_level VERBOSE
CLOSUREARGS+=--compilation_level SIMPLE_OPTIMIZATIONS
CLOSUREARGS+= --js_output_file $(CLOSUREOUT)

COMMA=,

#CLOSURE=python makeclosure.py
#CLOSUREARGS=$(CLOSURESRCS)
#CLOSUREARGS+= > $(CLOSUREOUT)

### Rules

all : pbj $(ALL_PBJJS) test_pbj

### PBJ Rules

pbj : $(PBJBIN)


$(PBJBIN) :
	cd $(PBJDIR) &&	\
	./bootstrap.sh && \
	$(MAKE)

test_pbj : tests/pbj/Test.pbj
	$(MAKE) -C tests/pbj

$(OUTPUTDIR)/%.pbj.js: $(INPUTDIR)/%.pbj
	@mkdir $(OUTPUTDIR) 2>/dev/null || true
	$(PBJBIN) $< $@

### Closure Rules
compiler-latest.zip:
	curl -o compiler-latest.zip http://closure-compiler.googlecode.com/files/compiler-20110405.zip

compiler.jar : compiler-latest.zip
	unzip compiler-latest.zip compiler.jar
	touch compiler.jar

closure : compiler.jar $(CLOSUREOUT)

depends:
	git submodule init
	git submodule update

$(CLOSUREOUT) : $(CLOSURESRCS)
	before=`mktemp -t kata.XXXXXXXXXX` && \
	after=`mktemp -t kata.XXXXXXXXXX` && \
	echo "if(typeof(Kata)=='undefined')Kata={};Kata.closureIncluded={'katajs/core/Core.js':true $(patsubst %,$(COMMA) '%':true,$(CLOSURESRCS))};" > $$before && \
	echo "(function(){for(var i in Kata.closureIncluded){Kata.setIncluded(i);}})();" > $$after && \
	$(CLOSURE) $(CLOSUREARGS) || \
	rm -f "$@" ; \
	rm -f $$before $$after

.PHONY: test_pbj closure all
