PYTHON=/home/archbox/opt/bin/python 

# Run application 
run:
	${PYTHON} manage.py runserver 0.0.0.0:8000

# Update Database 
db:
	${PYTHON} manage.py makemigrations
	${PYTHON} manage.py migrate 

# Build Docker Image 
docker-build: 
	docker build . -t django-crud

# Run docker Image 
docker-run: 
	docker run --detach --rm -p 8000:8000 --name django-container django-crud 

docker-log: 
	docker logs -f django-container 			

exe: 
	pyinstaller --name=bookmark-django ./manage.py