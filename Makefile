### PBJ Vars

PBJDIR=externals/protojs
PBJBIN=$(PBJDIR)/pbj

INPUTDIR=externals/sirikata-protocol
OUTPUTDIR=katajs/oh/plugins/sirikata/impl

THESE_PBJ=$(wildcard $(INPUTDIR)/*.pbj)
THESE_PBJJS=$(patsubst $(INPUTDIR)/%,$(OUTPUTDIR)/%.js,$(THESE_PBJ))
ALL_PBJJS += $(THESE_PBJJS)

### Closure Vars
CLOSURESRCS=katajs/core/Core.js \
	externals/protojs/protobuf.js externals/protojs/pbj.js \
	externals/GLGE/glge_math.js externals/GLGE/glge.js externals/GLGE/glge_collada.js \
	katajs/gfx/WebGLCompat.js katajs/gfx/glgegfx.js katajs/gfx/TextGraphics.js
CLOSURESRCS+=$(shell find katajs/core katajs/oh katajs/network katajs/space -name '*.js' -and -not -name 'Core.js' -and -not -name 'GenericWorker.js' )

CLOSUREOUT=katajs.compiled.js

CLOSURE=java -jar externals/GLGE/closure/compiler.jar
CLOSUREARGS=--js $$before
CLOSUREARGS+=$(patsubst %,--js %,$(CLOSURESRCS))
CLOSUREARGS+=--js $$after
CLOSUREARGS+=--externs contrib/closure_preinclude.js
CLOSUREARGS+=--formatting pretty_print
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

closure : $(CLOSUREOUT)
depends:
	git submodule init
	git submodule update

$(CLOSUREOUT) : $(CLOSURESRCS)
	before=`mktemp -t kata` && \
	after=`mktemp -t kata` && \
	echo "if(typeof(Kata)=='undefined')Kata={};Kata.closureIncluded={'katajs/core/Core.js':true $(patsubst %,$(COMMA) '%':true,$(CLOSURESRCS))};" > $$before && \
	echo "(function(){for(var i in Kata.closureIncluded){Kata.setIncluded(i);}})();" > $$after && \
	$(CLOSURE) $(CLOSUREARGS) || \
	rm -f "$@" ; \
	rm -f $$before $$after

.PHONY: test_pbj closure all
