from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.db.models import Q 

from bookmarks.models import SiteBookmark, SavedSearch, Collection
import django.core.paginator as pag 

# Template files 
tpl_main           = "bookmark_list.html"
tpl_forms          = "bookmark_form.html"
tpl_confirm_delete = "bookmark_confirm_delete.html"

class BookmarkList(ListView):
    template_name = tpl_main
    model = SiteBookmark
    pagination_size = 20

    def get_queryset(self):
        page = self.request.GET.get("page", 1)        
        items_list = self.process_query()
        return self.paginate(page, items_list)                        

    # Helper method for paginating output 
    # Reference: https://simpleisbetterthancomplex.com/tutorial/2016/08/03/how-to-paginate-with-django.html
    def paginate(self, page, items_list):
        # Show 10 items at a time 
        paginator = pag.Paginator(items_list, self.pagination_size)
        try: 
            items = paginator.page(page)
        except pag.PageNotAnInteger:
            items = paginator.page(1)
        except pag.EmptyPage:
            items = paginator.page(paginator.num_pages)      
        return items   

    def process_query(self):
        view = self.request.GET.get("view")        
        
        if view and view == "removed":
            return self.model.objects.filter(deleted = True).order_by("id").reverse()

        if view and view == "latest":               
            return self.model.objects.exclude(deleted = True).order_by("id")

        if view and view == "starred":               
            return self.model.objects.filter(starred = True).exclude(deleted = True).order_by("id").reverse()

        domain = self.request.GET.get("domain")            
        if domain:
            d = domain.strip("www.").strip("m.").strip("old.").strip("mobile.")
            return self.model.objects.filter(url__contains = d).exclude(deleted = True) .order_by("id").reverse()

        tag = self.request.GET.get("tag")
        if tag:
            return self.model.objects.filter(tags__name = tag)

        query2 = self.request.GET.get('search')
        if query2:
            q = Q(title__contains = query2) | Q(url__contains = query2)       
            return self.model.objects.filter(q).exclude( deleted = True ).order_by("id").reverse()

        return self.model.objects.exclude(deleted = True).order_by("id").reverse()


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

class CollectionCreate(CreateView):
    template_name = tpl_forms
    model = Collection
    fields = ['title', 'description', 'item', 'starred', 'deleted']
    success_url = reverse_lazy('bookmarks:bookmark_savedsearch_list')

