from django.contrib import admin
from bookmarks.models import SiteBookmark, Tag, SavedSearch

admin.site.register(SiteBookmark)
admin.site.register(Tag)
admin.site.register(SavedSearch)
