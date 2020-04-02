from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.db.models import Q 
import django.shortcuts as ds 
import django.core.exceptions

from bookmarks.models import SiteBookmark, SavedSearch, Collection
import django.core.paginator as pag 
from django.core.handlers.wsgi import WSGIRequest
from django.db.models.query import QuerySet
from django.core.paginator import Page
import django.utils.http
from django.contrib.sessions.backends.db import SessionStore
from django.db.models.functions import Lower

import bs4 
import urllib

import typing as ty

# Template files 
tpl_main           = "bookmark_list.html"
tpl_forms          = "bookmark_form.html"
tpl_confirm_delete = "bookmark_confirm_delete.html"


def paginate_queryset(queryset: QuerySet, page: int, size: int, width: int = 10):
    paginator = pag.Paginator(queryset, size)       
    try: 
        items = paginator.page(page)
    except pag.PageNotAnInteger:
        items = paginator.page(1)
    except pag.EmptyPage:
        items = paginator.page(paginator.num_pages)      
    # return items      
    pmin: int = ((page - 1) // width) * width + 1 if page % width == 0 else (page // width) * width + 1

    if page % width != 0:
        k = (page // width + 1) * width + 1
    else:
        k = ((page - 1) // width + 1) * width + 1
    pmax: int =  min( k, paginator.num_pages + 1) 
    # print(" [INFO] page = {page} ; pmin = {pmin} ; pmax = {pmax}".format(page = page, pmin = pmin, pmax = pmax))
    # print(" [INFO] paginator.num_pages = {}".format(paginator.num_pages))
    # print(" [INFO] page_range = {}".format(items.paginator.page_range))
    return items, range(pmin, pmax)


def bookmark_list_process(request: WSGIRequest):
    view = request.GET.get("view")
    model = SiteBookmark        

    if view and view == "latest":               
        return model.objects.exclude(deleted = True).order_by("id")

    if view and view == "starred":
        return model.objects.filter(starred = True).exclude(deleted = True).order_by("id").reverse()    

    if view and view == "removed":
        return model.objects.filter(deleted = True).order_by("id").reverse()    

    # Domain filtering
    domain = request.GET.get("domain")            
    if domain:
        d = domain.strip("www.").strip("m.").strip("old.").strip("mobile.")
        return model.objects.filter(url__contains = d).exclude(deleted = True) .order_by("id").reverse()

    # Collection filtering
    coll = request.GET.get("collection")
    if coll:
        c: Collection = ds.get_object_or_404(Collection, id = coll)    
        return c.item.exclude(deleted = True)

    # Tag filtering
    tag = request.GET.get("tag")
    if tag:
        return self.model.objects.filter(tags__name = tag)

    # Search filtering 
    query2 = request.GET.get('search')
    if query2:
        q = Q(title__contains = query2) | Q(url__contains = query2)       
        return model.objects.filter(q).exclude( deleted = True ).order_by("id").reverse()

    # Default selection 
    return model.objects.exclude(deleted = True).order_by("id").reverse()

def bookmark_list_view(request: WSGIRequest):
    queryset: QuerySet = bookmark_list_process(request)
    #--------- Paginate ------------------------#       
    p:    str = request.GET.get("page")
    page: int = int(p) if p is not None and p.isnumeric() else 1
    items, page_range = paginate_queryset(queryset, page, 10, 5)

    url_state = "view={view}&search={search}&domain={domain}&collection={collection}"\
        .format( view   = request.GET.get("view") or ""
                ,search = django.utils.http.urlquote(request.GET.get("search") or "") #django.utils.http.urlencode(request.GET.get("search") or "", doseq=True)
                ,domain = request.GET.get("domain") or ""
                ,collection = request.GET.get("collection") or ""                
        )
    count: int = queryset.count()
    return ds.render(request, tpl_main, { 'object_list': items
                                        , "page_range": page_range
                                        , 'url_state': url_state
                                        , 'count': count})

# URL route for adding item through bookmarklet 
def bookmark_add_item_bookmarklet(request: WSGIRequest):
    url   = request.GET.get("url")
    title = request.GET.get("title")
    if not title or title == "":
        return django.http.HttpResponseBadRequest("Error: title cannot be empty")
    if not url or url == "":
        return django.http.HttpResponseBadRequest("Error: url cannot be empty")
    
    # Check whether URL is alredy in the database 
    # If that is the case, this function returns an error.     
    try:
        u = SiteBookmark.objects.get(url = url)    
        return django.http.HttpResponseBadRequest("Error: url already exists")        
    except SiteBookmark.DoesNotExist:
        pass

    b: SiteBookmark = SiteBookmark(url = url, title = title)
    b.save()
    update_item_from_metadata(b.id)
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

def update_item_from_metadata(itemID: int):  
    b: SiteBookmark = SiteBookmark.objects.get(id = itemID)
    if b is None:
        return django.http.HttpResponseBadRequest("Error: invalid item ID, item does not exist.")            
    try:
        req = urllib.request.Request(
            b.url, 
            data=None, 
            headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.47 Safari/537.36'
        })
        page = urllib.request.urlopen(req)
        #page = urllib.request.urlopen(b.url)
    except urllib.error.URLError as ex:          
        return django.http.HttpResponseBadRequest("Error: urrlib Exception = {}".format(ex))        

    soup = bs4.BeautifulSoup(page, features = "lxml")

    # title <- soup.find("title").text if soup is not None, otherwise
    # , it is set to "" (empty string)
    title: str = getattr( soup.find("title"), "text", "")
    
    m = soup.find("meta", attrs={'name': 'description'})             
    brief: str = m["content"] if m is not None else ""

    b.title = title 
    b.brief = brief 
    b.save()

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


class BookmarkCreate(CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'deleted', 'tags']
    success_url = "/items" #reverse_lazy('bookmarks:bookmark_list')

class BookmarkUpdate(UpdateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'deleted', 'tags']
    success_url = "/items" #reverse_lazy('bookmarks:bookmark_list')

class BookmarkDelete(DeleteView):
    template_name = tpl_confirm_delete 
    model = SiteBookmark
    success_url = "/items" #reverse_lazy('bookmarks:bookmark_list')


# ------------ Saved Search ------------------------#

class SavedSearchList(ListView):
    template_name = "savedsearch_list.html"
    #model = SavedSearch
    queryset = SavedSearch.objects.order_by(Lower("search"))
    # paginate_by = 4


class SavedSearchCreate(CreateView):
    template_name = tpl_forms
    model = SavedSearch 
    fields = ['search', 'description']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

class SavedSearchUpdate(UpdateView):
    template_name = tpl_forms
    model = SavedSearch 
    fields = ['search', 'description']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

#------------ Collection Listing -------------------#

class CollectionList(ListView):
    template_name = "collection_list.html"
    model = Collection
    # queryset = Collection.objects.order_by("title")

class CollectionCreate(CreateView):
    template_name = tpl_forms
    model = Collection
    fields = ['title', 'description', 'item', 'starred', 'deleted']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

