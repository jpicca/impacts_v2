from glob import glob
import xarray as xr
import argparse

import metpy.calc as mpcalc
from metpy.units import units

from dask_mpi import initialize
initialize(nthreads=1,memory_limit='4G')

import multiprocessing.popen_spawn_posix
from distributed import Client
import dask
client = Client()

# ~~~~~~~~~~ #

### CLI Parser ###
path_help = "The path to the native HRRR files."
parser = argparse.ArgumentParser()
parser.add_argument("-p", "--path", required=True, help=path_help)

### Parse CLI Arguments ###
args = parser.parse_args()
hrrr_path = args.path

# ~~~~~~~~~~ #

# Global vars
names = ['Pressure','Geopotential Height','U component of wind','V component of wind']
files = sorted(glob(f'{hrrr_path}/*'))

# Function to pull needed variables
def pullVar(file,var):

    fbk = {'typeOfLevel': 'hybrid', 'name': var}
    
    ds = xr.open_dataset(file,engine='cfgrib', \
                     backend_kwargs={'filter_by_keys': fbk, \
                         'indexpath': ''}).coarsen(dim={'x': 10,'y': 10},boundary='pad').mean()
    
    return ds

merged_list = []

for file in files:
    
    print(f'**File: {file}')

    das_pre = []
    
    # Function to pull 
    for var in names:
        
        das_pre.append(dask.delayed(pullVar)(file,var))
        
    das_post = dask.compute(das_pre)[0]
    
    p = das_post[0] * units.hPa
    h = das_post[1] * units.m
    u = das_post[2] * units.mps
    v = das_post[3] * units.mps
    
    allVar = xr.merge([p,h,u,v])
    
    merged_list.append(allVar)
    
varGrid = xr.concat(merged_list,dim='step')

varGrid.to_netcdf(f'{hrrr_path}/../hrrr-stack/stack4d.nc')