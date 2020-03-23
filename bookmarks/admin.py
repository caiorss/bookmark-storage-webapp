from django.contrib import admin
import bookmarks.models as bm 

class CollectionAdmin(admin.ModelAdmin):
    model = bm.Collection
    filter_horizontal = ('item', )

admin.site.register(bm.SiteBookmark)
admin.site.register(bm.Tag)
admin.site.register(bm.SavedSearch)
admin.site.register(bm.Collection, CollectionAdmin)

