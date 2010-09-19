PBJBIN=externals/protojs/pbj

INPUTDIR=externals/sirikata-protocol
OUTPUTDIR=katajs/oh/plugins/sirikata/impl

THESE_PBJ=$(wildcard $(INPUTDIR)/*.pbj)
THESE_PBJJS=$(patsubst $(INPUTDIR)/%,$(OUTPUTDIR)/%.js,$(THESE_PBJ))
ALL_PBJJS += $(THESE_PBJJS)

all : $(ALL_PBJJS)


$(OUTPUTDIR)/%.pbj.js: $(INPUTDIR)/%.pbj $(PBJBIN)
	@mkdir $(OUTPUTDIR) 2>/dev/null || true
	$(PBJBIN) $< $@
