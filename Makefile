PBJDIR=externals/protojs
PBJBIN=$(PBJDIR)/pbj

INPUTDIR=externals/sirikata-protocol
OUTPUTDIR=katajs/oh/plugins/sirikata/impl

THESE_PBJ=$(wildcard $(INPUTDIR)/*.pbj)
THESE_PBJJS=$(patsubst $(INPUTDIR)/%,$(OUTPUTDIR)/%.js,$(THESE_PBJ))
ALL_PBJJS += $(THESE_PBJJS)

all : pbj $(ALL_PBJJS) test_pbj

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
