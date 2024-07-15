import rest_framework as rest
import rest_framework.generics       as rf_gen 
import rest_framework.status         as rf_status 
import rest_framework.authentication as rf_auth 
import rest_framework.views          as rf_views 
import rest_framework.response       as rf_resp 
import rest_framework.permissions    as rf_perm
import rest_framework.pagination     as rf_pag 

from django.db.models.functions import Lower
# from django.core.paginator import Paginator 

from bookmarks import models 
from bookmarks import dutils
import bookmarks.views

import logging

# Http custom status code for indicating API domain-specific errors. 
STATUS_CODE_DOMAIN_ERROR = 599


    # =========================================#
    #  S E R I A L I Z E R S                   # 
    #==========================================#

class SerializerTags(rest.serializers.ModelSerializer):
    """DRF framework serializer for Tags2 model class."""

    class Meta:
        model = models.Tag2
        fields = ( 'id', 'name', 'description', 'starred', 'created', 'updated'
                  # , 'item'
                 ) 
        extra_kwargs = { 'item': { 'required': False } }

class SerializerSiteBookmark(rest.serializers.ModelSerializer):
    """ Serializer for model class SiteBookmark."""

    tags = SerializerTags(source = "tag2_set", many = True, read_only=True)

    class Meta:
        model = models.SiteBookmark
        fields = ( 'id', 'url', 'title', 'deleted', 'starred'
                   , 'brief',  'created', 'updated'
                   , 'tags'
                   )
    # Override this method from super class for intercepting the Json 
    # representation =>> See: https://stackoverflow.com/questions/63065639/ 
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # print(" [TYPE] Instance = ", type(rep), " - Type type(instance) = ", type(instance))
        # print(" [TRACE] to_representation() => rep = ", rep)
        return rep 

    # =========================================#
    #  R E S T - A P I - E N D P O I N T S     #
    #==========================================#

class RestItems(rf_gen.ListCreateAPIView):
    """Rest API view for class SiteBookmark => endpoint /api2/items.""" 

    serializer_class       = SerializerSiteBookmark
    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        print(" [TRACE] API_Items.get_queryset() called. Ok. ")
        search = self.request.GET.get("search") or None
        tag = self.request.GET.get("tag") or None 
        if search: 
            return self.search_item()
        if tag: 
            return self.filter_tag()
        queryset = models.SiteBookmark.objects\
                         .filter(owner = self.request.user)\
                         .exclude(deleted = True )\
                         .order_by("id").reverse()
        return queryset 

    def search_item(self):
        import shlex
        from functools import reduce
        from django.db.models import Q

        exclude_deleted = self.request.GET.get("exclude-deleted") or False 
        search = self.request.GET.get('search')
        mode   = self.request.GET.get('mode', "")

        if not search:
            return self.filter_latest()        
        words = shlex.split(search)
        lam = lambda x, y: x | y
        if  mode == "OR":
            lam = lambda x, y: x | y
        if mode == "AND":
            lam = lambda x, y: x & y
        # q = Q(title__contains =   search) | Q(url__contains =  search)       
        q1 = reduce(lam, [ Q(url__contains=w) for w in words])
        q2 = reduce(lam, [ Q(title__contains=w) for w in words])
          
        queryset = models.SiteBookmark.objects\
                         .filter(owner = self.request.user)\
                         .filter( q1 | q2 )\
                         .order_by("id")\
                         .reverse()

        if not exclude_deleted:
            return queryset.exclude(deleted = True) 
        return queryset 

    def filter_tag(self):
        tag = self.request.GET.get("tag")
        if not tag: return models.SiteBookmark.objects.none() 
        tag = models.Tag2.objects.get(name = tag, owner = self.request.user )
        return tag.item.filter(deleted = False)

    # Override method for interception and debugging 
    # (Printing request).  
    def create(self, request):

        logger = logging.getLogger(__name__)

        print(" [TRACE REQUEST] ", request)
        serializer = self.get_serializer( data = request.data )
        if not serializer.is_valid():
            print(" [TRACE] Serializer = ", serializer)
            return rf_resp.Response( serializer.errors
                                    , status = rf_status.HTTP_400_BAD_REQUEST)
        url: str= dutils.remove_url_obfuscation( serializer.data["url"] )
       
        it = models.SiteBookmark.objects.filter(owner = request.user, url = url).first()
        if it is not None:
            return rf_resp.Response( { 'error': 'Item already exists' }, STATUS_CODE_DOMAIN_ERROR)

        item = models.SiteBookmark.objects.create( 
                url     = url 
            , starred = serializer.data.get("starred") or False 
            , owner   = request.user )
        bookmarks.views.update_item_from_metadata(item.id)
        # except BaseException as ex:
       #     return rf_resp.Response( str(ex) , rf_status.HTTP_500_INTERNAL_SERVER_ERROR )

        logger.info(f" Added bookmark URL = {url}")
        
        result = SerializerSiteBookmark(item)
        return rf_resp.Response(result.data , status = rf_status.HTTP_201_CREATED )


class RestItemsDetail(rf_gen.RetrieveUpdateDestroyAPIView):
    """Rest API view/endpoit for class SiteBookmark."""

    serializer_class = SerializerSiteBookmark

    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    # permission_classes = [ rf_perm.IsAuthenticated, ]
    permission_classes = [  rf_perm.AllowAny ]

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        print(" [TRACE] API_Items_Detail.get_queryset() called. Ok. ")
        queryset = models.SiteBookmark.objects\
                         .filter(owner = self.request.user)
                         # .exclude(deleted = True )
        
        return queryset

    # Override method for interception and debugging 
    # (Printing request).  
    ## def create(self, request):
    ##    print(" [TRACE REQUEST] ", request)
    ##    return rf_resp.Response()


class RestTags(rf_gen.ListAPIView):
    """Rest API endpoint for model calss Tags2."""
    
    paginate_by = 50
    serializer_class = SerializerTags
    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes = ( rf_perm.IsAuthenticated, )

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        search = self.request.GET.get("search") or None 

        if search: 
            return models.Tag2.objects\
                         .filter( owner = self.request.user
                                 , name__contains = search )\
                          .order_by(Lower("name"))

        # .order_by(Lower("name")) => Order by alphabetic order 
        return models.Tag2.objects.filter(owner = self.request.user)\
                          .order_by(Lower("name"))

class RestTagsDetail(rf_gen.RetrieveUpdateDestroyAPIView):
    """Rest API endpoint for model class Tags2."""

    serializer_class       = SerializerTags
    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )
    
    def get_queryset(self):
        queryset = models.Tag2.objects\
                         .filter(owner = self.request.user)

        return queryset

