from django.urls import path, include
import django.views.generic.base as dvgb

from . import views

from . import rest_views 

app_name = 'bookmarks'

urlpatterns = [
  # Redirect straight to template 
  # see: https://stackoverflow.com/questions/3402708/
   path('', dvgb.TemplateView.as_view(template_name = 'index.html'), name = 'home')

  ,path('accounts/signup', views.signup, name='signup')

  ,path('items', views.BookmarksList.as_view(), name = "bookmark_list")

  ,path('items/new', views.BookmarkCreate.as_view(), name='bookmark_new')
  ,path('items/edit/<int:pk>', views.BookmarkUpdate.as_view(), name='bookmark_edit')  
  ,path('items/delete/<int:pk>', views.BookmarkDelete.as_view(), name='bookmark_delete')

  # Bookmarklet URL route for making easier to add new items 
  # through bookmarklet Javascript 
  ,path("items/add", views.bookmark_add_item_bookmarklet)

  ,path("items/extract_metadata", views.extract_metadata)
  ,path("items/view/<int:itemID>", views.document_viewer)

  #,path("snapshot/get", views.fetch_itemsnapshot)
  
  ,path("snapshot/file/<fileID>/<fileName>", views.get_snapshot_file)
  ,path("pdf2html/<fileUUID>/<fileName>", views.pdf2hml)
  ,path("thumbnail/<fileUUID>", views.document_thumbnail)

  ,path('options/video_toggle', views.video_toggle, name='options_video_toggle')
  # ----------------------------------------------------#

  ,path('search/list', views.SavedSearchList.as_view(), name='bookmark_savedsearch_list')
  ,path('search/new', views.SavedSearchCreate.as_view(), name='bookmark_savedsearch_new')
 
  ,path('tags', views.TagList.as_view())
  #----------------------------------------------------#

  ,path('collection/list', views.CollectionList.as_view(), name='bookmark_collection_list')
  ,path('collection/new',  views.CollectionCreate.as_view(), name = 'bookmark_collection_new')

  # ----------------- REST API ------------------------#
  ,path("api/items",                views.Ajax_Items.as_view())  
  ,path("api/item_upload",          views.item_upload)

  ,path("api/item",                 views.rest_item)  
  ,path("api/bulk",                 views.rest_bulk_action)  
  ,path("api/related",              views.Ajax_ItemRelated.as_view())  
  #,path("api/collections",     views.Ajax_Collection_List.as_view())  
  ,path("api/collections",          views.Ajax_Collections.as_view())  
  ,path("api/collections/items",    views.Ajax_Collection_List.as_view())  

  ,path("api/collections/add_item", views.Ajax_Collection_AddItem.as_view())  
  ,path("api/search",               views.Ajax_ItemSearch.as_view())
  ,path("api/tags",                 views.Ajax_Tags.as_view()) 

   # ======= Django-Rest Framework ============================#
    # Authentication endpoint 
#  , path('api2/login',           include('rest_auth.urls')              )
  , path('api2/items',           rest_views.RestItems.as_view()         )
  , path('api2/items/<int:pk>',  rest_views.RestItemsDetail.as_view()  )
  , path('api2/tags',            rest_views.RestTags.as_view()          )
  , path('api2/tags/<int:pk>',   rest_views.RestTagsDetail.as_view()   )

]