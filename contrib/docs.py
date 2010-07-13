#!/usr/bin/python

# Attempts to download jsdoc-toolkit, set it up, and use it to build
# doxygen style documentation for the katajs API.
#
# NOTE: Assumes you are running from the top level directory, i.e.
#
# cd katajs.git
# ./contrib/docs.py

import subprocess
import os.path

JSDOC_VERSION = '2.4.0'
JSDOC_DIR = 'jsdoc_toolkit-' + JSDOC_VERSION
JSDOC_FILE = JSDOC_DIR + '.zip'
JSDOC_BINS = JSDOC_DIR + '/jsdoc-toolkit/'

# Make sure we have JSDoc-toolkit
if (not os.path.exists(JSDOC_DIR)):
    JSDOC_URL = 'http://jsdoc-toolkit.googlecode.com/files/jsdoc_toolkit-' + JSDOC_VERSION + '.zip'
    subprocess.Popen(['wget', JSDOC_URL, '-O', JSDOC_FILE]).wait()
    subprocess.Popen(['unzip', JSDOC_FILE]).wait()

# And run JSDoc-toolkit over our code
# -a = include all functions
# -r = recurse
# -d = output directory
# -t = template, currently just the default
subprocess.Popen(['java', '-jar', JSDOC_BINS + 'jsrun.jar', JSDOC_BINS + 'app/run.js', '-a', '-r', '-t=' + JSDOC_BINS + 'templates/jsdoc', '-d=docs', 'katajs']).wait();
