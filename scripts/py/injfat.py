from email import parser
import pandas as pd
import pickle
import pathlib
import argparse
import json
import csv
import numpy as np
from helper import addfema

import warnings
warnings.filterwarnings("ignore")

feats = ['rating','slat','slon','distance','population']
rename = {'rating':'mag', 'distance':'len', 'population': 'pop'}
nsims = 10000

path_help = "Absolute path to the ml models for injury & fatality prediction"
file_help = "Path to the pipe-delimited PAS sim file"
out_help = "Path to where we write the csv"
day_help = "The forecast day of the input PAS psv file"

parser = argparse.ArgumentParser()
parser.add_argument("-p", "--path", required=False, default="/Users/josephpicca/projects/impacts/notebooks/ml-models/", help=path_help)
parser.add_argument("-o", "--outpath", required=True, help=out_help)
parser.add_argument("-f", "--file", required=True, help=file_help)
parser.add_argument("-d", "--day", required=False, default=1, type=int, help=day_help)

args = parser.parse_args()
f = pathlib.Path(args.file)
mlpath = pathlib.Path(args.path)
outdir = pathlib.Path(args.outpath)
# outfile = outdir.joinpath('day1-injfat.json')
outfile = outdir.joinpath('cas_national.json')
day = args.day

if day != 1:
    print('Only day 1 files are currently used for prediction... exiting.')
    import sys
    sys.exit(0)


try:
    df = pd.read_csv(f,sep='|')
    df['fema'] = df.apply(lambda row: addfema(row), axis=1)
except pd.errors.EmptyDataError:
    import sys
    print("The sims file is empty (presumably due to there being no simulated tornadoes).")

    # Write out a csv file with 0s for both injuries and fatalities
    # here
    emptyJson = {
        "num_inj": {"1": 0.0},
        "num_fat": {"1": 0.0}
    }

    with open(outfile, 'w') as out:
        json.dump(emptyJson,out)

    with open(outdir.joinpath('timeinj_national.csv'),'w') as out:
        writer = csv.writer(out)

        writer.writerow(['time','num_inj'])
        writer.writerow([])

    with open(outdir.joinpath('timefat_national.csv'),'w') as out:
        writer = csv.writer(out)

        writer.writerow(['time','num_fat'])
        writer.writerow([])

    sys.exit(0)

class Predictor(object):
    """
    A class to hold sim data and run predictions on these data
    """
    def __init__(self,df):

        self._sims = df
        self._features = self._sims.columns
        self._numtors = self._sims.shape[0]
        
        with open(mlpath.joinpath('injclass_aug22.model'), 'rb') as f:
            self.iclass = pickle.load(f)
        
        with open(mlpath.joinpath('injreg.model'), 'rb') as f:
            self.ireg = pickle.load(f)

        with open(mlpath.joinpath('inj_nonsig_dist.model'), 'rb') as f:
            self.idist = pickle.load(f)

        with open(mlpath.joinpath('fatclass.model'), 'rb') as f:
            self.fclass = pickle.load(f)
        
        with open(mlpath.joinpath('fatreg.model'), 'rb') as f:
            self.freg = pickle.load(f)

        with open(mlpath.joinpath('fat_nonvio_dist.model'), 'rb') as f:
            self.fdist = pickle.load(f)

    @property
    def features(self):
        return self._features

    @features.setter
    def features(self,newfeats):
        self._features = newfeats

    def formatdf(self,convention):
        self._fmatdf = self._sims[self._features].rename(columns=convention)
    
    def _getprob(self,cas='i'):
        if cas == 'i':
            _probs = self.iclass.predict_proba(self._fmatdf)[:,-1]
        elif cas == 'f':
            _probs = self.fclass.predict_proba(self._fmatdf)[:,-1]
        else:
            import sys
            print(f'Invalid casualty type: {cas} ...exiting')
            sys.exit(1)

        return _probs

    def _fixZero(self,arr):
        arr[arr < 0] = 0
        return arr.round()

    def _filldf(self,df,cas='inj'):
        df.loc[0] = np.zeros(df.shape[1])
        df[f'num_{cas}'] = 0
        return df

    def makeprediction(self,cas='i'):
        
        _probs = self._getprob(cas)

        # Get random values 0-1 gor each tor
        _rand = np.random.rand(self._numtors)
        _postors = self._fmatdf[_rand < _probs]

        if cas == 'i':
            _postors_w = _postors[_postors['mag'] < 2]
            _postors_s = _postors[_postors['mag'] > 1]

            try:
                _postors_s.loc[:,'num_inj'] = self._fixZero(self.ireg.predict(_postors_s))
            except ValueError:
                print('It seems there are no sig tors causing injury. Creating empty df')
                # Need to create empty df in the style of _postors_s
                _postors_s = self._filldf(_postors_s)

            try:
                _postors_w.loc[:,'num_inj'] = self._fixZero(self.idist.rvs(_postors_w.shape[0]))
            except ValueError:
                print('It seems there are no weak tors causing injury. Creating empty df.')
                # Need to create empty df in the style of _postors_w
                _postors_w = self._filldf(_postors_w)

            _dfcas = self._sims.join(pd.concat([_postors_s,_postors_w])['num_inj'],how='left')
            # print(_dfinj)
            # _dfcas = _dfinj.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)

        elif cas == 'f':
            _postors_w = _postors[_postors['mag'] < 4]
            _postors_v = _postors[_postors['mag'] > 3]

            try:
                _postors_v.loc[:,'num_fat'] = self._fixZero(self.freg.predict(_postors_v))
            except ValueError:
                print('It seems there are no violent tors causing fatality. Creating empty df.')
                # Need to create empty df in the style of _postors_v
                _postors_v = self._filldf(_postors_v,cas='fat')
            
            try:
                _postors_w.loc[:,'num_fat'] = self._fixZero(self.fdist.rvs(_postors_w.shape[0]))            
            except ValueError:
                print('It seems there are no weak tors causing fatality. Creating empty df.')
                # Need to create empty df in the style of _postors_w
                _postors_w = self._filldf(_postors_w,cas='fat')

            _dfcas = self._sims.join(pd.concat([_postors_v,_postors_w])['num_fat'],how='left')
            # _dfcas = _dffat.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)
        
        else:
            import sys
            print(f'Invalid casualty type: {cas} ...exiting')
            sys.exit(1)

        return _dfcas

def addregions(dfinj,dffat,scope):
    
    idf = dfinj.assign(category=dfinj[scope].str.split(',')).explode('category').reset_index(drop=True)
    idf = idf[idf['category'].notna()]
    slist = idf['category'].unique().tolist()

    fdf = dffat.assign(category=dffat['wfos'].str.split(',')).explode('category').reset_index(drop=True)
    fdf = fdf[fdf['category'].notna()]

    for thing in slist:
    
        inj_thing = idf[idf['category'] == thing]
        fat_thing = fdf[fdf['category'] == thing]

        timeAndInj = inj_thing[inj_thing['num_inj'] > 0][['time','num_inj']]
        timeAndFat = fat_thing[fat_thing['num_fat'] > 0][['time','num_fat']]
        timeAndInjPath = outdir.joinpath(f'timeinj_{thing}.csv')
        timeAndFatPath = outdir.joinpath(f'timefat_{thing}.csv')
        timeAndInj.to_csv(timeAndInjPath, index=False)
        timeAndFat.to_csv(timeAndFatPath, index=False)
        
        inj_thing = inj_thing.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)
        fat_thing = fat_thing.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)

        injfat_thing = pd.concat([inj_thing['num_inj'],fat_thing['num_fat']], axis=1)
        
        indpath = outdir.joinpath(f'cas_{thing}.json')

        injfat_thing.to_json(indpath)


data = Predictor(df)
data.features = feats
data.formatdf(rename)

dfinj = data.makeprediction(cas='i')
dffat = data.makeprediction(cas='f')

timeAndInj = dfinj[dfinj['num_inj'] > 0][['time','num_inj']]
timeAndFat = dffat[dffat['num_fat'] > 0][['time','num_fat']]
timeAndInjPath = outdir.joinpath('timeinj-national.csv')
timeAndFatPath = outdir.joinpath('timefat-national.csv')
timeAndInj.to_csv(timeAndInjPath, index=False)
timeAndFat.to_csv(timeAndFatPath, index=False)


## ****************************** ##
## Save the individual area files ##
# idf = dfinj.assign(category=dfinj['wfos'].str.split(',')).explode('category').reset_index(drop=True)
# idf = idf[idf['category'].notna()]

# fdf = dffat.assign(category=dffat['wfos'].str.split(',')).explode('category').reset_index(drop=True)
# fdf = fdf[fdf['category'].notna()]

# slist = idf['category'].unique().tolist()

# for thing in slist:
    
#     inj_thing = idf[idf['category'] == thing]
#     fat_thing = fdf[fdf['category'] == thing]
    
#     inj_thing = inj_thing.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)
#     fat_thing = fat_thing.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)

#     injfat_thing = pd.concat([inj_thing['num_inj'],fat_thing['num_fat']], axis=1)
    
#     indpath = outdir.joinpath(f'cas_{thing}.json')

#     injfat_thing.to_json(indpath)

addregions(dfinj,dffat,'states')
addregions(dfinj,dffat,'fema')
addregions(dfinj,dffat,'wfos')

dfinj_sum = dfinj.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)
dffat_sum = dffat.groupby('sim').sum().reindex(list(range(1,nsims+1)),fill_value=0)

dfinjfat = pd.concat([dfinj_sum['num_inj'],dffat_sum['num_fat']], axis=1)
dfinjfat.to_json(outfile)

# Save a simple json with outlook timestamp details
ts = f.name.split('.')[0]
tsjs = {
    'year': ts[0:4],
    'month': ts[4:6],
    'day': ts[6:8],
    'time': ts[8:12]
}

with open(outdir.joinpath('timestamp.json'), 'w') as out:
    json.dump(tsjs,out)

