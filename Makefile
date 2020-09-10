PYTHON=python

# Run application
run:
	# ${PYTHON} manage.py runserver 0.0.0.0:8000
	pipenv run python manage.py runserver 0.0.0.0:8000

# Open Django's interactive console for interacting with the database (aka model)
shell:
	pipenv run python manage.py shell

# Update Database
db:
	mkdir -p back/
	cp -v -a data/db.sqlite3 back/db.sqlite3.back-$(shell date +"%m-%d-%y-%s")
	${PYTHON} manage.py makemigrations bookmarks
	${PYTHON} manage.py migrate --run-syncdb

# Database backup
db-back:
	mkdir -p back/
	cp -v data/db.sqlite3 back/db.sqlite3.back-$(shell date +"%m-%d-%y-%s")

# Reset dabase
db-reset:
	mkdir -p back/
	cp -v -a db.sqlite3 back/db.sqlite3.back-$(shell date +"%m-%d-%y-%s")
	rm -rf db.sqlite3
	${PYTHON} manage.py makemigrations bookmarks
	${PYTHON} manage.py migrate --run-syncdb
	${PYTHON} manage.py createsuperuser


# Build Docker Image
docker-build:
	docker build . -t django-bookmark-server

# Run docker Image container
# The server URL will be the URL: http://localhost:9000/
docker-run1:
	docker volume create django-server-volume
	docker run --detach  \
		-p 9000:9000 \
		-v django-server-volume:/app/data \
		--name django-server \
		django-bookmark-server

# Bind ${CURRRENT_PROJECT_DIR}/data to /app/data in the container.
docker-run2:
	docker volume create django-server-volume
	docker run --detach  \
		-p 9000:9000 \
		-v $(shell pwd)/data:/app/data \
		--name django-server \
		--restart=always \
		django-bookmark-server


# Stop docker image container
docker-stop:
	docker rm -f django-server

docker-restart:
	docker rm -f django-server \
		|| docker run --detach --rm -p 9000:9000 -v django-server-volume:/app/data --name django-server django-bookmark-server

docker-shell:
	docker run --rm -it --entrypoint=sh -v django-server-volume:/app/data  django-bookmark-server

# Remove container and image
docker-clean:
	docker rm -f django-server || docker image rm django-bookmark-server

# Show container logs
docker-log:
	docker logs -f  django-server

exe:
	pyinstaller --name=bookmark-django ./manage.py
