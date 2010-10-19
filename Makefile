### PBJ Vars

PBJDIR=externals/protojs
PBJBIN=$(PBJDIR)/pbj

INPUTDIR=externals/sirikata-protocol
OUTPUTDIR=katajs/oh/plugins/sirikata/impl

THESE_PBJ=$(wildcard $(INPUTDIR)/*.pbj)
THESE_PBJJS=$(patsubst $(INPUTDIR)/%,$(OUTPUTDIR)/%.js,$(THESE_PBJ))
ALL_PBJJS += $(THESE_PBJJS)

### Closure Vars
###########CLOSURESRCS=externals/protojs/protobuf.js externals/protojs/pbj.js
CLOSURESRCS=katajs/core/Core.js
CLOSURESRCS+=$(shell find katajs/core katajs/oh katajs/network katajs/space -name '*.js' -and -not -name 'Core.js' -and -not -name 'GenericWorker.js' )

CLOSUREOUT=katajs.compiled.js

CLOSURE=java -jar externals/GLGE/closure/compiler.jar
CLOSUREARGS=$(patsubst %,--js %,$(CLOSURESRCS))
CLOSUREARGS+=--externs contrib/closure_preinclude.js
CLOSUREARGS+=--formatting pretty_print
CLOSUREARGS+=--compilation_level SIMPLE_OPTIMIZATIONS
CLOSUREARGS+= --js_output_file $(CLOSUREOUT)

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

$(CLOSUREOUT) : $(CLOSURESRCS)
	$(CLOSURE) $(CLOSUREARGS) || \
	rm -f "$@"

.PHONY: test_pbj closure all
