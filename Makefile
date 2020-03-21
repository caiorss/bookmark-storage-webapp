PYTHON=/home/archbox/opt/bin/python 

# Run application 
run:
	${PYTHON} manage.py runserver 0.0.0.0:8000

# Update Database 
db:
	cp db.sqlite3 db.sqlite3.back
	${PYTHON} manage.py makemigrations
	${PYTHON} manage.py migrate 

# Database backup 
db-back:
	cp db.sqlite3 db.sqlit3-back

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