from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy

from books_cbv.models import SiteBookmark

tpl_forms = "books_cbv/form.html"

class BookList(ListView):
    template_name = "books_cbv/book_list.html"
    model = SiteBookmark

class BookCreate(CreateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['name', 'url', 'pages']
    success_url = reverse_lazy('books_cbv:book_list')

class BookUpdate(UpdateView):
    template_name = tpl_forms
    model = SiteBookmark
    fields = ['name', 'url', 'pages']
    success_url = reverse_lazy('books_cbv:book_list')

class BookDelete(DeleteView):
    template_name = "books_cbv/book_confirm_delete.html"
    model = SiteBookmark
    success_url = reverse_lazy('books_cbv:book_list')