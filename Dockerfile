# Based on: https://www.caktusgroup.com/blog/2017/03/14/production-ready-dockerfile-your-python-django-app/

#
#  https://medium.com/c0d1um/building-django-docker-image-with-alpine-32de65d2706

# Docker i mage based on Debian SLIM 
FROM python:3.7-alpine 

# Create a group and user to run our app
#ARG APP_USER=appuser
#RUN groupadd -r ${APP_USER} && useradd --no-log-init -r -g ${APP_USER} ${APP_USER}

RUN mkdir /app 
WORKDIR   /app 
ADD .     /app 

RUN apk add --no-cache --virtual .build-deps \
    ca-certificates gcc postgresql-dev linux-headers musl-dev \
    libffi-dev jpeg-dev zlib-dev \
    && pip install -r requirements.txt

EXPOSE 8000:8000 

CMD ["python3", "/app/manage.py", "runserver", "0.0.0.0:8000"]