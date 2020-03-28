from django.urls import include, path
from django.contrib import admin
from django.urls import path, include # new


# from theme import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    #path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')), 

    # Home or http:<site_addr>/
    path('', include('bookmarks.urls', namespace='bookmarks')),
]
