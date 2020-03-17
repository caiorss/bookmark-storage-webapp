PYTHON=/home/archbox/opt/bin/python 

run:
	${PYTHON} manage.py runserver 

database:
	${PYTHON} manage.py makemigrations
	${PYTHON} manage.py migrate 

