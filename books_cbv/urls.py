from django.urls import path

from . import views

app_name = 'books_cbv'

urlpatterns = [
  path(''
  , views.BookmarkList.as_view(), name='book_list'),
  
  path('new'
  , views.BookmarkCreate.as_view(), name='book_new'),
  
  path('edit/<int:pk>'
  , views.BookmarkUpdate.as_view(), name='book_edit'),
  
  path('delete/<int:pk>'
  , views.BookmarkDelete.as_view(), name='book_delete'),
]