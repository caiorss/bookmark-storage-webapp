#!/usr/bin/env python
from setuptools import setup, find_packages

setup( name='myproject'
      ,version='1.0'
      ,packages=find_packages()
      ,install_requires = [ 'django', 'django-pdb', 'bs4']
      ,scripts=['manage.py']
     # ,entry_points={'console_scripts': [
     #                 'manage.py = myproject:manage']}
)
