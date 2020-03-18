from django.db import models
from django.urls import reverse

from urllib.parse import urlparse 

class SiteBookmark(models.Model):
    # Max URL size has 3000 bytes
    #url   = models.CharField(max_length=4000)
    url = models.URLField()
    name = models.CharField(max_length= 8000, blank = True, null = True)    
    starred = models.BooleanField(blank = True)
    brief = models.TextField(blank = True, null = True)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('books_cbv:book_edit', kwargs={'pk': self.pk})

    def hostname(self):        
        u = urlparse(self.url)
        return u.hostname

    def isVideo(self):
        hostname = urlparse(self.url).hostname
        return "youtube.com" in hostname 