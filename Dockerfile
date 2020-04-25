# Based on: https://www.caktusgroup.com/blog/2017/03/14/production-ready-dockerfile-your-python-django-app/

#
#  https://medium.com/c0d1um/building-django-docker-image-with-alpine-32de65d2706

# Docker i mage based on Debian SLIM
FROM python:3.7-alpine

#------------- Dependencies ----------------------------#

# Create a group and user to run our app
#ARG APP_USER=appuser
#RUN groupadd -r ${APP_USER} && useradd --no-log-init -r -g ${APP_USER} ${APP_USER}
RUN apk add --update --no-cache g++ gcc libxslt-dev 

RUN apk add --no-cache --virtual .build-deps \
    ca-certificates gcc postgresql-dev linux-headers musl-dev \
    libffi-dev jpeg-dev zlib-dev

#--------------- App Settings --------------------------#

# Install Requiremenets
COPY requirements.txt  /tmp
RUN pip install -r /tmp/requirements.txt 
RUN pip install lxml

RUN mkdir -p /app/data/files 
WORKDIR   /app
ADD .     /app

# Database setup SQLite 3 default.
RUN python manage.py makemigrations \
    && python manage.py makemigrations bookmarks \
    && python manage.py migrate --run-syncdb

# Create default administrator user with
#  =>> login:    admin 
#  =>> email:    root@gmail.com
#  =>> password: admin
#
# It can be changed later by accessing: http://localhost:9000/admin
RUN python manage.py initadmin 

# Persistence of database (SQLite3) and user downloaded files.
### VOLUME [ "/app/data" ]

EXPOSE 9000:9000

ENTRYPOINT ["python3", "/app/manage.py", "runserver", "0.0.0.0:9000"]
