from django.db import models
from django.urls import reverse
from urllib.parse import urlparse 
import datetime

class Tag(models.Model):
    name        = models.CharField(max_length=300, unique = True, help_text="Tag title or name")
    description = models.CharField(max_length = 5000, null = True, help_text = "Tag description")
    starred = models.BooleanField(blank = True, default = False, help_text = "Check this box to mark this bookmark as favourite")
    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True)

    def __str__(self):
        return self.name 

class SiteBookmark(models.Model):
    # Max URL size has 3000 bytes
    #url   = models.CharField(max_length=4000)
    url     = models.URLField( #unique = True,
        help_text = "Enter bookmark URL (Required)")
    title    = models.CharField(max_length= 8000, blank = True, null = True, help_text = "Enter web site title")
    starred = models.BooleanField(blank = True, default = False, help_text = "Check this box to mark this bookmark as favourite")
    brief   = models.TextField(blank = True, null = True, help_text="Short web site description")
    tags    = models.ManyToManyField(Tag, blank = True)

    deleted = models.BooleanField(blank = True, default = False, null = True, editable = False)

    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True, null = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True, null = True)


    def __str__(self):
        return "title = {title} ; url = {url}".format(title = self.title, url = self.url)

    def get_absolute_url(self):
        return reverse('bookmarks:book_edit', kwargs={'pk': self.pk})

    def hostname(self):        
        u = urlparse(self.url)
        return u.hostname

    def isVideo(self):
        hostname = urlparse(self.url).hostname
        return "youtube.com" in hostname 