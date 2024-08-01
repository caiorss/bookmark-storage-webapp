import typing
from typing import Dict, List, NamedTuple
from django.db.models.expressions import OrderBy
from django.forms.widgets import FILE_INPUT_CONTRADICTION

from django.http import HttpResponse, FileResponse, Http404
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.db.models import Q 
import django.shortcuts as ds 
import django.core.exceptions
from django.forms.utils import ErrorList
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
import socket 

from bookmarks import dutils

from bookmarks.models import SiteBookmark, SavedSearch, Collection \
    , FileSnapshot, Tag, Tag2

import bookmarks.models as bm

import django.core.paginator as pag 
from django.core.handlers.wsgi import WSGIRequest
from django.db.models.query import QuerySet
from django.core.paginator import Page

import django.utils.http
from django.contrib.sessions.backends.db import SessionStore
from django.db.models.functions import Lower
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin

from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.db.models import Count
import logging
#from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
import django.core.paginator as dj_paginator 

from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver


import bs4 
import urllib
import shlex 

import typing as ty
from functools import reduce 

import PyPDF2
import io 

# --- Imports for REST APIs -----------------------#
from django.http import JsonResponse
import json 

# Template files 
tpl_main           = "bookmark_list.html"
tpl_forms          = "bookmark_form.html"
tpl_confirm_delete = "bookmark_confirm_delete.html"

# User agent for web scrapping 
## BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9"

BROWSER_USER_AGENT = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0"


@receiver(user_logged_in)
def on_login(sender, user, request, **kwargs):
    logger = logging.getLogger(__name__)
    logger.info(f" <LOGIN> User account {user} logged in.")


@receiver(user_logged_out)
def on_logout(sender, user, request, **kwargs):
    logger = logging.getLogger(__name__)
    logger.info(f" <LOGOUT> User account {user} logged out.")


class SignUpForm(UserCreationForm):
    username = forms.CharField( max_length =30
                              , required   = True
                              , help_text  ='Optional.')
    
    email = forms.EmailField( max_length =254
                            , required   =True
                            , help_text  ='Required. Inform a valid email address.')
    
    class Meta:
        model = bm.Account
        fields = ('username', 'email', 'password1', 'password2', )

def signup(request):

    logger = logging.getLogger(__name__)

    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            form.save()
            username     = form.cleaned_data.get('username')
            email        = form.cleaned_data.get('email')
            raw_password = form.cleaned_data.get('password1')
            user         = django.contrib.auth.authenticate(email=email, password=raw_password)
            django.contrib.auth.login(request, user)
            return ds.redirect('/items')
    else:
        form = SignUpForm()

    logger.info("User registered Ok.")
    return ds.render(request, 'registration.html', {'form': form})


class BookMarkFilter(NamedTuple):
    view:     str 
    title:    str
    callback: typing.Any 

class BookmarksList(LoginRequiredMixin, ListView):

    logger = logging.getLogger(__name__)

    # --- overriden variables --------
    model         = SiteBookmark
    template_name = tpl_main
    paginate_by  = 15
    context_object_name = "object_list"
    
    null_view = BookMarkFilter("null", "Listing items by latest added", None)

    filter_dispatch: Dict[str, BookMarkFilter] = {}    
    empty_query = model.objects.none()

    def __init__(self):
        super(BookmarksList, self).__init__()
        self.start()

        # ---------- Set callbacks ------------#   
    def start(self):
        self.add_filter("id",           "Select single item by ID",        self.filter_by_id)
        self.add_filter("all",          "Listing all items",               self.filter_all)
        self.add_filter("starred",      "Starred items",                   self.filter_starred)
        self.add_filter("removed",      "Removed items",                   self.filter_removed)
        self.add_filter("doctype",      "Items fitered by type",           self.filter_doctype)
        self.add_filter("search",       "Search results",                  self.filter_search)
        self.add_filter("domain",       "Items filtered by domain",        self.filter_domain)
        self.add_filter("collection",   "Collection items",                self.filter_collection)
        self.add_filter("tag-name",     "Filter tag by name",              self.filter_by_tag_name)
        self.add_filter("created-date", "Filter by created date",          self.filter_by_created_date)
        self.add_filter("upload",       "File uploads",                    self.filter_uploads)
        self.add_filter("snapshot",     "Items with snapshots",            self.filter_has_snapshot)
        return self 

    def add_filter(self, view: str, title: str, callback):
        self.filter_dispatch[view] = BookMarkFilter(view = view, title = title, callback = callback)

    def order_query(self, query: QuerySet) -> QuerySet:
        ORDER_BY_NEWEST = "new"       # Order items by newest added (by id)
        ORDER_BY_OLDEST = "old"       # Order items by oldest added (by id)
        ORDER_BY_UPDATE = "updated"   # Order items by last updated 
        order: str = self.request.GET.get("order") or ORDER_BY_NEWEST
        print(" [TRACE] ORDER = ", order)

        # logging.debug(f" Order search results by {order}")

        if order == ORDER_BY_NEWEST:
            ## print(" [TRACE] Order by newest")
            return query.order_by("id").reverse()
        elif order == ORDER_BY_OLDEST:
            ## print(" [TRACE] Order by oldest")
            return query.order_by("id")
        elif order == ORDER_BY_UPDATE:
            ## print(" [TRACE] Order by last update")
            return query.order_by("updated").reverse()
        else:
            # Default: ORDER_BY_NEWEST
            return query.order_by("id").reverse()

    # Determines the query => Called before get_context_data()
    def get_queryset(self) -> QuerySet:
        ## print(" [TRACE] get_queryset() called. Ok. ")
        filter_: str = self.request.GET.get("filter", "")                
        query: QuerySet = self.empty_query
        if filter_ in self.filter_dispatch.keys():            
            query = self.filter_dispatch[filter_].callback() 
        else:                    
            query = self.filter_all()
        return self.order_query( query )

    # Return context data dictionary to the rendered template 
    def get_context_data(self, **kwargs):        
        print(" [TRACE] get_context_data() called. Ok. ")
        # Context variable is a dictionary which contains the variables
        # visible in the Django template files 
        context = super(BookmarksList, self).get_context_data(**kwargs)
        assert context is not None 
        ## print(f" Trace = { self.context_object_name }")
        query: QuerySet = context[self.context_object_name]
        assert query is not None 
        narrow = self.request.GET.get("narrow") or "off"
        search = self.request.GET.get("search") or ""
        if narrow != "off":
            query = query.filter( title__contains = search) 
            pass 
        rFilter = self.request.GET.get("filter") or ""
        rA0     = self.request.GET.get("A0") or ""
        # rQuery  = self.request.get("query")
        rQuery  = urllib.parse.quote(self.request.GET.get("query") or "")
        rMode   = self.request.GET.get("mode")   or ""
        rOrder  = self.request.GET.get("order")  or ""
        url_state = "filter={filter}&A0={A0}&mode={mode}&query={query}&order={order}"\
            .format(  filter = rFilter 
                    , A0     = rA0 
                    , query  = rQuery
                    , mode   = rMode 
                    , order  = rOrder 
                    )   
        ## print(f" [TRACE] get_context_data() =>> url_state = {url_state}") 
        view = self.request.GET.get("filter") or "null"
        ## print(f" [TRACE] get_context_data() =>> view = {view}")
        title = (self.filter_dispatch.get(view) or self.null_view).title 
        tag_description = ""
        if view == "doctype":
            title = title + ": " + (self.request.GET.get("A0") or "")
        elif view == "collection":
            coll_id = self.request.GET.get("A0")
            coll = Collection.objects.get(id = coll_id, owner = self.request.user)
            title = title + " : " + coll.title 
        elif view == "tag-name":
            title = title + " : " + rA0 
            tag: Tag2 = Tag2.objects.get(name = rA0, owner = self.request.user)
            tag_description = tag.description
            ## tag_description = self.
        context["page_title"] = title 
        context['count'] = self.get_queryset().count()
        context["url_state"] = url_state
        context["tag_description"] = tag_description
        order = self.request.GET.get("order") or "new" 
        if   order == "new": context["item_sorting"] = "Newest items"
        elif order == "old": context["item_sorting"] = "Oldest items"
        elif order == "updated": context["item_sorting"] = "Latest updated items"
        return context

    #---------- Utility methods  -------------------------------#

    # Get query parameter as Integer
    def query_param_as_int(self, param: str):
        a0: str = self.request.GET.get(param)
        if not a0: 
            raise ds.Http404("Error: expected number for parameter A0, but got empty parameter")
        if a0.isnumeric:
            return int(a0)
        raise ds.Http404("Error: expected number for parameter A0")            

    #--------- Callbacks / Query Filters -----------------------#

    def filter_by_id(self):
        user: AbstractBaseUser = self.request.user              
        A0: str = self.request.GET.get("A0")               
        return self.model.objects.exclude(deleted = True)\
            .filter( owner = user, id = A0)

    def filter_all(self):
        user: AbstractBaseUser = self.request.user         
        order: str = self.request.GET.get("order") or "last"  
        query = self.model.objects\
            .filter(owner = self.request.user)\
            .exclude(deleted = True)
        return query 


    # Select only user marked (starred, favourite) bookmarks
    def filter_starred(self):
        query: QuerySet = self.model.objects.filter(starred = True).exclude(deleted = True)\
            .filter(owner = self.request.user)
        order: str = self.request.GET.get("order") or "last"        
        return  query
    
    def filter_removed(self):        
        return self.model.objects.filter(deleted = True or deleted == None ) \
            .filter(owner = self.request.user)

    # Url example: /items?filter=domain&A0=www.reddit.com
    def filter_domain(self):
        # Argument zer0 
        A0: str = self.request.GET.get("A0")            
        if not A0: return self.empty_query
        d = A0.strip("www.").strip("m.").strip("old.").strip("mobile.")
        return self.model.objects.filter(url__contains = d)\
                   .exclude(deleted = True).filter(owner = self.request.user)\

    # Url example: /items?filter=tag-name&A0=tag1,tag2,...,tagn
    def filter_by_tag_name(self):
        A0: str = self.request.GET.get("A0")            
        if not A0: return self.empty_query
        try:
            tag: Tag2 = Tag2.objects.get(name = A0, owner = self.request.user)
            return tag.item.filter(deleted = False)   
        except Tag2.DoesNotExist:
            return self.model.objects.none()     

    # Url example: /items?filter=doctype&A0=thesis
    def filter_doctype(self):
        # Argument zer0 
        A0: str = self.request.GET.get("A0")            
        if not A0: return self.empty_query
        return self.model.objects.filter(doctype = A0)\
                   .exclude(deleted = True)\
                   .filter(owner = self.request.user)

    def filter_collection(self):
        coll_id: int = self.query_param_as_int("A0")
        c: Collection = ds.get_object_or_404(Collection, id = coll_id)
        return c.item.all()        

    def filter_search(self):
        search: str = self.request.GET.get('query').strip()
        search: str = dutils.remove_url_obfuscation(search)

        mode   = self.request.GET.get('mode', "")
        if not search or search == "":
            return self.filter_all()  
        words = shlex.split(search)

        lam = lambda x, y: x | y
        if  mode == "OR":
            lam = lambda x, y: x | y
        if mode == "AND":
            lam = lambda x, y: x & y
        # q = Q(title__contains =   search) | Q(url__contains =  search)       
        q1 = reduce(lam, [ Q(url__contains=w) for w in words])
        q2 = reduce(lam, [ Q(title__contains=w) for w in words])
        q3 = reduce(lam, [ Q(brief__contains=w) for w in words])

        return self.model.objects\
            .filter(owner = self.request.user)\
            .filter(q1 | q2 | q3).exclude( deleted = True )

    def filter_by_created_date(self):
        date: str = self.request.GET.get("A0")
        year, month, day = date.split("-")
        filter_type:  str = self.request.GET.get("filter")
        assert filter_type == "created-date"

        return self.model.objects.filter( owner = self.request.user
                                        , created__year = year
                                        , created__month = month
                                        , created__day = day     )\
            .exclude( deleted = True )

      #  return self.model.objects.filter(owner = self.request.user, created = created_date)\
      #      .exclude(deleted = True )
            

    def filter_has_snapshot(self) -> QuerySet:
        """Filter items that has snapshot attachment files."""
        return SiteBookmark.objects.annotate( c = Count("filesnapshot") )\
            .filter( owner = self.request.user, deleted = False, c__gte = 1 )

    def filter_uploads(self):
        """Filter items that have uploaded files (snapshot file)."""
        return self.model.objects.filter(owner = self.request.user, is_upload = True).exclude(deleted = True)

# URL route for adding item through bookmarklet 
@login_required 
def bookmark_add_item_bookmarklet(request: WSGIRequest):
    url: str   = request.GET.get("url")
    title: str = request.GET.get("title", "")
    #if not title or title == "":
    #    return django.http.HttpResponseBadRequest("Error: title cannot be empty")
    if not url or url == "":
        return django.http.HttpResponseBadRequest("Error: url cannot be empty")
    
    # Check whether URL is alredy in the database 
    # If that is the case, this function returns an error.     
    try:
        u = SiteBookmark.objects.get(url = url)    
        return django.http.HttpResponseBadRequest("Error: url already exists")        
    except SiteBookmark.DoesNotExist:
        pass

    b:    SiteBookmark     = SiteBookmark(url = url, title = title)
    user: AbstractBaseUser = request.user
    b.owner = user 
    b.save()
    if not url.endswith(".pdf"): update_item_from_metadata(b.id)
    return ds.redirect("/items")    

# Toggle embeddeing of Youtube video 
# Url route: /options/video_toggle 
def video_toggle(request: WSGIRequest):
    # print("type(request.session) = {}".format(type(request.session)))
    session: SessionStore = request.session
    redirect_url = request.GET.get("url") or "/"
    video_toggle = session.get("video_toggle", False)
    session["video_toggle"] = not video_toggle    
    return ds.redirect( redirect_url ) 

def update_item_from_metadata(itemID: int) -> None:  
    b: SiteBookmark = SiteBookmark.objects.get(id = itemID)    
    # URL with obfuscation removed 
    real_url: str = dutils.remove_url_obfuscation(b.url)

    logger = logging.getLogger(__name__)
    logger.debug(f"Real_url = { real_url }")    
    
    import urllib
    from urllib.parse import urlparse, ParseResult
    url_obj: ParseResult = urlparse(real_url)
    domain  = url_obj.hostname

    import httpx 

    if domain == "wikipedia.org" or domain == "en.m.wikipedia.org":
        import wikipedia
        try:
            guess_title = url_obj.path.strip("/wiki")
            page: wikipedia.wikipedia.WikipediaPage = wikipedia.page(guess_title)
            b.title = page.original_title
            b.brief = page.summary
            b.save()            
            return 
        except wikipedia.exceptions.PageError:
            pass        

    if b is None:
        return django.http.HttpResponseBadRequest("Error: invalid item ID, item does not exist.")            
    
    try:
        # Reference: https://stackoverflow.com/a/18269491
        url_ = urllib.parse.urlsplit(real_url)
        url_ = list(url_)
        url_[2] = urllib.parse.quote(url_[2])
        url_ = urllib.parse.urlunsplit(url_)

        req = httpx.get(  url_
                        , follow_redirects= True
                        , headers = {
                            'User-Agent':       BROWSER_USER_AGENT
                            , 'Host':             domain 
                            , 'Accept':          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                            , 'Accept-Language': 'en-US,en;q=0.5'
                            , 'Cache-Control':   'no-cache' 
                       }) 

        content_type = req.headers.get("Content-Type")

        if "pdf" in content_type: 
            # data = page.read() 
            data = req.read()
            view = io.BytesIO(data)
            pdf  = PyPDF2.PdfFileReader(view)
            inf  = pdf.documentInfo
            assert(inf is not None)

            if inf.author is None:
                b.title = (inf.title or inf.subject or real_url) + " [PDF] "
            else:
                b.title = (inf.title or inf.subject or real_url) + " [PDF] / " + inf.author 
            
            if inf.subject is None:
                text_len_max = 400 
                text = pdf.getPage(0).extractText() 
                b.brief = (text[:text_len_max] + " ... ") if len(text) > text_len_max else text 
            else: 
                b.brief = inf.subject or "" 
            b.save()
            return 


        if not ("pdf" in content_type):
            # soup = bs4.BeautifulSoup(page, features = "lxml")
            soup = bs4.BeautifulSoup(req.read(), features = "lxml")
            
             ## print(" [TRACE] request = ", req)
             ## print(" [TRACE] page = ", soup)

            # title <- soup.find("title").text if soup is not None, otherwise
            # , it is set to "" (empty string)
            title: str = getattr( soup.find("title"), "text", "")
            
            # Extract tag <meta name='description' content="Website description here ...." />
            m = soup.find("meta", attrs={'name': 'description'})             
            brief: str = m.get("content") if m is not None else ""

            url: str = b.url
            if "stackoverflow.com/questions" in url:
                m = soup.find("meta", attrs={'name': 'twitter:description'})         
                brief: str = m["content"] if m is not None else ""        

            # Limit brief to 900 characters
            brief = brief[:900]

            # Extract title of RFC internet standard from IETF web page
            if domain == "datatracker.ietf.org":
                print(" [TRACE] Found IETF domain RFC document")
                m = soup.find("span", attrs={'class': 'h1'})         

                if "https://datatracker.ietf.org/doc/html/rfc" in url:
                    rfc: str = real_url.strip("https://datatracker.ietf.org/doc/html/").upper()
                    title = "IETF - RFC" + rfc + " /  " + getattr( m, "text", "" )
                else:
                    title = "IETF - " + getattr( m, "text", "" )

            # Extract JSON metadata from youtube video such as Author and Channel URL
            if ("playlist" not in url) and (("youtube.com" in url) or ("m.youtube.com" in url)):
                print(" [TRACE] Site is Youtube.")
                import urllib.request
                import http.client
                import json
                turl: str = f"https://www.youtube.com/oembed?url={url}&format=json"
                resp: http.client.HTTPResponse = urllib.request.urlopen(turl)
                metadata = json.loads(resp.read())
                title = "( {0} ) {1}".format(  metadata["author_name"], title) 
                brief = "Author name = " + metadata["author_name"] + "\n" \
                    + "Channel URL = " + metadata["author_url"] + "\n" \
                    + brief

            title_append = ""
            if (("youtube.com" in url) or ("m.youtube.com" in url) and "playlist" in url):
                title_append = "(playlist) "

            b.url   = real_url
            b.title = title_append + title  
            # Only first 50 lines 
            b.brief = brief
            print(" [TRACE] URL = ", b.url)
            b.save()

    except (urllib.error.URLError, socket.timeout) as ex:          
        print(" [FAULT] Exit codepath => ", ex)
        # return 
    # print(" [TRACE] Test code path 2")
    return 

@login_required
def extract_metadata(request: WSGIRequest):
    back_url: str = request.GET.get("url")    
    if back_url is None or back_url == "":
        return django.http.HttpResponseBadRequest("Error: invalid request.")            
    id_str: str = request.GET.get("id")
    item_id: int = int(id_str) if id_str is not None else -1
    if item_id < 0:
        return django.http.HttpResponseBadRequest("Error: invalid item ID.")                
    update_item_from_metadata(item_id)
    return ds.redirect(back_url)

import urllib.request 
from urllib.parse import urlparse
import hashlib
import os 
from urllib.parse import urlparse

@login_required
def fetch_itemsnapshot(request: WSGIRequest):
    """ Download file snaphot from bookmark URL and store file in file cache.
    
    """
    redirect_url: str = request.GET.get("url")
    if redirect_url is None or redirect_url == "":
        return django.http.HttpResponseBadRequest("Error: invalid redirection URL.")

    itemID_str: str = request.GET.get("id")

    if itemID_str is None or not itemID_str.isnumeric(): 
        return django.http.HttpResponseBadRequest("Error: invalid Item ID.")

    itemID: int = int(itemID_str)
    item: SiteBookmark = ds.get_object_or_404(SiteBookmark, id = itemID)    

    try:
        FileSnapshot.createSnapshot(item.id, item.url)
    except urllib.error.URLError as ex:    
        print(f" Exception = {ex}")      
        return django.http.HttpResponseBadRequest("Error: urrlib Exception = {ex}".format(ex = ex))        
    
    return ds.redirect(redirect_url)

@login_required
def get_snapshot_file(request: WSGIRequest, fileID, fileName):
    """Download bookmark's file snapshot (attachment) from the database. 
       
       Endpoint URL: /snapshot/file/<fileID>/<fileName>
       Where: 
           - fileID - is the file unique ID (UUID)
           - fileName - is the file name.

       The URL was designed in this way for obfuscating file URLs
       and avoiding viewers from guessing the URLs.
    """
    from django.utils.text import slugify

    # sn: ItemSnapshot = ds.get_object_or_404(ItemSnapshot, id = fileID)
    print(" [TRACE] get_snapshot_file() ")
    sn: FileSnapshot = ds.get_object_or_404(FileSnapshot, id = fileID)

    title = urllib.parse.quote(request.GET.get("title") or "archive")
    
    try:
        with open(sn.getFilePath(), 'rb') as fp:
            res       = HttpResponse(fp, content_type = sn.fileMimeType)
            extension = os.path.splitext(sn.getFilePath())[1]
            # Truncate title to 60 characters 
            title     = request.GET.get("title")
            title     = title[:60] if len(title) > 60 else title 
            # Create a suitable file name out of an arbitrary string 
            fname     = slugify(title)

            if extension.startswith("."):
                _fname = fname + extension
            else:
                _fname = fname + "." + extension
            
            res["Content-Disposition"] = f"inline; filename = {_fname}"
            return res 
    except FileNotFoundError as err:
        raise Http404("Error: file not found => {err}".format(err = err))

@login_required
def document_viewer(request: WSGIRequest, itemID: int):
    item: SiteBookmark = ds.get_object_or_404(SiteBookmark, id = itemID)
    path = item.snapshot_file()
    if path is None:
        return Http404("Error: item[id = {id}] does not have any attachment.".format(id = itemID))
    return ds.render(request, "viewer.html", { "item": item
                                           , "file_url": "/snapshot/file/" + path})

@login_required
def rest_item_query(request: WSGIRequest):    
    from django.http import JsonResponse
    from django.core import serializers
    item_id_str : str = request.GET.get("id")    
    if not item_id_str or not item_id_str.isnumeric:
        return JsonResponse({"result": "ERROR", "reason": "Expected id query parameter"})    
    item_id: int = int(item_id_str)    
    try:
        item = SiteBookmark.objects.get(id = item_id)
        print(f" [TRACE] - type = {type(item)} ; item = {item} ")
        js = serializers.serialize('json', [item] )
        print(f" [TRACE] - type = {type(js)} js = {js}  ")
        return  HttpResponse( js )
    except SiteBookmark.DoesNotExist:
        return JsonResponse({"result": "ERROR", "reason": "Item not found"})
    

# Rest API Request: 
#   Endpoint: /api/item 
#   Method:   POST 
#   Payload:  { 'url': <URL> }
#
# Rest API Response body: 
#  [+] For success =>  { "result": "OK" }                         
#  [+] For failure =>  { "result": "ERROR", "Reason": <REASON> }  
#
def rest_item_create(request: WSGIRequest):
    from django.http import JsonResponse
    import json 

    print(" [TRACE] Enter rest_item_create() function. ")

    if request.method != "POST":
        return JsonResponse({ "result": "ERROR"
                              , "reason": "Invalid method for this endpoint"})
    
    body_unicode = request.body.decode("utf-8")
    body = json.loads(body_unicode)

    if not "url" in body:
        return JsonResponse( { "result": "ERROR"
                              , "reason": "misssing URL field"})

    print(f" [TRACE] request body = {body} ; type(body) = {type(body)} ")

    url:  str = body["url"]
    url_: str = dutils.remove_url_obfuscation(url)    
    assert url_ is not None 

    # Current logged user 
    user: AbstractBaseUser = request.user

    try:
        # Check whether URL already exists in the database         
        it  = SiteBookmark.objects.filter(owner = user).get(url = url)        
        return JsonResponse({ "result": "FAILURE", "reason": "URL already exists" })
    except SiteBookmark.DoesNotExist:
        pass         

    logger = logging.getLogger(__name__)

    item = SiteBookmark.objects.create(url = url_, owner = user)
    item.save()
    update_item_from_metadata(item.id)

    logger.debug(f"Add bookmark: f{url_} ")
    return  JsonResponse({ "result": "OK" })


def rest_item(request: WSGIRequest):
    print(f" [INFO] request.method == {request.method} ")
    method: str = request.method
    if method.lower() == "get":
        return rest_item_query(request)
    if method.lower() == "post":
        return rest_item_create(request)
    return Http404("Error: method not allowed for this endpoint")


def rest_bulk_action(request: WSGIRequest):
    
    print(" [TRACE] rest_bulk_action() called Ok.")
    assert( request.method == "POST" and request.is_ajax() )

    body = json.loads(request.body.decode("utf-8"))
    print(f" [TRACE] type(body) = {type(body)} ")
    items_id = body["items"]

    action: str = body["action"]

    print(" [TRACE] Request body = ", body, " Items = ", items_id)

    for id in items_id:
        print(f" [TRACE] id = {id} - {type(id)}")
        try:
            item: SiteBookmark = SiteBookmark.objects.get(id = id)
            
            if action == "DELETE": 
                item.deleted = True; item.save()

            if action == "RESTORE":
                item.deleted = False; item.save()
            
            if action == "ADD_STARRED":
                item.deleted = False
                item.starred = True
                item.save()

            if action == "REM_STARRED":
                #item.deleted = False
                item.starred = False 
                item.save()

            print(" [TRACE] Item = ", item)
        except SiteBookmark.DoesNotExist:
            return JsonResponse({"result": "ERROR", "reason": "Item not found"})    

    # if request.method != "POST" or (not request.is_ajax()):
    #    return Http404("Error: invalid request for this endpoint")

    return JsonResponse({  "result": "OK"
                         , "data":    body })


#  Route: /pdf2html/<<uuid>>/<<fileName>>
# 
@login_required
def pdf2hml(request: WSGIRequest, fileUUID: str, fileName: str):
    """ Converts PDF (Portable Document) to html by using the pf2htmlEx application. 
    
    """

    logger = logging.getLogger(__name__)
    logger.info(f" Converting PDF to HTML =>> UUID = f{fileUUID} ; file name = {fileName}  ")

    import subprocess
    sn: FileSnapshot = ds.get_object_or_404(FileSnapshot, id = fileUUID)
    data_dir:   str = os.path.join(django.conf.settings.BASE_DIR, "data")
    cache_dir:  str = os.path.join(data_dir,"pdf2html-cache")
    if not os.path.exists(cache_dir): os.makedirs(cache_dir)    
    pdf2html_bin: str = os.getenv("ENV_PDF2HTML_PATH") or os.path.join(data_dir, "pdf2htmlEx.bin")
    assert os.path.exists(pdf2html_bin), f"pdf2html executable supposed to be in ${data_dir}"    
    
    # File generated by pdf2htmlEx utility 
    html_file: str = os.path.join(cache_dir, f"{fileUUID}.html")
    print(f" [TRACE] html_file = {html_file} \n file = {sn.getFilePath()}")

    if not os.getenv("ENV_PDF2HTML_PATH"):
        args = [ pdf2html_bin, sn.getFilePath(), os.path.basename(html_file)
                 , "--dest-dir=" + cache_dir
               ]
    else:
        args =  [ pdf2html_bin, sn.getFilePath(), os.path.basename(html_file)
                  , "--dest-dir=" + cache_dir
                  , "--data-dir=/opt/usr/local/share/pdf2htmlEx"
                  , "--poppler-data-dir=/opt/usr/local/share/pdf2htmlEX/poppler"
                  , "--debug=1"
                ]

    print(" [DEBUG] args = ", args)
    
    if not os.path.exists( html_file ):
        print(f" [TRACE] HTML snapshot of file: ${fileUUID} does not exist yet ")
        print(" [TRACE] Creating file snapshot with pdf2html")

        proc = subprocess.run( args )
        #print(" Type(proc) ", type(proc))
        #status = proc.wait()
        #if status != 0:
        #    return Http404("Error: pdf2thml snapshot application failed.")
        
    with open(html_file, "rb") as fd:
        return HttpResponse(fd, content_type = "text/html")   

#  Route: /thumbinail/<<uuid>>  
# 
@login_required
def document_thumbnail(request: WSGIRequest, fileUUID: str):
    """ Generate thumbnail image of PDF document given the UUID file of PDF file. 
    
        Note: This function requires installation of ImageMagick suite that 
              provides the convert utility used by this function.
    """
    import subprocess
    sn: FileSnapshot = ds.get_object_or_404(FileSnapshot, id = fileUUID)
    data_dir:   str = os.path.join(django.conf.settings.BASE_DIR, "data")
    cache_dir:  str = os.path.join(data_dir,"thumbnail-cache")    



    print(f" [TRACE] cache_dir = {cache_dir} ")
    print(f" [TRACE]  data_dir = {data_dir} ")
    
    if not sn.is_pdf():
        return Http404("Error: Only PDF thumbnails previews are supported.")

    # Create cache directory if it does not exist yet. 
    if not os.path.exists(cache_dir): os.makedirs(cache_dir)  
    # Thumbnail file 
    thumb_file: str = os.path.join(cache_dir, f"{fileUUID}.png")

    logger = logging.getLogger(__name__)

    if not os.path.exists( thumb_file ):
        logger.info(f" Generating thumbinail of document =>> file = ${sn.fileName} ; uuid = {fileUUID}  ")
        proc = subprocess.run( [  # 'convert' => Utility from ImageMagick suite 
                                  "convert"
                                , "-density",    "300"
                                , "-quality",    "95"
                                , "-thumbnail",  "x300"
                                , "-background", "white"
                                , "-alpha",      "remove" 
                                # Export only the first page of PDF (index 0)
                                , sn.getFilePath() + "[0]"
                                , thumb_file
                                ] )
    with open(thumb_file, "rb") as fd:
        return HttpResponse(fd, content_type = "image/png")


class BookmarkCreate(LoginRequiredMixin, CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'doctype', 'deleted']
    success_url = "/items" #reverse_lazy('bookmarks:bookmark_list')    

    # Overriden from CreateView 
    def form_valid(self, form):
        req: WSGIRequest = self.request
        url: str = dutils.remove_url_obfuscation(req.POST.get("url"))
        user: AbstractBaseUser = req.user 
        assert url is not None
        try:
            it = SiteBookmark.objects.filter(owner = user).get(url = url)
            err = ErrorList([ u'Error: URL already exists.'])
            form._errors[django.forms.forms.NON_FIELD_ERRORS] = err 
            return self.form_invalid(form = form)        
        except SiteBookmark.DoesNotExist:
            pass         
        # Set foreign Key owner 
        form.instance.owner = user                 
        form.instance.url   = dutils.remove_url_obfuscation(form.instance.url)
        return super().form_valid(form = form)

class BookmarkUpdate(LoginRequiredMixin, UpdateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'doctype', 'is_upload', 'deleted' ]
    success_url = "/items" #reverse_lazy('bookmarks:bookmark_list')

    # Override UpdateView.get_success_url()
    def get_success_url(self):
        return self.request.GET.get("url") or self.success_url

class BookmarkDelete(LoginRequiredMixin, DeleteView):
    template_name = tpl_confirm_delete 
    model = SiteBookmark
    success_url = "/items" #reverse_lazy('bookmarks:bookmark_list')


# ------------ Saved Search ------------------------#

class SavedSearchList(LoginRequiredMixin, ListView):
    template_name = "savedsearch_list.html"

    def get_queryset(self):
        # print(" [TRACE] Executed SavedSearchList.get_queryset() ")
        user: AbstractBaseUser = self.request.user
        return SavedSearch.objects.filter(owner = user).order_by(Lower("search"))            

class SavedSearchCreate(LoginRequiredMixin, CreateView):
    template_name = tpl_forms
    model = SavedSearch 
    fields = ['search', 'description']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

    # Overriden from CreateView
    def form_valid(self, form):
        req:  WSGIRequest      = self.request
        user: AbstractBaseUser = req.user
        assert user.is_authenticated
        form.instance.owner = user
        return super().form_valid(form = form)


class SavedSearchUpdate(LoginRequiredMixin, UpdateView):
    template_name = tpl_forms
    model = SavedSearch 
    fields = ['search', 'description']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

#------------ Collection Listing -------------------#

class CollectionList(LoginRequiredMixin, ListView):
    template_name = "collection_list.html"
    # model = Collection
    # queryset = Collection.objects.order_by("title")

    def get_queryset(self):
        # print(" [TRACE] Executed SavedSearchList.get_queryset() ")
        user: AbstractBaseUser = self.request.user
        return Collection.objects.filter(owner = user, deleted = False)\
            .order_by(Lower("title")) #.reverse()    

class CollectionCreate(LoginRequiredMixin, CreateView):
    template_name = tpl_forms
    model = Collection
    fields = ['title', 'description', 'starred', 'deleted']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

# URL route: /tags
class TagList(LoginRequiredMixin, ListView):
    template_name = "tags_list.html"
    # model = Collection
    # queryset = Collection.objects.order_by("title")

    def get_queryset(self):
        # print(" [TRACE] Executed SavedSearchList.get_queryset() ")
        user: AbstractBaseUser = self.request.user
        return Tag2.objects.filter(owner = user, deleted = False)\
            .order_by(Lower("name")) #.reverse()    


def queryset2Json(queryset: QuerySet, columns: List[str]) -> JsonResponse:
    """ Turn queryset object into a key-value pair json response. """
    kv_pairs      = [ [ (c, row[c]) for c in columns] for row in queryset.values()]
    list_of_dicts = list(map(lambda x: dict(x), kv_pairs))
    return JsonResponse(list_of_dicts, safe =False)    

def querylist2Json(querylist, columns: List[str]) -> JsonResponse:
    """ Turn queryset object into a key-value pair json response. """
    kv_pairs      = [ [ (c, getattr(row, c) ) for c in columns] for row in querylist]
    list_of_dicts = list(map(lambda x: dict(x), kv_pairs))
    return JsonResponse(list_of_dicts, safe =False)    

@login_required
def item_upload(request: WSGIRequest):
    from django.core.files.uploadhandler import InMemoryUploadedFile
    from functools import partial
    import base64 
    import hashlib
    import mimetypes
    import os     
    # name of the form-upload field in the HTML template 
    UPLOAD_FORM_FIELD = "upload-file"
    media_dir: str = django.conf.settings.MEDIA_ROOT 

    # Reference: https://gist.github.com/Alir3z4/725297248a59cae05a50b15dd79fb4d0
    def hash_file(file, block_size=65536):
        hasher = hashlib.md5()
        for buf in iter(partial(file.read, block_size), b''):
            hasher.update(buf)
        return hasher.hexdigest()

    if request.method != "POST":
        return Http404("Error: invalid method. Only POST allowed")
    print(f" Request = ${request} ")

    uploaded_files: List[InMemoryUploadedFile] = request.FILES.getlist(UPLOAD_FORM_FIELD)

    if len(uploaded_files) == 0:
        return JsonResponse({"status": "ERROR", 'message': 'Error: zero file uploaded.'})

    fdata: InMemoryUploadedFile = uploaded_files[0]

    print(f" Uploaded file = {fdata.name}           " )
    print(f" Uploaded size = {fdata.size}           " )
    print(f" Content type  = {fdata.content_type}   " )
    sn = FileSnapshot(  fileName     = fdata.name 
                      , fileHash     = hash_file(fdata)
                      , fileMimeType = fdata.content_type )

    print(" [TRACE] sn = ", sn)
    sn.save()

    # Create associated file directory at path: 
    #  ${MEDIA_ROOT}/<FILE UUID>/<FILE_NAME>
    file_dir = os.path.join(media_dir, str(sn.id))
    file_path = os.path.join(file_dir, sn.fileName)
    os.mkdir(file_dir)

    with open( file_path, 'wb') as fd:
        for chunk in fdata.chunks(): fd.write(chunk)

    # Create corresponding bookmark to uploaded file 
    item_url = "snapshot/file/" + str(sn.id) + "/" + urllib.parse.quote(sn.fileName)
    item: SiteBookmark = SiteBookmark.objects.create(url = item_url, owner = request.user)
    item.title         = " [UPLOAD] " + sn.fileName
    item.is_upload     = True
    ## item.starred = body.get("starred") or False 
    item.save()
    # Associate file entry and internal bookmark
    sn.item.add(item)
    sn.save()
    print(" [TRACE] Finished Ok.")
    return JsonResponse({"status": "OK"})


class Ajax_Items(LoginRequiredMixin, django.views.View):

    def get(self, request: WSGIRequest, *args, **kwargs):
        pass 
    
    def post(self, request: WSGIRequest, *args, **kwargs):
        """Create new bookmark entry in the database."""
        body_unicode = request.body.decode("utf-8")
        body         = json.loads(body_unicode)
        action = body["action"]
        user: AbstractBaseUser = request.user
        print(" [TRACE] Request received ")

        if action == "item_new":
            url:  str    = body["url"]
            url_: str    = dutils.remove_url_obfuscation(url)            
            assert url_ is not None 
            # Current logged user             
            try:
                # Check whether URL already exists in the database         
                it  = SiteBookmark.objects.filter(owner = user).get(url = url)        
                return JsonResponse({ "result": "FAILURE", "reason": "URL already exists" })
            except SiteBookmark.DoesNotExist:
                pass         

            item = SiteBookmark.objects.create(url = url_, owner = user)
            item.starred = body.get("starred") or False 
            item.save()
            update_item_from_metadata(item.id)
            return  JsonResponse({ "result": "OK" })

        return  JsonResponse({ "result": "OK" })



    def delete(self, request: WSGIRequest, *args, **kwargs):
        body_unicode  = request.body.decode("utf-8")
        body          = json.loads(body_unicode)
        item_id:  str = body["id"]  
        mode:   str = body["mode"]      
        item = SiteBookmark.objects.get(id = item_id, owner = request.user)
        if mode == "soft": item.delete() 
        if mode == "hard": 
            self.delete_file_snapshot(request, item_id)
            item.hard_delete()
        return  JsonResponse({ "result": "OK" })

    # Backend REST-like API 
    #  
    # Http Method: 'PUT'
    # 
    # Json request: 
    #  { 
    #      , action: <ACTION>
    #      , id:     <ITEM_ID>
    #      , <PARAM>: <VALUE> 
    #  }
    def put(self, request: WSGIRequest, *args, **kwargs):
        """ Performs partial data update. """
        body = json.loads(request.body.decode("utf-8"))
        action: str = body["action"]
        item_id     = body["id"]
        
        if (not item_id) and (not title):
            return Http404("Error: invalid request")
        
        try:
            item = SiteBookmark.objects.get(id = item_id, owner  = request.user)    
        except SiteBookmark.DoesNotExist:
            item = SiteBookmark.objects.get(id = item_id, owner  = request.user, deleted = None)    
        
        if action == "rename":
            title: str = body["title"]
            item.title = title
        
        if action == "starred":
            value: bool = body["value"]
            item.starred = value 

        if action == "snapshot":       
            print(" [INFO] Downloading file snapshot. Ok.")     
            return self.download_file_snapshot(request, item_id)

        if action == "snapshot-delete":
            return self.delete_file_snapshot(request, item_id)

        item.save()
        return JsonResponse({ "result": "OK" }, safe = False)

    
    def download_file_snapshot(self, request: WSGIRequest, item_id):
        """Download file snapshot from URL to the file repository."""
        try:
            item = SiteBookmark.objects.get(id = item_id, owner = request.user)
        except SiteBookmark.DoesNotExist: 
            return JsonResponse({ 'result': 'ERROR', 'message': "Item does not exist"})
        # print(" [TRACE] download_file_snapshot =>> Downloaded file = ", item)
        # Remove previous Snapshot if it already exists 
        sn: FileSnapshot = item.filesnapshot_set.first()
        if sn is not None:
            path = sn.getDirectoryPath()
            # print(" [TRACE] File snapshot path = ", path)
            item.filesnapshot_set.remove(sn)
            sn.delete() 
        try:
            FileSnapshot.createSnapshot(item.id, item.url)
        except django.db.utils.IntegrityError as ex:
            return JsonResponse(
                {  "result": "ERROR"
                  ,"message": "Error: Database Integrity Error: {ex}".format(ex = ex)        
                 })
        except urllib.error.URLError as ex:    
            print(f" Exception = {ex}")      
            return JsonResponse({ 
                     "result": "ERROR"
                    ,"message": "Error: urrlib Exception = {ex}".format(ex = ex)
                   })
        return JsonResponse({'result': "OK", "message": "File downloaded Ok."})

    def delete_file_snapshot(self, request: WSGIRequest, item_id):
        try:
            item = SiteBookmark.objects.get(id = item_id, owner = request.user)
        except SiteBookmark.DoesNotExist: 
            return JsonResponse({ 'result': 'ERROR', 'message': "Item does not exist"})

        sn: FileSnapshot = item.filesnapshot_set.first()
        path = sn.getDirectoryPath()
        print(" [TRACE] File snapshot path = ", path)
        item.filesnapshot_set.remove(sn)
        sn.delete() 
        return JsonResponse({'result': "OK", "message": "File snapshot deleted Ok."})

# Endpoints: /api/collection 
class Ajax_Collection_List(LoginRequiredMixin, django.views.View):
    """Provides AJAX (REST) API response containing all user collections. """

    # Overrident from class View 
    def get(self, request: WSGIRequest, *args, **kwargs):
        query = Collection.objects.filter(owner = self.request.user, deleted = False)
        return queryset2Json(query, ["id", "title"])

    def post(self, request: WSGIRequest, *args, **kwargs):
        assert( request.method == "POST" and request.is_ajax() )

        body = json.loads(request.body.decode("utf-8"))
        print(f" [TRACE] type(body) = {type(body)} ")
        items_id: List[int] = body["items"]
        collectionID: int   = body["collectionID"]
        action: str         = body["action"]

        print(f" [TRACE] collectionID = {collectionID} ; items_id = {items_id} ")

        collection = Collection.objects.get(id = collectionID, owner = request.user)
        print(f" [TRACE] collection = {collection} ")

        for id in items_id:
            item = SiteBookmark.objects.get(id = id, owner = request.user)
            print(" [TRACE] item = ", item)
            collection.item.add(item)
            collection.save()

        return JsonResponse(body, safe = False)
        
    def delete(self, request: WSGIRequest, *args, **kwargs):
        """ Soft delete bookmark entry """
        assert( request.method == "DELETE" and request.is_ajax() )

        req: WSGIRequest = self.request
        body = json.loads(req.body.decode("utf-8"))

        coll_id = body["collection_id"]
        item_id = body["item_id"]

        coll: Collection   = Collection.objects.get(id = coll_id, owner = request.user)
        item: SiteBookmark = coll.item.get(id = item_id)
        coll.item.remove(item)

        print(f" [TRACE] item = ${item} ")

        print(" Delete collection = ", body)
        return JsonResponse({ "result": "OK" }, safe = False)



# REST API Endpoint: /api/collections
#   POST   /api/collections => Create new collection
#   GET    /api/collections => Get some collection
#   DELETE /api/collections => Delete current collection
#   PUT    /api/collections => Update current collection
#
class Ajax_Collections(LoginRequiredMixin, django.views.View):
    """ Create new collection """

    def get(self, request: WSGIRequest, *args, **kwargs):
        query = Collection.objects.filter(owner = self.request.user, deleted = False)
        return queryset2Json(query, ["id", "title"])

    def post(self, request: WSGIRequest, *args, **kwargs):
        """ Create new collection """
        assert( request.method == "POST" and request.is_ajax() )

        req: WSGIRequest = self.request
        body = json.loads(req.body.decode("utf-8"))        

        title       = body["title"]
        description = body["description"]

        new_collection = Collection.objects.create(title = title, description = description)
        new_collection.owner = request.user 
        new_collection.save()
        
        #items_id: List[int] = body["items"]
        #collectionID: int   = body["collectionID"]
        #action:       str   = body["action"]
        # print(" Collection_New = ", body)
        return JsonResponse({ "result": "OK" }, safe = False)        


    def put(self, request: WSGIRequest, *args, **kwargs):
        """ Update existing collections.  """
        assert( request.method == "PUT" and request.is_ajax() )    

        body = json.loads(request.body.decode("utf-8"))
        collection_id = int(body["id"])
        assert( collection_id is not None)
        title         = body["title"]
        # description   = body["description"]

        coll = Collection.objects.get(id = collection_id, owner = request.user)
        coll.title = title 
        # coll.description = description
        coll.save()

        return JsonResponse({ "result": "OK" }, safe = False)        


    def delete(self, request: WSGIRequest, *args, **kwargs):
        assert( request.method == "DELETE" and request.is_ajax() )

        req: WSGIRequest = self.request
        body = json.loads(req.body.decode("utf-8"))        

        coll_id = body["collection_id"]
        
        coll: Collection = Collection.objects.get(id = coll_id, owner = request.user)

        # --- Soft-Delete --------------------//
        coll.delete()
        # coll.deleted = True 
        # coll.save()
        
        print(" Delete collection = ", body)
        return JsonResponse({ "result": "OK" }, safe = False)        


class Ajax_Collection_AddItem(LoginRequiredMixin, django.views.View):
    """ Create new collection """
    def post(self, request: WSGIRequest, *args, **kwargs):
        assert( request.method == "POST" and request.is_ajax() )

        req: WSGIRequest = self.request
        body = json.loads(req.body.decode("utf-8"))        

        coll_id = body["collection_id"]
        url     = body["url"]
        url_: str = dutils.remove_url_obfuscation(url)   
        assert url_ is not None  

        coll: Collection = Collection.objects.get(id = coll_id, owner = request.user)
        exists = False

        item = None 

        try:
            # Check whether URL already exists in the database         
            item  = SiteBookmark.objects.filter(owner = request.user).get(url = url)
            exists = True 
        except SiteBookmark.DoesNotExist:
            pass         
        
        if not exists:
            item = SiteBookmark.objects.create(url = url_, owner = request.user)
            item.save()
            update_item_from_metadata(item.id)        
        
        coll.item.add(item)
        coll.save()
        return JsonResponse({ "result": "OK" }, safe = False)        



class ViewPaginatorMixin(object):
    min_limit = 1
    max_limit = 10

    def paginate(self, object_list, columns, page=1, limit=10, **kwargs):
        try:
            page = int(page)
            if page < 1:
                page = 1
        except (TypeError, ValueError):
            page = 1

        try:
            limit = int(limit)
            if limit < self.min_limit:
                limit = self.min_limit
            if limit > self.max_limit:
                limit = self.max_limit
        except (ValueError, TypeError):
            limit = self.max_limit

        paginator = dj_paginator.Paginator(object_list, limit)
        try:
            objects = paginator.page(page)
        except dj_paginator.PageNotAnInteger:
            objects = paginator.page(1)
        except dj_paginator.EmptyPage:
            objects = paginator.page(paginator.num_pages)
        
        # print(" [INFO] type(objects) = ", type(objects))

        kv_pairs = [ [ (c, getattr(row, c) ) for c in columns] for row in objects]
        results  = list(map(lambda x: dict(x), kv_pairs))        

        data = {
            'prev_page': objects.has_previous() and objects.previous_page_number() or None,
            'next_page': objects.has_next() and objects.next_page_number() or None,
            'data':      results
        }
        
        return data



class Ajax_ItemSearch(LoginRequiredMixin, ViewPaginatorMixin, django.views.View):

    def get(self, request: WSGIRequest, *args, **kwargs):
        search = request.GET.get('query', "")
        print(" [TRACE] search = ", search)

        mode   = request.GET.get('mode', "")
        page   = int(request.GET.get("page", "1"))
        coll_id   = int(request.GET.get("coll"))

        collection = Collection.objects.get(owner = request.user, id = coll_id)

        if not search:
            return Http404("Error: missing search parameter")

        words = shlex.split(search)
        lam = lambda x, y: x & y
        if  mode == "OR":
            lam = lambda x, y: x | y
        if mode == "AND":
            lam = lambda x, y: x & y
        # q = Q(title__contains =   search) | Q(url__contains =  search)       
        q1 = reduce(lam, [ Q(url__contains=w) for w in words])
        q2 = reduce(lam, [ Q(title__contains=w) for w in words])
        
        queryset = SiteBookmark.objects.filter(owner = self.request.user)\
            .filter(q1 | q2)\
            .exclude( deleted = True).order_by("id").reverse()
        
        results = self.paginate(queryset, ["id", "title", "url"], page, 20)
        results["total"] = queryset.count()

        return JsonResponse(results, safe = False)


class Ajax_Tags(LoginRequiredMixin, django.views.View):

    def get(self, request: WSGIRequest, *args, **kwargs):
        query = Tag2.objects.filter(owner = request.user)\
                    .order_by(Lower("name"))
        return queryset2Json(query, ["id", "name", "description"])

    def post(self, request: WSGIRequest, *args, **kwargs):
        """ Create new collection """
        assert( request.method == "POST" and request.is_ajax() )
        req: WSGIRequest = self.request
        body        = json.loads(req.body.decode("utf-8"))        
        name        = body["name"]
        description = body["description"]
        new_tag     = Tag2.objects.create(name = name, description = description, owner = request.user)
        new_tag.save()        
        return JsonResponse({ "result": "OK", "message": f"Created tag: ${new_tag.name} / id = ${new_tag.id} " }, safe = False)        

    def put(self, request: WSGIRequest, *args, **kwargs):    
        from datetime import datetime 
        req: WSGIRequest = self.request
        body    = json.loads(req.body.decode("utf-8"))        
        tag_id  = body.get("tag_id") or ""       
        action  = body["action"]

        if action == "add_item_new_tag":
            item_id = body["item_id"]
            tag_name = body["tag_name"]
            tag: Tag = Tag2.objects.create(name = tag_name, description = "", owner = request.user)
            item: SiteBookmark = SiteBookmark.objects.get(id = item_id, owner = request.user)
            item.updated = datetime.now()
            item.save()
            tag.save()
            tag.item.add(item)
            tag.save()
            #print(" Tag  = " + tag)
            #print(" Item = " + item)
            return JsonResponse({ "result": "OK", "message": "Tag added successfully" }, safe = False)        

        if action == "add_item":
            item_id = body["item_id"]
            tag: Tag = Tag2.objects.get(id = tag_id, owner = request.user)        
            item: SiteBookmark = SiteBookmark.objects.get(id = item_id, owner = request.user)
            item.updated = datetime.now()
            item.save()
            tag.item.add(item)
            tag.save()
            #print(" Tag  = " + tag)
            #print(" Item = " + item)
            return JsonResponse({ "result": "OK", "message": "Tag added successfully" }, safe = False)        

        if action == "remove_tag_item":
            item_id = body["item_id"]
            tag_id  = body["tag_id"]
            tag: Tag = Tag2.objects.get(id = tag_id, owner = request.user)        
            item: SiteBookmark = SiteBookmark.objects.get(id = item_id, owner = request.user)
            item.updated = datetime.now()
            item.save()            
            tag.item.remove(item)
            tag.save()
            return JsonResponse({ "result": "OK", "message": "Item removed from tag. Ok." }, safe = False)       


        if action == "delete_tag" :
            tag_name = body["tag_name"]
            tag: Tag = Tag2.objects.get(name = tag_name, owner = request.user)    
            # Remove all items from many-to-many relationship from this tag 
            for item in tag.item.all():
                tag.item.remove(item)
            tag.delete()            
            return JsonResponse({ "result": "OK", "message": "Tag removed Ok." }, safe = False)       
        
        if action == "update_tag":
            tag_name = body["tag_name"]
            tag_desc = body["tag_desc"]
            tag: Tag = Tag2.objects.get(id = tag_id, owner = request.user)
            tag.name = tag_name 
            tag.description = tag_desc
            tag.save()
            return JsonResponse({ "result": "OK", "message": "Tag updated Ok." }, safe = False)       

        return JsonResponse({ "result": "ERROR", "message": "Action not valid for this case." }, safe = False)        

    def delete(self, request: WSGIRequest, *args, **kwargs):
        return JsonResponse({ "result": "OK" }, safe = False)        



class Ajax_ItemRelated(LoginRequiredMixin, django.views.View):


    def post(self, request: WSGIRequest, *args, **kwargs):
        """ Create new collection """
        assert( request.method == "POST" and request.is_ajax() )
        req: WSGIRequest = self.request
        body        = json.loads(req.body.decode("utf-8"))        
        item_id      = body["item_id"]
        related_ids  = body["related_ids"]

        item    = SiteBookmark.objects.get(id = item_id, owner = request.user)

        for rid in related_ids:
            if rid == item_id: continue 
            related = SiteBookmark.objects.get(id = rid, owner = request.user)
            item.related.add(related)
            related.related.add(item)
            related.save()
        item.save()

        return JsonResponse({ "result": "OK",  "message": "Item added Ok." })
