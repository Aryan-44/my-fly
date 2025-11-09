from models import Passenger, get_session
from datetime import date, timedelta
import random

names = [
    ("Asha Verma", "asha.verma@example.com"),
    ("Rohit Sen", "rohit.sen@example.com"),
    ("Meera Iyer", "meera.iyer@example.com"),
    ("Kabir Khan", "kabir.khan@example.com"),
    ("Ananya Rao", "ananya.rao@example.com"),
    ("Vikram Joshi", "vikram.joshi@example.com"),
]

routes = ["DEL->BLR", "BLR->BOM", "BOM->DEL", "DEL->HYD", "HYD->MAA"]
tiers = ["REGULAR", "SILVER", "GOLD", "PLATINUM"]

s = get_session()
for n, e in names:
    s.merge(
        Passenger(
            name=n,
            email=e,
            route=random.choice(routes),
            tier=random.choices(tiers, weights=[50,25,15,10])[0],
            lastBooking=(date.today() - timedelta(days=random.randint(1,120))).isoformat(),
        )
    )
s.commit()
print("✅ Demo passengers seeded.")
