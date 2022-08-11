"""
Helper functions for PAS
"""
import numpy as np

fema_dict = {
    'WA': '10','OR': '10','ID': '10','CA': '9', 'NV': '9','AZ': '9',
    'MT': '8','WY': '8','UT': '8','CO': '8','ND': '8','SD': '8',
    'NE': '7','KS': '7','IA': '7','MO': '7','NM': '6','TX': '6',
    'OK': '6','AR': '6','LA': '6','MN': '5','WI': '5','MI': '5',
    'IL': '5','IN': '5','OH': '5','KY': '4','TN': '4','MS': '4',
    'AL': '4','GA': '4','FL': '4','SC': '4','NC': '4','VA': '3',
    'WV': '3','PA': '3','DC': '3','MD': '3','DE': '3','NY': '2',
    'NJ': '2','CT': '1','RI': '1','MA': '1','VT': '1','NH': '1',
    'ME': '1'
}

def addfema(row):
    try:
        states = row['states'].split(',')
    except AttributeError:
        return np.nan
    if len(states) > 1:
        fema_list = list(map(lambda state: fema_dict[state], states))
        fema_str = ','.join(fema_list)
        return fema_str
    else:
        return fema_dict[row['states']] 