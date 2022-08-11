from doctest import master
import pathlib
import glob
import os

import argparse
import geojson
import numpy as np
import pandas as pd
import json

from datetime import datetime, timedelta
from helper import addfema

### CLI Parser ###
file_help = "The sim file to be used to create stats output."
approot_help = "The path to the root of the impacts app."
nsim_help = "The number of simulations to run. Default is 10,000."
climo_help = "The location where the climo files are stored."
d_help = "Which day (D1 or D2) is being processed."
out_help = "The location where state/cwa files are written."

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument("-f", "--file", required=True, help=file_help)
parser.add_argument("-r", "--approot", required=True, help=approot_help)
parser.add_argument("-o", "--outdir", required=False, default="../web", type=str, help=out_help)
parser.add_argument("-n", "--nsims", required=False, default=10000, type=int, help=nsim_help)
parser.add_argument("-c", "--climopath", required=False, default="../data/climo", type=str, help=climo_help)
parser.add_argument("-d", "--day", required=False, default=1, type=int, help=d_help)

args = parser.parse_args()

# Primary variables
f = pathlib.Path(args.file)
nsims = args.nsims
climo = pathlib.Path(args.approot,args.climopath)
outdir = pathlib.Path(args.approot,args.outdir)
otlk_day = args.day

# Helper list for day indexing
aggregateMonths = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]
#Helper dict for adding FEMA
# fema_dict = {
#     'WA': '10','OR': '10','ID': '10','CA': '9', 'NV': '9','AZ': '9',
#     'MT': '8','WY': '8','UT': '8','CO': '8','ND': '8','SD': '8',
#     'NE': '7','KS': '7','IA': '7','MO': '7','NM': '6','TX': '6',
#     'OK': '6','AR': '6','LA': '6','MN': '5','WI': '5','MI': '5',
#     'IL': '5','IN': '5','OH': '5','KY': '4','TN': '4','MS': '4',
#     'AL': '4','GA': '4','FL': '4','SC': '4','NC': '4','VA': '3',
#     'WV': '3','PA': '3','DC': '3','MD': '3','DE': '3','NY': '2',
#     'NJ': '2','CT': '1','RI': '1','MA': '1','VT': '1','NH': '1',
#     'ME': '1'
# }
# Impact list
impacttype = ['population','hospitals','mobilehomes','psubstations','schools','tornadoes']

# Dictionary to connect tornado rating with a string descriptor
levels = {'0': 'all', '2': 'sig', '4': 'vio'}

# Simple helper dictionary for copying data
helper = {'states': 'State','fema': 'FEMA','wfos': 'CWA'}

# Remove old state and CWA files
oldfiles = glob.glob(f'{outdir}/includes/data/followup/*')
for file in oldfiles:
    os.remove(file)

# Load saved climo data
# with open(f'{climo}/pop_climo_torSmAvg.json') as file:
#     pop_data = json.load(file)
        
# with open(f'{climo}/hosp_climo_torSmAvg.json') as file:
#     hosp_data = json.load(file)
    
# with open(f'{climo}/mob_climo_torSmAvg.json') as file:
#     mob_data = json.load(file)
    
# with open(f'{climo}/pow_climo_torSmAvg.json') as file:
#     pow_data = json.load(file)

# with open(f'{climo}/sco_climo_torSmAvg.json') as file:
#     sco_data = json.load(file)

def getDayIdx(file):
    dayStr = str(file).split('/')[-1].split('.')[0][4:8]
    
    month = int(dayStr[:2])
    day = int(dayStr[2:])

    if otlk_day == 1:
        return aggregateMonths[month-1]+day-1
    else:
        # Logic for when the D2 outlook is valid for Jan 1
        day2idx = aggregateMonths[month-1]+day
        if day2idx < 366:
            return day2idx
        else:
            return 0

def getValidDay(file):

    file_base = str(file).split('/')[-1]
    timestamp = file_base.split('.')[0] 
    dayStr = timestamp[0:8]

    if otlk_day == 2:

        validDay = datetime.strptime(dayStr,"%Y%m%d") + timedelta(days=1)
        dayStr = datetime.strftime(validDay,"%Y%m%d")

    return (dayStr,timestamp)

# Function to count tornadoes in each simulation
def torCounter(df,filled_df):
    # Use arbitrary column to get count of entries for each sim (i.e., count of tornadoes)
    torsBySim = df.groupby("sim").count().loc[:,'wfos']
    
    # Merge this count with the original 
    merged = filled_df.merge(torsBySim,how='left',on='sim')
    merged.fillna(value=0,inplace=True)
    merged.rename(columns={'wfos':'tornadoes'},inplace=True)
    return merged

# def addfema(row):
#     try:
#         states = row['states'].split(',')
#     except AttributeError:
#         return np.nan
#     if len(states) > 1:
#         fema_list = list(map(lambda state: fema_dict[state], states))
#         fema_str = ','.join(fema_list)
#         return fema_str
#     else:
#         return fema_dict[row['states']] 

def getQuants(df,filter=0,writesims=False,loc='national'):
    
    df = df[df['rating'] >= filter]
    
    sims = df.groupby("sim")

    # Don't include tornadoes (last element) in impacttype
    # We use tor counter below for that
    fields = sims.sum().loc[:,impacttype[:-1]]

    # Fill missing sims with 0s (artifact of how pas writes out files)
    fill_fields = fields.reindex(list(range(1,nsims+1)),fill_value=0)

    # Get tornado counts
    merged = torCounter(df,fill_fields)

    # Add a section to save sims files if we desire -- need the merged file
    if writesims:

        # **** NEED TO CORRECT THE PATH ****
        merged.to_csv(f'{outdir}/includes/data/followup/sims_{loc}_{filter}.csv')
    
    return merged.quantile(q=[0.1,0.5,0.9],interpolation='nearest')

def addregions(df,scope,writesims=False):

    if scope == 'national':
        
        for level in [0,2,4]:
    
            quants = getQuants(df,filter=level,writesims=writesims)

            nationalList['Current'][levels[str(level)]] = {}

            for impact in impacttype:

                nationalList['Current'][levels[str(level)]][impact] = {}

                for quant in quants.index:

                    nationalList['Current'][levels[str(level)]][impact][quant] = int(quants.loc[quant,impact])
        masterList.append(nationalList)
        
        return
    
    sdf = df.assign(category=df[scope].str.split(',')).explode('category').reset_index(drop=True)
    sdf = sdf[sdf['category'].notna()]
    slist = sdf['category'].unique().tolist()
    
    for thing in slist:
    
        thingList = {
            'Location': thing,
            'Type': helper[scope],
            'Current': {},
            'Climo': {}
        }
        
        ind_thing = sdf[sdf['category'] == thing]
        
        for level in [0,2,4]:
            quants = getQuants(ind_thing,filter=level,writesims=writesims, loc=thing)

            thingList['Current'][levels[str(level)]] = {}

            for impact in impacttype:

                thingList['Current'][levels[str(level)]][impact] = {}

                for quant in quants.index:

                    thingList['Current'][levels[str(level)]][impact][quant] = int(quants.loc[quant,impact])
                
        masterList.append(thingList)

# Get index of the valid day from the file
dayIdx = getDayIdx(f)

## *** COME BACK TO CLIMO ONCE WE HAVE CLIMO FOR EVERYTHING ***

# Define climo function
# def getClimo():

#     # Prep the dictionary file to receive climo data
#     masterDict['natClimo'] = {'pop': {},
#                             'pow': {},
#                             'mob': {},
#                             'hosp': {},
#                             'sco': {}}

#     for feature in ['population','hospitals','mobilehomes','psubstations','tornadoes']:
#         masterDict['national'][0][feature].append([])

#     # Load nat climo data into dictionary using the proper day
#     for key in pop_data['nat'].keys():
        
#         masterDict['natClimo']['pop'][key] = pop_data['nat'][key][dayIdx]
#         masterDict['natClimo']['hosp'][key] = hosp_data['nat'][key][dayIdx]
#         masterDict['natClimo']['mob'][key] = mob_data['nat'][key][dayIdx]
#         masterDict['natClimo']['pow'][key] = pow_data['nat'][key][dayIdx]

#         # This is the new method for appending the nat climo
#         masterDict['national'][0]['population'][1].append(pop_data['nat'][key][dayIdx])
#         masterDict['national'][0]['hospitals'][1].append(hosp_data['nat'][key][dayIdx])
#         masterDict['national'][0]['mobilehomes'][1].append(mob_data['nat'][key][dayIdx])
#         masterDict['national'][0]['psubstations'][1].append(pow_data['nat'][key][dayIdx])

masterList = []
nationalList = {
    'Location': 'National',
    'Type': 'National',
    'Current': {},
    'Climo': {}
}
emptySims = {"0.1": 0, "0.5": 0, "0.9": 0}

# Read data into dataframe
try:
    df = pd.read_csv(f, sep="|")
except pd.errors.EmptyDataError:
    import sys
    print("The sims file is empty (presumably due to there being no simulated tornadoes).")

    # Fill out the national quantiles with 0s
    for impact in impacttype:
        nationalList['Current'][impact] = emptySims

    #getClimo()

    # Write master json data
    with open(f'{outdir}/includes/data/init/data.json', 'w') as fp:
        json.dump(nationalList, fp)

    # Write master json to archive
    valid, ts = getValidDay(f)

    with open(f'{outdir}/includes/data/archive/data_v{valid}_{ts}.json', 'w') as fp:
        json.dump(nationalList, fp)

    # ** NOT INCLUDING INDIVDUAL TOR FILES AT THIS TIME **

    # Need to write an empty tor file json
    # empty_tors = {}

    # for impact in impacttype:
    #     empty_tors[impact] = {
    #         'ten':[],
    #         'med':[],
    #         'ninety':[]
    #     }

    # # Write out tornado json data
    # with open(f'{outdir}/includes/data/init/ind_tors.json', 'w') as fp:
    #     json.dump(empty_tors, fp)

    sys.exit(0)

# Add FEMA column
df['fema'] = df.apply(lambda row: addfema(row), axis=1)

            # Need climo addition
            # nationalList['Climo'][name][quant] = ???

# sims = df.groupby("sim")

# # Don't include tornadoes (last element) in impacttype
# # We use tor counter below for that
# fields = sims.sum().loc[:,impacttype[:-1]]

# # Fill missing sims with 0s (artifact of how pas writes out files)
# fill_fields = fields.reindex(list(range(1,nsims+1)),fill_value=0)

# # Get tornado counts
# merged = torCounter(df,fill_fields)

# ## ** Grabbing tornado tracks **
# #quants = fill_fields.quantile(q=[0,0.1,0.5,0.9,1],interpolation='nearest')
# quants = merged.quantile(q=[0.1,0.5,0.9],interpolation='nearest')

# for impact in impacttype:

#     for quant in quants.index:

#         nationalList['Current'][impact][quant] = int(quants.loc[quant,impact])

#
# ** National **
#

addregions(df,'national',writesims=True)

#
# ** States **
#

addregions(df,'states',writesims=True)

#
# ** FEMA **
#

addregions(df,'fema',writesims=True)

#
# ** CWAs **
#

addregions(df,'wfos',writesims=True)

# Get Climo data
# getClimo()





# # Write out tornado json data
# with open(f'{outdir}/d{otlk_day}/includes/data/init/ind_tors.json', 'w') as fp:
#     json.dump(ind_torDict, fp)

# Write master json data
with open(f'{outdir}/includes/data/init/data.json', 'w') as fp:
    json.dump(masterList, fp)

# # Write master json to archive
# valid, ts = getValidDay(f)
# with open(f'{outdir}/d{otlk_day}/includes/data/archive/data_v{valid}_{ts}.json', 'w') as fp:
#     json.dump(masterDict, fp)

