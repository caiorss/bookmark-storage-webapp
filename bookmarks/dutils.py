import bs4 
import urllib
import shlex 

from typing import NamedTuple
from functools import reduce 

import os 


from urllib.parse import urlparse, unquote 
import urllib.parse
import urllib.request

from collections import namedtuple
import hashlib
import ssl 
import re 

import urllib.request   
import bs4
from http.client import HTTPResponse 
import base64

# Constant:
DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36'

# DownloadedFile = namedtuple("name", "mimetype", "hash", "data")
class DownloadedFile(NamedTuple):
    """Named tuple containing downloaded file metadata."""
    fileName:     str 
    fileMimeType: str 
    fileHash:     str 
    fileData:     bytes 

def download_file_from_http(url: str) -> DownloadedFile:
    """Download file from URL returning a DownloadedFile record. """
    assert url.startswith("http:") or url.startswith("https://")

    import mimetypes
    import django.utils.text
    
    req = urllib.request.Request(
        url, 
        data=None, 
        headers={ 'User-Agent': DEFAULT_USER_AGENT })
    # Ignore SSL verification for downloading file in any case 
    context = ssl._create_unverified_context()

    u = urllib.request.urlopen(req, context = context)
    #req           = urllib.request.urlopen(url)
    # f_name: str   = unquote(os.path.basename(urlparse(url).path))    

    f_data: bytes = u.read()
    f_hash: str   = hashlib.md5(f_data).hexdigest()
    f_mime        = u.getheader("Content-Type", "application/octet-stream")

    header_disposion = u.getheader("Content-Disposition")
    ext = mimetypes.guess_extension(f_mime)

    # Example: 
    # This block turns the URL https://www.appinf.com/download/PortableSystems.pdf
    # int the base name: PortableSystems 
    basename_ = os.path.splitext( os.path.basename( urlparse(url).path ) )[0]

    # Convert string in to a file name friendly string. 
    # See: https://docs.djangoproject.com/en/2.1/ref/utils/#django.utils.text.slugify
    basename  = django.utils.text.slugify(basename_)

    if header_disposion is not None:
        f_name: str = header_disposion.split(";")[1].strip().strip("filename=").strip("\"")
    elif f_mime is not None and ext is not None:
        f_name: str = basename + ext 
    else: 
        f_name: str = basename
    return DownloadedFile( fileName     = f_name
                         , fileMimeType = f_mime
                         , fileHash     = f_hash
                         , fileData     = f_data  )

def download_file_from_ftp(url: str) -> DownloadedFile:
    """Download file from FTP server."""

    assert url.startswith("ftp:")
    temp_file, _ = urllib.request.urlretrieve(url)    
    f_data: bytes = bytes()

    with open(temp_file, "rb") as fd:
        f_data = fd.read()
        os.remove(temp_file)

    # Md5 Checksum 
    f_hash: str   = hashlib.md5(f_data).hexdigest()
    # Get basename (file name without extension) and file extension. 
    f_name = os.path.basename( urlparse(url).path )
    from mimetypes import MimeTypes
    mime = MimeTypes()
    f_mime: str = mime.guess_type(url)[0]    
    return DownloadedFile( fileName     = f_name
                         , fileMimeType = f_mime
                         , fileHash     = f_hash
                         , fileData     = f_data  )


   

def download_from_slideshare(url: str) -> DownloadedFile:
    #assert url.startswith("https://www.slideshare.net/")
                                          
    def make_http_request(url) -> HTTPResponse:
        req = urllib.request.Request(url, data = None, headers = { 
                 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36' 
        })
        return urllib.request.urlopen(req, timeout = 4)

    resp = make_http_request(url)
    data = resp.read().decode('utf-8')
    #print(" data = ", data)
    soup = bs4.BeautifulSoup(data, features = "html.parser") 

    title_node = soup.find("title")
    assert title_node is not None
    title = title_node.text
    print(" [INFO] Title = ", title)

    html = f""" 
    <h1>{title}</h1>
    <br/>
        Slide URL: <a href={url}>{title}</a>
    <br/>
    """

    for img in soup.select("img.slide_image"):
        img_url = img.get("data-normal").strip("'")        
        print(" Slide image : ", img_url)
        img_resp = make_http_request(img_url)        
        mime = img_resp.getheader("Content-Type", "application/octet-stream")
        img_b64: str = base64.b64encode(img_resp.read()).decode("ascii")
        assert type(img_b64) is str 
        html = html + "\n" + f'<img src="data:{mime};base64, {img_b64}" />' + "<br/>"

    # print(" html = ", html)

    # Convert string in to a file name friendly string. 
    # See: https://docs.djangoproject.com/en/2.1/ref/utils/#django.utils.text.slugify
    import django.utils.text
    f_name  = django.utils.text.slugify(title) + ".html"
    f_mime  = "text/html"
    f_data: bytes = html.encode("utf-8")
    f_hash: str   = hashlib.md5(f_data).hexdigest()

    return DownloadedFile( fileName     = f_name
                         , fileMimeType = f_mime
                         , fileHash     = f_hash
                         , fileData     = f_data  )



def download_file(url: str) -> DownloadedFile:
    if ".slideshare.net" in url:
        return download_from_slideshare(url)
        #raise Exception("Error: not implemented.")

    if url.startswith("http://") or url.startswith("https://"):
        return download_file_from_http(url)
    if url.startswith("ftp://"):
        return download_file_from_ftp(url)    
    raise Exception("There is no handle function for this type of URL.") 


def remove_url_obfuscation(url: str):
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
