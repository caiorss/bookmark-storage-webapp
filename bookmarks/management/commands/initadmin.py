
from django.conf import settings
from django.core.management.base import BaseCommand
from bookmarks.models import Account

class Command(BaseCommand):

    def handle(self, *args, **options):
        if Account.object.count() == 0:        
            username = "admin"         #user[0].replace(' ', '')
            email    = "admin@gmail.com" #user[1]
            password = 'admin'
            print('Creating account for %s (%s)' % (username, email))
            admin = Account.object.create_superuser(email=email, username=username, password=password)
            admin.is_active = True
            admin.is_admin = True
            admin.save()
        else:
            print('Admin accounts can only be initialized if no Accounts exist')