#!/usr/bin/env sh

/opt/usr/bin/pdf2htmlEX $1 $2 \
     --debug=2 \
     --data-dir=/opt/usr/local/share/pdf2htmlEx \
     --poppler-data-dir=/opt/usr/local/share/pdf2htmlEX/poppler
