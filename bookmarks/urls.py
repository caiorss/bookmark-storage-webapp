from django.urls import path

from . import views

app_name = 'bookmarks'

urlpatterns = [
  path(''
  , views.BookmarkList.as_view(), name='bookmark_list'),

  path('starred'
  , views.BookmarkStarred.as_view(), name='bookmark_starred'),
  
  path('new'
  , views.BookmarkCreate.as_view(), name='bookmark_new'),
  
  path('edit/<int:pk>'
  , views.BookmarkUpdate.as_view(), name='bookmark_edit'),
  
  path('delete/<int:pk>'
  , views.BookmarkDelete.as_view(), name='bookmark_delete'),

  # ----------------------------------------------------#

  path('savedsearch_list'
  , views.SavedSearchList.as_view(), name='bookmark_savedsearch_list'),

  path('savedsearch_new'
  , views.SavedSearchCreate.as_view(), name='bookmark_savedsearch_new'),
 

]