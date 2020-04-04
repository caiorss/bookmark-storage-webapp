from django.conf import settings 

print(" [TRACE] Loaded Bookmarks module OK.")
print(" [TRACE] MEDIA_ROOT = {}  => Path were objects, files are stored"\
    .format(settings.MEDIA_ROOT))
