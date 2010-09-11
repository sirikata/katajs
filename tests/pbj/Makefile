INPUTDIR=.
OUTPUTDIR=.

ALLSOURCES=$(wildcard $(INPUTDIR)/*.pbj) $(wildcard $(INPUTDIR)/*.proto)
ALLOUTPUTS=$(patsubst $(INPUTDIR)/%,$(OUTPUTDIR)/%.js,$(ALLSOURCES))

PBJBIN=../../externals/protojs/pbj

all: $(ALLOUTPUTS)

$(OUTPUTDIR)/%.proto.js: $(INPUTDIR)/%.proto $(PBJBIN)
	@mkdir $(OUTPUTDIR) 2>/dev/null || true
	$(PBJBIN) $< $@

$(OUTPUTDIR)/%.pbj.js: $(INPUTDIR)/%.pbj $(PBJBIN)
	@mkdir $(OUTPUTDIR) 2>/dev/null || true
	$(PBJBIN) $< $@
