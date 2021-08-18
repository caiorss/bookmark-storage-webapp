import bs4 
import urllib
import shlex 

from typing import NamedTuple, Dict
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

# Http Request header for making http server believe that it is a 
# a web browser. 
_HTTP_REQUEST_HEADER: Dict[str, str] = {
      'User-Agent':         'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36' 
    , 'accept':             'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    , 'accept-encoding':    'gzip, deflate, br'
    , 'accept-language':    'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7,ru;q=0.6,la;q=0.5,pt;q=0.4,de;q=0.3'
    , 'cache-control':      'no-cache'
    , 'upgrade-insecure-requests': '1'
}


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

    headers = _HTTP_REQUEST_HEADER.copy()
    headers["referer"] = url 

    req = urllib.request.Request(
          url 
        , data = None 
        , headers = headers)
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

def download_github_archive(user: str, repository: str) -> DownloadedFile:
    """Download ZIP archive from master or main repository. """
    _url_base = f"https://www.github.com/{user}/{repository}/archive/"
    _url1 = _url_base + "master.zip"
    _url2 = _url_base + "main.zip"
    try:
        print(f" [TRACE] Downloading from URL = {_url1}")
        data = download_file_from_http(_url1)
        return data 
    except Exception as ex:
        print(" [ERROR] Got exception => Retry => Ex: ", ex)
        print(f" [TRACE] Downloading from URL = {_url2}")
        data = download_file_from_http(_url2)
        return data   
    raise Exception("Edge case reached. => Not implemented yet.")

def download_file(url: str) -> DownloadedFile:
    print(f" [DEBUG] Downloading file from URL = {url}")

    if ".slideshare.net" in url:
        return download_from_slideshare(url)
        #raise Exception("Error: not implemented.")
    
    # Match URL for instance: http://github.com/USER/REPOSITORY 
    # Download zip archive from repository: http://github.com/USER/REPOSITORY/archive/master.zip
    url_parse: ParseResult = urlparse(url)
    # import pdb; pdb.set_trace()
    if (url_parse.hostname == "github.com" or url_parse.hostname == "www.github.com") \
        and len(url_parse.path.split("/")) == 3:
        p = url_parse.path.split("/")
        return download_github_archive(user = p[1], repository = p[2])
    if url.startswith("http://") or url.startswith("https://"):
        return download_file_from_http(url)
    if url.startswith("ftp://"):
        return download_file_from_ftp(url)    
    # if url.startswith("")
    raise Exception("There is no handle function for this type of URL.") 


def remove_url_obfuscation(url: str) -> str:
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
