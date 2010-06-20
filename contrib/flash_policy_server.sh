#!/bin/sh
sudo sh -c 'while true; do /bin/echo -e "<cross-domain-policy><allow-access-from domain=\"*\" to-ports=\"*\"/></cross-domain-policy>\0" | sudo nc -l -p 843 > /dev/null; done'
