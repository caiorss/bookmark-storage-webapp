from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.db.models import Q 

from bookmarks.models import SiteBookmark

# Template files 
tpl_main           = "bookmark_list.html"
tpl_forms          = "bookmark_form.html"
tpl_confirm_delete = "bookmark_confirm_delete.html"

class BookmarkList(ListView):
    template_name = tpl_main
    model = SiteBookmark

    def get_queryset(self):

        view = self.request.GET.get("view")
        
        if view and view == "latest":               
            return self.model.objects.all().order_by("id")

        if view and view == "starred":               
            return self.model.objects.filter(starred = True).order_by("id").reverse()

        domain = self.request.GET.get("domain")            
        if domain:
            d = domain.strip("www.").strip("m.").strip("old.").strip("mobile.")
            return self.model.objects.filter(url__contains = d).order_by("id").reverse()

        tag = self.request.GET.get("tag")
        if tag:
            return self.model.objects.filter(tags__name = tag)

        query2 = self.request.GET.get('search')
        if query2:
            return self.model.objects.filter( Q(name__contains = query2) 
                                            | Q(url__contains = query2) ).order_by("id").reverse()
        
        #print(" [BookmarkList] kwargs = " + str(self.kwargs))
        return self.model.objects.all().order_by("id").reverse()


class BookmarkStarred(ListView):
    template_name = tpl_main
    # model = SiteBookmark

    def get_queryset(self):
        lst = SiteBookmark.objects.filter(starred = True)
        return lst 

class BookmarkCreate(CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['title', 'url', 'starred', 'brief', 'tags']
    success_url = reverse_lazy('bookmarks:bookmark_list')

class BookmarkUpdate(UpdateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['title', 'url', 'starred', 'brief', 'tags']
    success_url = reverse_lazy('bookmarks:bookmark_list')

class BookmarkDelete(DeleteView):
    template_name = tpl_confirm_delete 
    model = SiteBookmark
    success_url = reverse_lazy('bookmarks:bookmark_list')