# Based on: https://www.caktusgroup.com/blog/2017/03/14/production-ready-dockerfile-your-python-django-app/

#
#  https://medium.com/c0d1um/building-django-docker-image-with-alpine-32de65d2706

# Docker i mage based on Debian SLIM
#FROM python:3.7-alpine
FROM ubuntu

# Don't show any interactive prompt.

ARG DEBIAN_FRONTEND=noninteractive

#------------- Dependencies ----------------------------#

# Create a group and user to run our app
#ARG APP_USER=appuser
#RUN groupadd -r ${APP_USER} && useradd --no-log-init -r -g ${APP_USER} ${APP_USER}
### RUN apk add --update --no-cache g++ gcc libxslt-dev 

# RUN apk add --no-cache --virtual .build-deps \
#     ca-certificates gcc postgresql-dev linux-headers musl-dev \
#     libffi-dev jpeg-dev zlib-dev

RUN apt-get update                                               && \
    apt-get install -y python3 python3-pip                       && \
    apt-get install -y imagemagick                               && \
    apt-get install -y --no-install-recommends postgresql-client

# Persistence of database (SQLite3) and user downloaded files.
### VOLUME [ "/app/data" ]

ENV ENV_PDF2HTML_PATH /bin/pdf2htmlEx.bin
ARG PDF2THML_URL=https://github.com/pdf2htmlEX/pdf2htmlEX/releases/download/v0.18.8.rc1/pdf2htmlEX-0.18.8.rc1-master-20200630-Ubuntu-bionic-x86_64.AppImage

# Download pdf2htmlEx application (AppImage release) for exporting html to PDF
ADD $PDF2THML_URL $ENV_PDF2HTML_PATH
RUN chmod +x $ENV_PDF2HTML_PATH

RUN rm -rf /var/lib/apt/lists/*

#--------------- App Settings --------------------------#

# Install Requiremenets
COPY requirements.txt  /tmp
RUN pip3 install -r /tmp/requirements.txt 
RUN pip3 install lxml

RUN mkdir -p /app/data/files 
WORKDIR   /app
ADD .     /app

# Database setup SQLite 3 default.
RUN python3 manage.py makemigrations \
    && python3 manage.py makemigrations bookmarks \
    && python3 manage.py migrate --run-syncdb

# Create default administrator user with
#  =>> login:    admin 
#  =>> email:    root@gmail.com
#  =>> password: admin
#
# It can be changed later by accessing: http://localhost:9000/admin
RUN python3 manage.py initadmin 


EXPOSE 9000:9000

ENTRYPOINT ["python3", "/app/manage.py", "runserver", "0.0.0.0:9000"]
