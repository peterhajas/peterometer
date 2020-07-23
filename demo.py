#!/usr/bin/env python3
from body.food import *
from body.hydration import *

food = get_food()
hydration = get_hydration()

print("{} food entries".format(len(food)))
print("{} hydration entries".format(len(hydration)))
