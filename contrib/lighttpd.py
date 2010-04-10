#!/usr/bin/python

# A simple wrapper for running lighttpd on your katajs.git
# directory. Generates an appropriate configuration and runs lighttpd
# with it.

import sys
import os
import tempfile

def main():

    conf = """
server.modules              = (
            "mod_access",
            "mod_alias",
            "mod_accesslog",
            "mod_compress"
)
server.document-root       = "%(pwd)s/"
server.errorlog            = "%(pwd)s/lighttpd.error.log"
index-file.names           = ( "index.php", "index.html",
                               "index.htm", "default.htm",
                               "index.lighttpd.html" )
accesslog.filename         = "%(pwd)s/lighttpd.access.log"
url.access-deny            = ( "~", ".inc" )
server.port               = 8888
include_shell "/usr/share/lighttpd/create-mime.assign.pl"
include_shell "/usr/share/lighttpd/include-conf-enabled.pl"
""" % { 'pwd' : os.getcwd() }
    print conf

    tmp_conf_file = tempfile.NamedTemporaryFile(delete = False)
    tmp_conf_file.write(conf)
    tmp_conf_file.close()

    print tmp_conf_file.name
    print 'lighttpd-angel -D -f %s' % (tmp_conf_file.name)
    os.system('lighttpd-angel -D -f %s' % (tmp_conf_file.name))
    return 0

if __name__ == "__main__":
    sys.exit(main())
