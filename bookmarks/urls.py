from django.urls import path
import django.views.generic.base as dvgb

from . import views

app_name = 'bookmarks'

urlpatterns = [

  # Redirect straight to template 
  # see: https://stackoverflow.com/questions/3402708/
   path('', dvgb.TemplateView.as_view(template_name = 'index.html'), name = 'home')
  
  ,path('items_old', views.BookmarkList.as_view(), name='bookmark_list')
  ,path('items', views.bookmark_list_view, name='bookmark_list')
  
  ,path('items/starred', views.BookmarkStarred.as_view(), name='bookmark_starred') 
  ,path('items/new', views.BookmarkCreate.as_view(), name='bookmark_new')
  ,path('items/edit/<int:pk>', views.BookmarkUpdate.as_view(), name='bookmark_edit')  
  ,path('items/delete/<int:pk>', views.BookmarkDelete.as_view(), name='bookmark_delete')

  # ----------------------------------------------------#

  ,path('search/list', views.SavedSearchList.as_view(), name='bookmark_savedsearch_list')
  ,path('search/new', views.SavedSearchCreate.as_view(), name='bookmark_savedsearch_new')
 
  #----------------------------------------------------#

  ,path('collection/list', views.CollectionList.as_view(), name='bookmark_collection_list')
  ,path('collection/new',  views.CollectionCreate.as_view(), name = 'bookmark_collection_new')

]