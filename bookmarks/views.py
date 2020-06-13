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
    , FileSnapshot

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


import bs4 
import urllib
import shlex 

import typing as ty
from functools import reduce 

import PyPDF2
import io 

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

class BookmarksList(LoginRequiredMixin, ListView):

    # --- overriden variables --------
    model         = SiteBookmark
    template_name = tpl_main
    paginate_by  = 15
    context_object_name = "object_list"
    
    filter_dispatch = {}    
    empty_query = model.objects.none()

    def __init__(self):
        super(BookmarksList, self).__init__()
        self.start()

        # ---------- Set callbacks ------------#   
    def start(self):
        self.add_filter("latest",  self.filter_latest)
        self.add_filter("oldest",  self.filter_oldest)
        self.add_filter("starred", self.filter_starred)
        self.add_filter("removed", self.filter_removed)
        self.add_filter("doctype",  self.filter_doctype)
        self.add_filter("search",  self.filter_search)
        self.add_filter("domain", self.filter_domain)
        self.add_filter("collection", self.filter_collection)
        return self 

    def add_filter(self, view: str, callback):
        self.filter_dispatch[view] = callback            

    # Determines the query 
    def get_queryset(self):
        filter_: str = self.request.GET.get("filter", "")                
        if filter_ in self.filter_dispatch.keys():            
            return self.filter_dispatch[filter_]()                        
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
                    ,query  = self.request.GET.get("query")   or ""
                    ,mode   = self.request.GET.get("mode") or ""
                    )        
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
        return self.model.objects.exclude(deleted = True)\
            .filter(owner = self.request.user).order_by("id")

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
        return c.item.all()

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
    # sn: ItemSnapshot = ds.get_object_or_404(ItemSnapshot, id = fileID)
    sn: FileSnapshot = ds.get_object_or_404(FileSnapshot, id = fileID)
    try:
        return FileResponse(open(sn.getFilePath(), 'rb'), content_type=sn.fileMimeType)
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
    fields = ['url', 'title', 'starred', 'brief', 'doctype', 'deleted', 'tags']
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
    model = Collection
    # queryset = Collection.objects.order_by("title")

class CollectionCreate(LoginRequiredMixin, CreateView):
    template_name = tpl_forms
    model = Collection
    fields = ['title', 'description', 'item', 'starred', 'deleted']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

