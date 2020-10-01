import typing
from typing import Dict, List, NamedTuple

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

#from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
import django.core.paginator as dj_paginator 

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
    return ds.render(request, 'registration.html', {'form': form})


class BookMarkFilter(NamedTuple):
    view:     str 
    title:    str
    callback: typing.Any 

class BookmarksList(LoginRequiredMixin, ListView):

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
        self.add_filter("latest",     "Listing items by newest added",   self.filter_latest)
        self.add_filter("oldest",     "Listing items by oldest added",   self.filter_oldest)
        self.add_filter("starred",    "Starred items",                   self.filter_starred)
        self.add_filter("removed",    "Removed items",                   self.filter_removed)
        self.add_filter("doctype",    "Items fitered by type",           self.filter_doctype)
        self.add_filter("search",     "Search results",                  self.filter_search)
        self.add_filter("domain",     "Items filtered by domain",        self.filter_domain)
        self.add_filter("collection", "Collection items",                self.filter_collection)
        self.add_filter("tag-name",   "Filter tag by name",              self.filter_by_tag_name)
        return self 

    def add_filter(self, view: str, title: str, callback):
        self.filter_dispatch[view] = BookMarkFilter(view = view, title = title, callback = callback)

    # Determines the query 
    def get_queryset(self):
        filter_: str = self.request.GET.get("filter", "")                
        if filter_ in self.filter_dispatch.keys():            
            return self.filter_dispatch[filter_].callback()                     
        return self.filter_latest()

    # Return context data dictionary to the rendered template 
    def get_context_data(self, **kwargs):
        context = super(BookmarksList, self).get_context_data(**kwargs)
        assert context is not None 
        print(f" Trace = { self.context_object_name }")
        query: QuerySet = context[self.context_object_name]
        assert query is not None 
       
        url_state = "filter={filter}&A0={A0}&mode={mode}&query={query}"\
            .format( filter = self.request.GET.get("filter") or ""
                    ,A0     = self.request.GET.get("A0")   or ""
                    ,query  = urllib.parse.quote(self.request.GET.get("query") or "")
                    ,mode   = self.request.GET.get("mode") or ""
                    )   
        print(f" [TRACE] get_context_data() =>> url_state = {url_state}") 
        
        view = self.request.GET.get("filter") or "null"
        print(f" [TRACE] get_context_data() =>> view = {view}")

        title = (self.filter_dispatch.get(view) or self.null_view).title 
        
        if view == "doctype":
            title = title + ": " + (self.request.GET.get("A0") or "")

        if view == "collection":
            coll_id = self.request.GET.get("A0")
            coll = Collection.objects.get(id = coll_id, owner = self.request.user)
            title = title + " : " + coll.title 

        context["page_title"] = title 

        context['count'] = self.get_queryset().count()
        context["url_state"] = url_state
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

    def filter_latest(self):
        user: AbstractBaseUser = self.request.user         
        if user.is_anonymous:
            return self.model.objects.exclude(deleted = True)\
                       .order_by("id").reverse()

        return self.model.objects.exclude(deleted = True)\
                   .filter(owner = self.request.user).order_by("id").reverse()

    def filter_oldest(self):
        return self.model.objects.filter(owner = self.request.user, deleted = False).order_by("id")

    # Select only user marked (starred, favourite) bookmarks
    def filter_starred(self):
        return self.model.objects.filter(starred = True).exclude(deleted = True)\
            .filter(owner = self.request.user).order_by("id").reverse()    
    
    def filter_removed(self):        
        return self.model.objects.filter(deleted = True)\
            .filter(owner = self.request.user).order_by("id").reverse()    

    # Url example: /items?filter=domain&A0=www.reddit.com
    def filter_domain(self):
        # Argument zer0 
        A0: str = self.request.GET.get("A0")            
        if not A0: return self.empty_query
        d = A0.strip("www.").strip("m.").strip("old.").strip("mobile.")
        return self.model.objects.filter(url__contains = d)\
                   .exclude(deleted = True).filter(owner = self.request.user)\
                   .order_by("id").reverse()

    # Url example: /items?filter=tag-name&A0=tag1,tag2,...,tagn
    def filter_by_tag_name(self):
        A0: str = self.request.GET.get("A0")            
        if not A0: return self.empty_query
        tag: Tag2 = Tag2.objects.get(name = A0, owner = self.request.user)
        return tag.item.filter(deleted = False)        

    # Url example: /items?filter=doctype&A0=thesis
    def filter_doctype(self):
        # Argument zer0 
        A0: str = self.request.GET.get("A0")            
        if not A0: return self.empty_query
        return self.model.objects.filter(doctype = A0)\
                   .exclude(deleted = True)\
                   .filter(owner = self.request.user).order_by("id").reverse()

    def filter_collection(self):
        coll_id: int = self.query_param_as_int("A0")
        c: Collection = ds.get_object_or_404(Collection, id = coll_id)
        return c.item.all().order_by("id").reverse() 
        #.order_by("link_to_items").reverse()

    def filter_search(self):
        search = self.request.GET.get('query')
        mode   = self.request.GET.get('mode', "")
        if not search:
            return self.filter_latest()        
        words = shlex.split(search)
        lam = lambda x, y: x | y
        if  mode == "OR":
            lam = lambda x, y: x | y
        if mode == "AND":
            lam = lambda x, y: x & y
        # q = Q(title__contains =   search) | Q(url__contains =  search)       
        q1 = reduce(lam, [ Q(url__contains=w) for w in words])
        q2 = reduce(lam, [ Q(title__contains=w) for w in words])
        return self.model.objects.filter(owner = self.request.user)\
            .filter(q1 | q2).exclude( deleted = True ).order_by("id").reverse()


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
    print(f" [TRACE] real_url = { real_url }")    

    if b is None:
        return django.http.HttpResponseBadRequest("Error: invalid item ID, item does not exist.")            
    try:
        req = urllib.request.Request(
              real_url
            , data=None
            , headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36'
        })
        page = urllib.request.urlopen(req, timeout = 4)
        #page = urllib.request.urlopen(b.url)
    except (urllib.error.URLError, socket.timeout) as ex:          
        return django.http.HttpResponseBadRequest("Error: Exception = {}".format(ex))        
    
    info = page.info()

    if "pdf" in info.get_content_type():
        data = page.read() 
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

    if not ("pdf" in info.get_content_type()):
        soup = bs4.BeautifulSoup(page, features = "lxml")

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

        b.url   = real_url
        b.title = title 
        b.brief = brief 
        b.save()
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
    """ Download file snaphot from bookmark URL and insert it in the database as a blob. """
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
    """Download bookmark's file snapshot (attachment) from the database. """
    from django.utils.text import slugify

    # sn: ItemSnapshot = ds.get_object_or_404(ItemSnapshot, id = fileID)
    print(" [TRACE] get_snapshot_file() ")
    sn: FileSnapshot = ds.get_object_or_404(FileSnapshot, id = fileID)

    title = urllib.parse.quote(request.GET.get("title") or "archive")
    try:
        with open(sn.getFilePath(), 'rb') as fp:
            res       = HttpResponse(fp, content_type = sn.fileMimeType)
            extension = os.path.splitext(sn.getFilePath())[1]
            fname     = slugify(request.GET.get("title"))
            res["Content-Disposition"] = f"inline; filename = {fname}.{extension}"
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

    item = SiteBookmark.objects.create(url = url_, owner = user)
    item.save()
    update_item_from_metadata(item.id)
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



class BookmarkCreate(LoginRequiredMixin, CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'doctype', 'deleted', 'tags']
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
    fields = ['url', 'title', 'starred', 'brief', 'doctype' ]
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


class Ajax_Items(LoginRequiredMixin, django.views.View):

    def get(self, request: WSGIRequest, *args, **kwargs):
        pass 
    
    def post(self, request: WSGIRequest, *args, **kwargs):
        """Create new bookmark entry in the database."""
        body_unicode = request.body.decode("utf-8")
        body         = json.loads(body_unicode)
        url:  str    = body["url"]
        url_: str    = dutils.remove_url_obfuscation(url)            
        assert url_ is not None 
        # Current logged user 
        user: AbstractBaseUser = request.user
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

    def delete(self, request: WSGIRequest, *args, **kwargs):
        body_unicode  = request.body.decode("utf-8")
        body          = json.loads(body_unicode)
        item_id:  str = body["id"]  
        mode:   str = body["mode"]      
        item = SiteBookmark.objects.get(id = item_id, owner = request.user)
        if mode == "soft": item.delete() 
        if mode == "hard": item.hard_delete()
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
        item = SiteBookmark.objects.get(id = item_id, owner  = request.user, deleted = False)
        
        if action == "rename":
            title: str = body["title"]
            item.title = title
        
        if action == "starred":
            value: bool = body["value"]
            item.starred = value 

        if action == "snapshot":            
            return self.download_file_snapshot(request, item_id)
            
        item.save()
        return JsonResponse({ "result": "OK" }, safe = False)

    
    def download_file_snapshot(self, request: WSGIRequest, item_id):
        """Download file snapshot from URL to the file repository."""

        try:
            item = SiteBookmark.objects.get(id = item_id, owner = request.user)
        except SiteBookmark.DoesNotExist: 
            return JsonResponse({ 'result': 'ERROR', 'message': "Item does not exist"})

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
        query = Tag2.objects.filter(owner = request.user)
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
        req: WSGIRequest = self.request
        body    = json.loads(req.body.decode("utf-8"))        
        tag_id  = body.get("tag_id") or ""       
        action  = body["action"]

        if action == "add_item_new_tag":
            item_id = body["item_id"]
            tag_name = body["tag_name"]
            tag: Tag = Tag2.objects.create(name = tag_name, description = "", owner = request.user)
            item: SiteBookmark = SiteBookmark.objects.get(id = item_id, owner = request.user)
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
            tag.item.add(item)
            tag.save()
            #print(" Tag  = " + tag)
            #print(" Item = " + item)
            return JsonResponse({ "result": "OK", "message": "Tag added successfully" }, safe = False)        
        
        return JsonResponse({ "result": "ERROR", "message": "Action not valid for this case." }, safe = False)        

    def delete(self, request: WSGIRequest, *args, **kwargs):
        return JsonResponse({ "result": "OK" }, safe = False)        
