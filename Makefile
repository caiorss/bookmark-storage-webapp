PYTHON=/home/archbox/opt/bin/python 

# Run application 
run:
	${PYTHON} manage.py runserver 0.0.0.0:8000

# Open Django's interactive console for interacting with the database (aka model)
shell: 
	${PYTHON} manage.py shell 

# Update Database 
db:
	mkdir -p back/
	cp -a db.sqlite3 back/db.sqlite3.back-$(shell date +"%m-%d-%y-%s")
	${PYTHON} manage.py makemigrations bookmarks
	${PYTHON} manage.py migrate --run-syncdb

# Database backup 
db-back:
	mkdir -p back/
	cp -v db.sqlite3 back/db.sqlite3.back-$(shell date +"%m-%d-%y-%s")

# Reset dabase
db-reset:
	mkdir -p back/
	cp -a db.sqlite3 back/db.sqlite3.back-$(shell date +"%m-%d-%y-%s")
	rm -rf db.sqlite3 
	${PYTHON} manage.py makemigrations bookmarks
	${PYTHON} manage.py migrate --run-syncdb
	${PYTHON} manage.py createsuperuser


# Build Docker Image 
docker-build: 
	docker build . -t django-crud

# Run docker Image 
docker-run: 
	docker run --detach --rm -p 8000:8000 --name django-container django-crud 

docker-log: 
	docker logs  django-container 			

exe: 
	pyinstaller --name=bookmark-django ./manage.py