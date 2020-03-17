PYTHON=/home/archbox/opt/bin/python 

run:
	${PYTHON} manage.py runserver 0.0.0.0:8000

db:
	${PYTHON} manage.py makemigrations
	${PYTHON} manage.py migrate 

