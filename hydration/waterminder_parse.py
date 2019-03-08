#!/usr/local/bin/python3
import csv
import os, sys
import datetime
import matplotlib.pyplot as mp_pyplot
import matplotlib.dates as mp_dates

if len(sys.argv) < 2:
    print("Pass the path to the waterminder-logs.csv file")
    quit()

# The second parameter is the waterminder-logs.csv file
filepath = sys.argv[1]
if not os.path.isfile(filepath):
    print("Not a valid file path: {}".format(filepath))
    quit()

# Some colors for the chart
colors = {
'Beer' : '#FFCC00',
'Carbonated Water' : '#3c81fa',
'Coconut Water' : '#E4DDCA',
'Coffee' : '#786A52',
'Energy Drink' : '#3cd86d',
'Hot Chocolate' : '#592d0d',
'Juice' : '#f69124',
'Liquor' : '#000000',
'Milk' : '#f6f6f6',
'Protein Shake' : '#8e8e93',
'Smoothie' : '#f53034',
'Soda' : '#e61a27',
'Sports Drink' : '#f51f55',
'Tea' : '#f8c731',
'Water' : '#38cbf8',
'Wine' : '#ac0000'
        }

# To generate our stacked area chart, we'll store the results in a dictionary
# whose key is the date and whose value is a dictionary. This value dictionary
# will have keys for each drink type and values for ounces consumed that day
stacked_area_dict = {}
all_drink_types = [ ]
drinks_to_oz_totals = {}

# Read in the CSV file
with open(filepath) as filehandle:
    csv_reader = csv.DictReader(filehandle)
    for row in csv_reader:
        row_date = datetime.datetime.strptime(row['Date'], '%Y/%m/%d')
        row_drink = row['Drink Type']
        row_hydration = float(row['Water Value(oz)'])

        date_stats = stacked_area_dict.get(row_date, {})
        date_drink_total = date_stats.get(row_drink, 0)
        date_drink_total += row_hydration
        date_stats[row_drink] = date_drink_total

        stacked_area_dict[row_date] = date_stats
        all_drink_types.append(row_drink)
        total_for_drink = drinks_to_oz_totals.get(row_drink, 0)
        total_for_drink += row_hydration
        drinks_to_oz_totals[row_drink] = total_for_drink

all_drink_types = list(set(all_drink_types))
all_drink_types.sort(key=lambda drink: drinks_to_oz_totals[drink])
all_drink_types.reverse()

colors_sorted = [ ]
for drink_type in all_drink_types:
    colors_sorted.append(colors[drink_type])

all_dates = list(stacked_area_dict.keys())
all_dates.sort()

data_for_chart = [ ]
for drink in all_drink_types:
    data_for_chart_for_drink = [ ]
    for date in all_dates:
        data_for_date = stacked_area_dict[date]
        data_for_chart_for_drink.append(data_for_date.get(drink, 0))
    data_for_chart.append(data_for_chart_for_drink)

ticks = all_dates

mp_pyplot.stackplot(all_dates, data_for_chart, labels=all_drink_types, colors=colors_sorted, baseline='weighted_wiggle')
mp_pyplot.legend(loc='upper center', ncol=1, bbox_to_anchor=(-0.1, 1.0))
mp_pyplot.gca().xaxis.set_major_formatter(mp_dates.DateFormatter('%Y/%m/%d'))
mp_pyplot.gca().xaxis.set_major_locator(mp_dates.DayLocator())
mp_pyplot.gcf().set_size_inches(18.5, 6.5)
mp_pyplot.gcf().autofmt_xdate()
mp_pyplot.xticks(ticks, rotation='vertical')
mp_pyplot.savefig('hydration.png', transparent=True, dpi=200, bbox_inches="tight")
