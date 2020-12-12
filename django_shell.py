#!/usr/bin/env python3
from django.core.management import setup_environ
from bookmarks import settings
setup_environ(settings)