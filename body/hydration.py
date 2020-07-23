#!/usr/bin/env python3
from typing import NamedTuple
from datetime import datetime, date, time
import csv

from common import *

# An entry for hydration consumed
class HydrationEntry(NamedTuple):
    # The type of drink, for example "Water", "Coffee", or "Soda"
    drink_type: str
    # The name of the drink in WaterMinder, for example "Nalgene 8oz"
    drink_name: str
    # The hydration volume consumed in fl.oz
    volume_floz: float
    # The effective hydration (less for coffee / soda / etc.) in floz
    effective_hydration_floz: float
    # The date of this entry
    date: datetime

def get_hydration():
    entries = [ ]
    with open("/Users/phajas/metrics/body/hydration/waterminder/waterminder-logs.csv") as input_file:
        reader = csv.DictReader(input_file)
        for row in reader:
            drink_type = row["Drink Type"]
            drink_name = row["Cup Name"]
            volume_floz = row["Hydration Value(oz)"]
            effective_hydration_floz = row["Water Value(oz)"]

            # Entries are split into date and time entries, combine these into
            # one combined datetime
            entry_date_datetime = datetime.strptime(row["Date"], "%Y/%m/%d")
            entry_time_datetime = datetime.strptime(row["Time"], "%I:%M:%S %p")

            entry_datetime = datetime.combine(entry_date_datetime.date(), entry_time_datetime.time())

            entry = HydrationEntry(drink_type=drink_type,
                    drink_name=drink_name,
                    volume_floz=attempt_float(volume_floz),
                    effective_hydration_floz=attempt_float(effective_hydration_floz),
                    date=entry_datetime)

            entries.append(entry)
    return entries

