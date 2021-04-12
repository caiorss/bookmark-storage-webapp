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
        fields = ( 'id', 'url', 'title', 'starred', 'brief', 'owner', 'created', 'updated')
        model = models.SiteBookmark

class API_Item(rf_gen.ListAPIView):
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

class API_Item_Details(rf_gen.RetrieveUpdateDestroyAPIView):
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
                         .exclude(deleted = True )
        return queryset 
