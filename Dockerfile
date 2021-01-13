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
    apt-get install -y imagemagick p7zip-full                    && \
    apt-get install -y --no-install-recommends postgresql-client

# Persistence of database (SQLite3) and user downloaded files.
### VOLUME [ "/app/data" ]

# Clean package cache for saving disk space
RUN rm -rf /var/lib/apt/lists/*


#--------------- App Settings --------------------------#

# Install Requiremenets
#COPY requirements.txt  /tmp
RUN pip3 install pipenv

RUN mkdir -p /app/data/files
WORKDIR   /app
ADD .     /app
RUN cd /app && pipenv install

# Database setup SQLite 3 default.
RUN cd /app \
    && pipenv run ./manage.py makemigrations \
    && pipenv run ./manage.py makemigrations bookmarks \
    && pipenv run ./manage.py migrate --run-syncdb

# Fix problem: "image magick convert-im6.q16: attempt to perform an operation
# not allowed by the security policy
# `PDF' @ error/constitute.c/IsCoderAuthorized/408."
#
ADD image-magic-policy.xml /etc/ImageMagick-6/policy.xml 

# Create default administrator user with
#  =>> login:    admin
#  =>> email:    root@gmail.com
#  =>> password: admin
#
# It can be changed later by accessing: http://localhost:9000/admin
RUN cd /app && pipenv run ./manage.py initadmin


#================== Install Pdf2hmlEx =====================#
#

ARG PDF2THML_URL=https://github.com/pdf2htmlEX/pdf2htmlEX/releases/download/v0.18.8.rc1/pdf2htmlEX-0.18.8.rc1-master-20200630-Ubuntu-bionic-x86_64.AppImage

RUN mkdir -p /opt
ADD ./pdf2html.sh /opt
RUN chmod +x /opt/pdf2html.sh

# Download pdf2htmlEx application (AppImage release) for exporting html to PDF
ADD $PDF2THML_URL /opt/pdf2html.bin
# Extract PDF2html as fuser does not work on Docker enviroments.
RUN cd /opt && 7z x /opt/pdf2html.bin
RUN chmod +x /opt/usr/bin/pdf2htmlEX

ENV ENV_PDF2HTML_PATH /opt/usr/bin/pdf2htmlEX

   #==============================#
   # Container initialization     #
   #==============================#
ENV APP_PORT 9000
EXPOSE 9000:9000

ENTRYPOINT ["pipenv", "run", "/app/manage.py", "runserver", "0.0.0.0:$APP_PORT"]
