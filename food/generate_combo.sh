#!/bin/sh
# delete the combine file
rm combine.csv
# concatenate all the csvs, sorting
echo "Date,Name,Type,Quantity,Units,Calories,Fat (g),Protein (g),Carbohydrates (g),Saturated Fat (g),Sugars (g),Fiber (g),Cholesterol (mg),Sodium (mg)" > combine.csv
cat *.csv | grep -v "Calorie Burn" | grep -v "Date,Name" | grep -v "HealthKit" | sort >> combine.csv
