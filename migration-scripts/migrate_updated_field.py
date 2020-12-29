import bookmarks.models as bm 
from datetime import datetime
import copy 

print(" [TRACE] Started script Ok. ")

default_date = datetime(2020, 1, 1)

cnt: int = 0

for item in bm.SiteBookmark.objects.all():
    print()
    print(" -----------------------------------------------------------")
    print(" [TRACE] Processing Item = ", item)
    print(f" [TRACE] Item.created = {item.created} / item.updated = {item.updated} ")

    if False and cnt > 500:
        print(" [TRACE] Stop loop") 
        break
    cnt = cnt + 1

    if item.created is None: print(" [DEBUG] Item.crated is NONE")
    if item.updated is None: print(" [DEBUG] Item.updated is NONE")

    updated = default_date if item.updated  is None else datetime(item.updated.year, item.updated.month, item.updated.day)
    created = default_date if item.created is None else datetime(item.created.year, item.created.month, item.created.day)

    print(" [TRACE] type(created) ", type(created))

    assert id(updated) != id(item.updated), "Assert updated deep copy"
    assert id(created) != id(item.created), "Asseet created deep copy"     

    if created is not None:
        print(" [TRACE] ===> Branch item.created")
        assert(item.created is not None, "item.created is none")
        item.created_time  = datetime.combine(created, datetime.min.time())
        item.save()
    if updated is not None:
        print(" [TRACE] ==>>> Branch item.updated")
        assert(item.updated is not None, "item.update is None")
        item.updated_time = datetime.combine(updated, datetime.min.time())
        item.save()
    

print(" [TRACE] Finished Ok.")