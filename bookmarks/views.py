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
    queryset = bookmark_list_process(request)
    #--------- Paginate ------------------------#       
    p:    str = request.GET.get("page")
    page: int = int(p) if p is not None and p.isnumeric() else 1
    items, page_range = paginate_queryset(queryset, page, 20, 5)
    return ds.render(request, tpl_main, {'object_list': items, "page_range": page_range })

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

    b = SiteBookmark(url = url, title = title)
    b.save()
    return ds.redirect("/items")    

class BookmarkStarred(ListView):
    template_name = tpl_main
    # model = SiteBookmark

    def get_queryset(self):
        lst = SiteBookmark.objects.filter(starred = True)
        return lst 

class BookmarkCreate(CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'deleted', 'tags']
    success_url = reverse_lazy('bookmarks:bookmark_list')

class BookmarkUpdate(UpdateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['url', 'title', 'starred', 'brief', 'deleted', 'tags']
    success_url = reverse_lazy('bookmarks:bookmark_list')

class BookmarkDelete(DeleteView):
    template_name = tpl_confirm_delete 
    model = SiteBookmark
    success_url = reverse_lazy('bookmarks:bookmark_list')


# ------------ Saved Search ------------------------#

class SavedSearchList(ListView):
    template_name = "savedsearch_list.html"
    model = SavedSearch

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

class CollectionCreate(CreateView):
    template_name = tpl_forms
    model = Collection
    fields = ['title', 'description', 'item', 'starred', 'deleted']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

