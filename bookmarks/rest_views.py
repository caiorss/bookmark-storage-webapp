import rest_framework as rest
import rest_framework.generics       as rf_gen 
import rest_framework.authentication as rf_auth 
import rest_framework.views          as rf_views 
import rest_framework.response       as rf_resp 
import rest_framework.permissions    as rf_perm
import rest_framework.pagination     as rf_pag 

from django.core.paginator import Paginator 

from bookmarks import models 


class Serializer_SiteBookmark(rest.serializers.ModelSerializer):
    class Meta:
        fields = ( 'id', 'url', 'title', 'deleted', 'starred'
                   , 'brief', 'owner', 'created', 'updated')
        model = models.SiteBookmark


class Serializer_Tags(rest.serializers.ModelSerializer):
    class Meta:
        fields = ( 'id', 'name', 'description', 'starred', 'created', 'updated' ) 
        model = models.Tag2



class API_Items(rf_gen.ListAPIView):
    # pagination_class = rf_pag. 
    serializer_class       = Serializer_SiteBookmark

    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        queryset = models.SiteBookmark.objects\
                         .filter(owner = self.request.user)\
                         .exclude(deleted = True )\
                         .order_by("id").reverse()
        return queryset 

class API_Items_Detail(rf_gen.RetrieveUpdateDestroyAPIView):
    # pagination_class = rf_pag. 
    serializer_class       = Serializer_SiteBookmark

    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        queryset = models.SiteBookmark.objects\
                         .filter(owner = self.request.user)
                         # .exclude(deleted = True )
        
        return queryset

    
class API_Tags(rf_gen.ListAPIView):
    # pagination_class = rf_pag.
    # 
    paginate_by = 50  
    serializer_class       = Serializer_Tags

    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        return models.Tag2.objects.filter(owner = self.request.user)\
                          .order_by("id").reverse()

class API_Tags_Detail(rf_gen.RetrieveUpdateDestroyAPIView):
    # pagination_class = rf_pag. 
    serializer_class       = Serializer_Tags

    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )
    
    def get_queryset(self):
        queryset = models.Tag2.objects\
                         .filter(owner = self.request.user)\
                         .exclude(deleted = True )

        return queryset

class API_Items_search(rf_gen.ListAPIView):
    # pagination_class = rf_pag. 
    serializer_class       = Serializer_SiteBookmark

    authentication_classes = ( rf_auth.SessionAuthentication
                             , rf_auth.TokenAuthentication )
    permission_classes     = ( rf_perm.IsAuthenticated, )

    # Return all non-deleted bookmarks that belongs to the current 
    # user (provided by the request)  
    def get_queryset(self):
        import shlex
        from functools import reduce
        from django.db.models import Q

        exclude_deleted = self.request.GET.get("exclude-deleted") or False 
        search = self.request.GET.get('query')
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

