# Credits: https://gist.github.com/victorono/cd9d14b013487b8b22975512225c5b4c
# 
# Run from Django shell with: ($ python manage.py shell)
# 
# >>> exec(open("./remove-duplicate-script.py").read())
# 
from django.db.models import Count, Max
from bookmarks.models import SiteBookmark  

unique_fields = ['owner', 'url']

duplicates = (
    SiteBookmark.objects.values(*unique_fields)
    .order_by()
    .annotate(max_id=Max('id'), count_id=Count('id'))
    .filter(count_id__gt=1)
)


print(" Query = \n", duplicates.query, "\n")
print(" Duplicates = ", duplicates.count())

for dup in duplicates:
    print(" Dup = ", dup)

 

""" for duplicate in duplicates:
    query = (
        SiteBookmark.objects
        .filter(**{x: duplicate[x] for x in unique_fields})
        .exclude(id=duplicate['max_id'])
        
    )
    counter = 0
    for item in query:
        item.url = f"duplicate-${counter}-${item.url}"
        item.save()
        counter = counter + 1

  """