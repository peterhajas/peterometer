#!/usr/bin/env python3
from typing import NamedTuple, Optional
from datetime import datetime, date, time
from pathlib import Path
import csv

from .common import *

# An entry for food consumed
class FoodEntry:
    # The name of the food consumed
    name: str
    # The meal the food was eaten in, for example "Breakfast" or "Snack"
    meal: str
    # The quantity the food was consumed in
    quantity: float
    # The units of `quantity`
    quantity_units: str
    # The calories in this entry
    calories = float
    # The fat in this entry, in grams
    fat_g = Optional[float]
    # The protein in this entry, in grams
    protein_g = Optional[float]
    # The carbohydrates in this entry, in grams
    carbohydrates_g = Optional[float]
    # The saturated fat in this entry, in grams
    saturated_fat_g = Optional[float]
    # The sugar in this entry, in grams
    sugar_g = Optional[float]
    # The fiber in this entry, in grams
    fiber_g = Optional[float]
    # The cholesterol in this entry, in milligrams
    cholesterol_mg = Optional[float]
    # The sodium in this entry, in milligrams
    sodium_mg = Optional[float]
    # The date of this entry
    date: datetime

    def dict(self):
        return {
                "name" : self.name,
                "meal" : self.meal,
                "quantity" : self.quantity,
                "quantity_units" : self.quantity_units,
                "calories" : self.calories,
                "fat_g" : self.fat_g,
                "protein_g" : self.protein_g,
                "carbohydrates_g" : self.carbohydrates_g,
                "saturated_fat_g" : self.saturated_fat_g,
                "sugar_g" : self.sugar_g,
                "fiber_g" : self.fiber_g,
                "cholesterol_mg" : self.cholesterol_mg,
                "sodium_mg" : self.sodium_mg,
                "date" : self.date
                }

    def __repr__(self):
        return str(self.dict())

def get_food():
    entries = [ ]
    # LoseIt entries are broken up into different files per week
    data_path = Path("/Users/phajas/metrics/body/food/loseit")
    weekly_summaries = [x for x in data_path.iterdir() if x.is_file() and x.suffix == '.csv']

    for weekly_summary in weekly_summaries:
        with weekly_summary.open() as summary_file:
            reader = csv.DictReader(summary_file)
            for row in reader:
                name = row["Name"]
                meal = row["Type"]
                quantity = row["Quantity"]
                quantity_units = row["Units"]
                calories = row["Calories"]
                fat = row["Fat (g)"]
                protein = row["Protein (g)"]
                carbohydrates = row["Carbohydrates (g)"]
                saturated_fat = row["Saturated Fat (g)"]
                sugar = row["Sugars (g)"]
                fiber = row["Fiber (g)"]
                cholesterol = row["Cholesterol (mg)"]
                sodium = row["Sodium (mg)"]
                date = datetime.strptime(row["Date"], "%m/%d/%Y")

                # Ignore exercise for food entries
                if name == "Calorie Burn Bonus" or name == "HealthKit Workout" or name == "Steps Calorie Bonus":
                    continue

                entry = FoodEntry()

                entry.name = name
                entry.meal = meal
                entry.quantity = attempt_float(quantity)
                entry.quantity_units = quantity_units
                entry.calories = attempt_float(calories)
                entry.fat_g = attempt_float(fat)
                entry.protein_g = attempt_float(protein)
                entry.carbohydrates_g = attempt_float(carbohydrates)
                entry.saturated_fat_g = attempt_float(saturated_fat)
                entry.sugar_g = attempt_float(sugar)
                entry.fiber_g = attempt_float(fiber)
                entry.cholesterol_mg = attempt_float(cholesterol)
                entry.sodium_mg = attempt_float(sodium)
                entry.date = date

                entries.append(entry)

    return entries

