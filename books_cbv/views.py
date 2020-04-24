from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy

from books_cbv.models import Book

tpl_forms = "books_cbv/form.html"

class BookList(ListView):
    model = Book

class BookCreate(CreateView):
    template_name = tpl_forms
    model = Book
    fields = ['name', 'pages']
    success_url = reverse_lazy('books_cbv:book_list')

class BookUpdate(UpdateView):
    template_name = tpl_forms
    model = Book
    fields = ['name', 'pages']
    success_url = reverse_lazy('books_cbv:book_list')

class BookDelete(DeleteView):
    model = Book
    success_url = reverse_lazy('books_cbv:book_list')