from django.db import models
from django.urls import reverse
from urllib.parse import urlparse 
import datetime
import uuid
from django.http import Http404
import django.conf
import django.shortcuts as ds 
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager 

import bookmarks.dutils as utils 
from   bookmarks.dutils import DownloadedFile
import os 
import enum 
from typing import Optional


class CustomAccountManager(BaseUserManager):
    
    def create_user(self, email, username, password):
        if not email: raise ValueError("Users must have an email address")

        if not username: raise ValueError("Users must have an username")

        user = self.model( 
                           email    = self.normalize_email(email)
                         , username = username
                         )
        user.set_password(password)
        # user.set_password(password)
        user.save(using = self._db)
        return user

    def create_superuser(self, email, username, password):
        user = self.create_user(
                          email    = self.normalize_email(email)
                        , username = username
                        , password = password
                        )
        #user.set_password(password)
        #user.save(user = self._db)
        user.is_admin = True 
        user.is_staff = True 
        user.is_superuser = True 
        user.save(using = self._db)
        return user 

class Account(AbstractBaseUser): 
    # [Optional] Use UUID instead of integer as primary field 
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, auto_created = True)
    email        = models.EmailField(verbose_name= "email", max_length=255, unique = True)
    username     = models.CharField(max_length=30, unique = True)
    date_joined  = models.DateTimeField(verbose_name = "Date Joined", auto_now_add = True)
    last_login   = models.DateTimeField(verbose_name = "Last Login", auto_now = True)
    is_active    = models.BooleanField(default = True)
    is_staff     = models.BooleanField(default = False)
    is_admin     = models.BooleanField(default = False)    
    is_superuser = models.BooleanField(default = False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', ]

    object = CustomAccountManager()

    def __str__(self):
        # String representation 
        return "username = {username} ; email = {email} ; id = {id}"\
            .format(username = self.username, email = self.email, id = self.id)

    def has_perm(self, perm, obj = None): 
        return self.is_admin

    def has_module_perms(self, app_Label): 
        return True


class Tag(models.Model):
    name        = models.CharField(max_length=300, unique = True, help_text="Tag title or name")
    description = models.CharField(max_length = 5000, null = True, blank=True, help_text = "Tag description")
    starred = models.BooleanField(blank = True, default = False, help_text = "Check this box to mark this bookmark as favourite")
    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True)

    def __str__(self):
        return self.name 

class SavedSearch(models.Model):
    search = models.CharField(max_length=5000, help_text="")
    description = models.CharField(max_length = 5000, null = True, blank=True, help_text = "Tag description")
    deleted = models.BooleanField(blank = True, default = False, null = True, editable = True)
    
    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True)

    # User to which the collection belongs to
    owner = models.ForeignKey(Account, null = True, blank = True, editable = True, on_delete=models.PROTECT)

    def __str__(self):
        return self.search  

class DocumentType(models.TextChoices):
    webpage         = "webpage"
    document        = "document"
    # Online forums or communities 
    community       = "community"
    # Social media accounts that are followed. 
    follow          = "follow"
    # News outlets - magazines, newspapers, twitter accounts of news autlets
    news            = "news"
    # Inspirational reading
    inspirational   = "inspirational"
    # Course notes - lectures notes
    course          = "course"
    paper           = "paper"
    report          = "report"
    article         = "article"
    book            = "book"
    thesis          = "thesis"
    patent          = "patent"
    presentation    = "presentation"
    # Reference card, cheat sheet
    referece_card   = "reference card"        
    # Technical standard such as RFCs, ISO, DIN, ... 
    standard        = "standard"
    law             = "law"
    source_code     = "source code"
    manual          = "manual"
    documentation   = "documentation"
    search_engine   = "search engine"
    # Ecommerce websites, online stores such as Amazon, BestBuy, Alibaba, AliExpress,  ...
    online_store    = "online store"
    # Software tools
    developer_tool   = "developer_tool"
    # Online tool 
    online_tool     = "online_tool"
    music           = "music"
    video           = "video"
    youtube_channel = "youtube channel"    

class SiteBookmark(models.Model):
    # Max URL size has 3000 bytes
    #url   = models.CharField(max_length=4000)
    url     = models.CharField( #unique = True,
                                 verbose_name="Web site URL"
                                ,help_text = "Enter bookmark URL (Required)", max_length=8000)
    title    = models.CharField(max_length= 8000, blank = True, null = True, help_text = "Enter the web site title")
    starred = models.BooleanField(  blank = True, default = False
                                  , help_text = "Check this box to mark this bookmark as favourite")
    brief   = models.TextField(blank = True, null = True, help_text="Short web site description")
    tags    = models.ManyToManyField(Tag, blank = True)
    doctype = models.CharField(max_length=80, choices = DocumentType.choices, default = DocumentType.webpage
                             , verbose_name = "Type")
    deleted = models.BooleanField(blank = True, default = False, null = True, editable = True)

    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True, null = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True, null = True)

    # User to which the collection belongs to
    owner = models.ForeignKey(Account, editable = True, on_delete=models.PROTECT)

    # Override deleted behavior, mark field delete to True instead of elininate
    # this database row. See: https://stackoverflow.com/questions/52767988
    def delete(self):
        self.deleted = True 
        self.starred = False 
        self.save()

    def __str__(self):
        return f""" 
           id = {self.id}     
        / title = '{self.title}' 
        ; url   = '{self.url}'
        """
        #return "title = {title} ; url = {url}".format(title = self.title, url = self.url)

    def get_absolute_url(self):
        return reverse('bookmarks:book_edit', kwargs={'pk': self.pk})

    def hostname(self):        
        u = urlparse(self.url)
        return u.hostname

    def is_youtube_video(self):
        return self.url.startswith("https://www.youtube.com/watch?v=") \
            or self.url.startswith("https://m.youtube.com/watch?v=") 

    """ Returns Youtube ID if Hyperlink is a video."""
    def youtube_id(self):
        return self.url.strip("https://www.youtube.com/watch?v=").strip("https://m.youtube.com/watch?v=")

    
    def isDocumentFile(self):
        doclist = ['.pdf', '.docx', 'doc', '.ppt', '.pptx', '.ps', ".odp", ".odx"]
        return any(map(lambda x: self.url.endswith(x), doclist))    

    def modifiedURL(self):
        if self.isDocumentFile():
            # print(" [TRACE] File is PDF url = {url} ".format(url = self.url))
            return "https://docs.google.com/viewer?url=" + self.url
        return self.url

    def modified_title(self):
        return (self.title or self.url).split(";")[0]

    def keywords(self):
        return "; ".join((self.title or "").split(";")[1:])

    def snapshot_exists(self):
        #return self.itemsnapshot_set.exists()
        return self.filesnapshot_set.exists()

    def snapshot_file(self):
        # print(" =>>> Here ")
        sn: ManyRelatedManager = self.filesnapshot_set.first()        
        if sn is not None: 
            s = str(sn.id) + "/" + sn.fileName
            # print(" snapshot = " + s)
            return  s 
        return None 

class Collection(models.Model):
    title       = models.CharField(max_length= 8000, blank = True, null = True, help_text = "Collection title")
    description = models.TextField(blank = True)
    item        = models.ManyToManyField(SiteBookmark, blank = True, related_name = "link_to_items")

    starred = models.BooleanField(blank = True, default = False, help_text = "Mark this collection as favourite")
    deleted = models.BooleanField(blank = True, default = False, null = True, editable = True)
    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True, null = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True, null = True)

    # User to which the collection belongs to 
    owner = models.ForeignKey(Account, null = True, blank = True, editable = True, on_delete=models.PROTECT)
    
    def __str__(self):
        return " title = {title} ".format(title = self.title)

    def delete(self):
        self.deleted = True 
        self.starred = False 
        self.save()

class FileSnapshot(models.Model):
    """Store file related to the URL in the database."""
    # UUID 
    id = models.UUIDField(primary_key  = True
                        , editable     = False
                        , auto_created = True
                        , default      = uuid.uuid4)

    # Set field only when instance is created
    created = models.DateField(editable = False, auto_now_add = True, null = True)
    # Set field only when instance is changed
    updated = models.DateField(editable = False, auto_now = True, null = True)

    item = models.ManyToManyField(SiteBookmark)
    # File name 
    fileName = models.CharField(max_length=5000)
    # File hash = > Contains crypto-hash signature MD5SUM 
    fileHash = models.CharField(max_length=100, unique = True)
    # Contains file media type 
    fileMimeType = models.CharField(max_length=100)

    @staticmethod
    def createSnapshot(bookmarkID: int, url: str):
        item: SiteBookmark = ds.get_object_or_404(SiteBookmark, id = bookmarkID)
        if not item: raise Http404("Item not found")
        
        df: DownloadedFile = utils.download_file(url)
        media_dir: str     = django.conf.settings.MEDIA_ROOT 

        # Create entry in database 
        sn = FileSnapshot( fileName = df.fileName
                            ,fileHash = df.fileHash
                            ,fileMimeType = df.fileMimeType )
        sn.save()
        sn.item.add(item)
        sn.save()
        # Create associated file at path: 
        #  ${MEDIA_ROOT}/<FILE UUID>/<FILE_NAME>
        file_dir = os.path.join(media_dir, str(sn.id))
        file_path = os.path.join(file_dir, df.fileName)
        os.mkdir(file_dir)
        # Create snapshot file 
        with open(file_path, 'wb') as f:
            f.write(df.fileData)
    
    def getFilePath(self):
        media_dir: str = django.conf.settings.MEDIA_ROOT 
        return os.path.join(media_dir, str(self.id), self.fileName)
    
    def readFile(self):
        file_path = self.getFilePath()
        with open(file_path, mode = 'rb') as fd:
            return fd.read()

    def __str__(self):
        return " file = {file} ; id = {id} ; hash = {h} ".format(
                file = self.fileName
                , id = self.id
                , h = self.fileHash )
