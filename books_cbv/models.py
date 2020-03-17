from django.db import models
from django.urls import reverse


class SiteBookmark(models.Model):
    name = models.CharField(max_length= 8000)    
    pages = models.IntegerField()
    # Max URL size has 3000 bytes
    url   = models.CharField(max_length=3000)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('books_cbv:book_edit', kwargs={'pk': self.pk})