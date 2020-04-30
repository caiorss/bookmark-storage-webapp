import bs4 
import urllib
import shlex 

from typing import NamedTuple
from functools import reduce 

import os 
import urllib.request 

from urllib.parse import urlparse, unquote 
import urllib.parse

from collections import namedtuple
import hashlib
import ssl 
import re 

# Constant:
DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36'

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
        headers={ 'User-Agent': DEFAULT_USER_AGENT })
    # Ignore SSL verification for downloading file in any case 
    context = ssl._create_unverified_context()

    u = urllib.request.urlopen(req, context = context)
    #req           = urllib.request.urlopen(url)
    f_name: str   = unquote(os.path.basename(urlparse(url).path))
    f_data: bytes = u.read()
    f_hash: str   = hashlib.md5(f_data).hexdigest()
    f_mime        = u.getheader("Content-Type", "application/octet-stream")

    return DownloadedFile( fileName = f_name
                         , fileMimeType = f_mime
                         , fileHash = f_hash
                         , fileData = f_data  )


def clean_search_engine_url(url: str):
    """Clean URLs obfuscated by search engines."""

    # Remove google search engine obfuscated URLs.
    if re.match(".*google.*/url?", url) != None: 
        u = urllib.parse.urlparse(url)
        q = urllib.parse.parse_qs(u.query) 
        # print(f" q = {q}")
        if "url" in q: 
            return q["url"][0]
        return url 
    return url 
