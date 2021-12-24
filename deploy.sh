#!/bin/sh

rsync --no-perms -azvvr --exclude '*.json' --exclude '.*' * peterhajas.com:/var/www/html/peterometer/

