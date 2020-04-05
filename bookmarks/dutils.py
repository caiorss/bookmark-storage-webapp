import bs4 
import urllib
import shlex 

from typing import NamedTuple
from functools import reduce 

import os 
import urllib.request 
from urllib.parse import urlparse, unquote
from collections import namedtuple
import hashlib

# DownloadedFile = namedtuple("name", "mimetype", "hash", "data")
class DownloadedFile(NamedTuple):
    fileName:     str 
    fileMimeType: str 
    fileHash:     str 
    fileData:     bytes 

def download_file(url: str):
    req = urllib.request.Request(
        url, 
        data=None, 
        headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36'
    })
    u = urllib.request.urlopen(req)
    #req           = urllib.request.urlopen(url)
    f_name: str   = unquote(os.path.basename(urlparse(url).path))
    f_data: bytes = u.read()
    f_hash: str   = hashlib.md5(f_data).hexdigest()
    f_mime        = u.getheader("Content-Type", "application/octet-stream")

    return DownloadedFile( fileName = f_name
                         , fileMimeType = f_mime
                         , fileHash = f_hash
                         , fileData = f_data  )

