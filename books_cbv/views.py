from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy

from books_cbv.models import SiteBookmark

tpl_forms = "books_cbv/form.html"

class BookmarkList(ListView):
    template_name = "books_cbv/book_list.html"
    model = SiteBookmark

class BookmarkCreate(CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['name', 'url', 'starred', 'brief']
    success_url = reverse_lazy('books_cbv:book_list')

class BookmarkUpdate(UpdateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['name', 'url', 'starred', 'brief']
    success_url = reverse_lazy('books_cbv:book_list')

class BookmarkDelete(DeleteView):
    template_name = "books_cbv/book_confirm_delete.html"
    model = SiteBookmark
    success_url = reverse_lazy('books_cbv:book_list')