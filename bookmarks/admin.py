from django.contrib import admin
import bookmarks.models as bm 

class SiteBookmarkAdmin(admin.ModelAdmin):
    model = bm.SiteBookmark
    filter_horizontal = ('tag2', )

class CollectionAdmin(admin.ModelAdmin):
    model = bm.Collection
    filter_horizontal = ('item', )

admin.site.register(bm.Account)

admin.site.register(bm.SiteBookmark, SiteBookmarkAdmin)
admin.site.register(bm.Tag2)
admin.site.register(bm.SavedSearch)
admin.site.register(bm.Collection, CollectionAdmin)
admin.site.register(bm.FileSnapshot)
