from django.contrib import admin
from bookmarks.models import SiteBookmark, Tag

admin.site.register(SiteBookmark)
admin.site.register(Tag)
