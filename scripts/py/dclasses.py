import pathlib
import os
import glob
import random
import logging
from datetime import datetime
import json

import numpy as np
import pyproj
import xarray as xr
from scipy import interpolate as I
from scipy import stats
from skimage import measure

import metpy.calc as mpcalc
from metpy.units import units

from pygridder import pygridder as pgrid

path_root = os.path.dirname(__file__)

# For error logging since we're now adding a bunch of new / crazy stuff
logger = logging.getLogger(__name__)
f_handler = logging.FileHandler(f'{path_root}/log/{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
f_handler.setLevel(logging.ERROR)
f_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
f_handler.setFormatter(f_format)
logger.addHandler(f_handler)


_fips2state = {'01': 'AL', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
               '11': 'DC', '12': 'FL', '13': 'GA', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
               '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI',
               '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
               '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK',
               '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX',
               '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'}

_synthetic_tornado_fields = ["population", "distance", "rating", "states", 
        "counties", "wfos", "hospitals", "hospitalbeds", "mobileparks", 
        "mobilehomes", "psubstations", "plines", "time", "slon", "slat", "elon", "elat"]

class TornadoDistributions(object):
    def __init__(self):
        # Tornado Frequencies per unit Area
        self.f02 = stats.exponweib(56.14739, 0.28515, loc=0, scale=4.41615e-8)
        self.f05 = stats.exponweib(21.21447, 0.352119, loc=0, scale=6.13437e-7)
        self.f10 = stats.exponweib(4.931, 0.559246, loc=0, scale=1.3774e-5)
        self.f15 = stats.exponweib(4.9897, 0.581757, loc=0, scale=2.09688e-5)
        self.f30 = stats.exponweib(13.12425, 0.50321, loc=0, scale=1.73468e-5)

        # Tornado Rating Distributions
        self.r_nonsig = np.array([0.653056, 0.269221, 0.058293, 0.016052, 0.003378, 0])
        self.r_singlesig = np.array([0.460559, 0.381954, 0.119476, 0.031184, 0.006273, 0.000554])
        self.r_doublesig = np.array([0.3003, 0.363363, 0.168168, 0.09009, 0.063063, 0.015016])

        self.r_notorn = np.array([0.764045, 0.196629, 0.033708, 0.005618, 0, 0])
        # Experimental Triple Sig using rating dists from 27apr2011,11apr1965,3apr1974,
        # 31may1985,3may1999
        self.r_triplesig = np.array([0.187347, 0.250486, 0.170708, 0.167871, 0.193852, 0.029736])

        # Tornado Distance Distributions
        self.d_notorn = stats.exponweib(2.619664326, 0.4409500787, loc=0, scale=0.2740657129)
        self.d_nonsig = stats.exponweib(2.334887225, 0.436718339, loc=0, scale=0.4568290829)
        self.d_singlesig = stats.exponweib(2.03198642, 0.4986790369, loc=0, scale=1.2430926)
        self.d_doublesig = stats.exponweib(3.773715273, 0.3859052339, loc=0, scale=0.9866466004)
        self.d0 = stats.exponweib(1, 1, loc=0, scale=1.070527950949243)
        self.d1 = stats.exponweib(1, 1, loc=0, scale=2.711161913125773)
        self.d2 = stats.exponweib(1, 1, loc=0, scale=4.273788264405339)
        self.d3 = stats.exponweib(1, 1, loc=0, scale=5.8415587968313485)
        self.d4 = stats.exponweib(1, 1, loc=0, scale=7.156414869284822)
        self.d5 = stats.exponweib(1, 1, loc=0, scale=7.209804431404343)

class hrrrGrids(object):
    def __init__(self, hrrr_grids_path):
        self.stackpath = hrrr_grids_path.joinpath('stack4d.nc')
        self.polypath = hrrr_grids_path.joinpath('twotor.json')

        self.stack = xr.load_dataset(self.stackpath)
        try:
            self.gridder = pgrid.Gridder(self.stack.longitude.values - 360, self.stack.latitude.values)
            self.empty_grid = self.gridder.make_empty_grid().astype(float)
        except Exception as e:
            print('There was an error reading the HRRR stack.')
            logger.error(f'There was an error reading the HRRR stack. Perhaps it doesnt exist? More:\n{e}')

        self.twotorpolys = self._maskIndices(self.polypath)
        self.brm_grid = self._createBRMgrid()

    def _maskIndices(self,two_tor_path):

        # Read file
        with open(two_tor_path) as json_file:
            data = json.load(json_file)

        hrrr_lons, hrrr_lats = [], []
        for poly in data:
            hrrr_lons.append(poly['lon'])
            hrrr_lats.append(poly['lat'])

        # Use two tor shape to only calculated BRM in necessary grid boxes
        polys = self.gridder.grid_polygons(hrrr_lons,hrrr_lats)

        return polys
    
    def _createBRMgrid(self):
        _brm_stack = []

        for step in np.arange(24):

            _stepGrid = self.empty_grid.copy()
            _zip_list = [zip(x_idxs,y_idxs) for y_idxs,x_idxs in self.twotorpolys]

            for _idx_list in _zip_list:
                for x_idx,y_idx in _idx_list:
                    _column = self.stack.isel(x=x_idx,y=y_idx,step=step)

                    g = _column.gh * units.m
                    p = _column.pres * units.Pa
                    u = _column.u * units.mps
                    v = _column.v * units.mps

                    rm, lm, mean = mpcalc.bunkers_storm_motion(p, u, v, g)
        
                    _stepGrid[y_idx][x_idx] = mpcalc.wind_direction(rm[0],rm[1],convention='to').m

            _brm_stack.append(_stepGrid)

        return _brm_stack


class hrefGrids(object):
    def __init__(self, href_grids_root, otlk_time):
        self.otlk_time = otlk_time
        self.path = href_grids_root
        self.stack = self._createStack(self.otlk_time)

        try:
            self.gridder = pgrid.Gridder(self.stack.longitude.values,self.stack.latitude.values)
        except Exception as e:
            print('There was an error producing the HREF stack (perhaps there arent sufficient files')
            logger.error(f'There was an error producing the HREF stack (perhaps there arent sufficient files:\n{e}')
            

    def _getFiles(self,otlk_time):

        # Use the 00z HREF grids for these outlooks
        if otlk_time in ['1200','1300']:

            _file_path = self.path.joinpath('href_cal_tor.t00z*grib2')
            _sorted = sorted(glob.glob(str(_file_path)))
            
            # Check to make sure we have 21 files (21 is correct number of href files for period)
            if len(_sorted) == 21:
                print('21 href files available')

                return _sorted
            else:
                return []

        # Use the 12z HREF grids for these outlooks

        if otlk_time in ['1630','2000','0100']:

            _file_path = self.path.joinpath('href_cal_tor.t12z*grib2')
            _sorted = sorted(glob.glob(str(_file_path)))

            if len(_sorted) == 21:
                print('21 href files available')

                # Have to remove times before outlook issuance
                if otlk_time == '1630':
                    del _sorted[0:5]
                elif otlk_time == '2000':
                    del _sorted[0:9]
                else:
                    del _sorted[0:14]

                return _sorted
            else:
                return []

    def _createStack(self,otlk_time):
        
        _files = self._getFiles(otlk_time)
        
        # Stop stack creation if we don't have the correct number of files
        if not _files:
            return False

        _da_list = [xr.load_dataset(file,engine='cfgrib',backend_kwargs={'indexpath': ''}).torprob for file in _files]
        _da_merged = xr.concat(_da_list, "validtime")
        
        # probably need try/except logic to protect against xarray issues and return gracefully
        # without timing data

        return _da_merged

    @property
    def norm_grid(self):
        _probsum = self.stack.sum(dim='validtime')
        return self.stack / _probsum

class ImpactGrids(object):
    def __init__(self, impacts_grids_root):
        impacts_grids_file = impacts_grids_root.joinpath("impact-grids.npz")
        with np.load(impacts_grids_file) as NPZ:
            self.population = NPZ["population"]
            self.proj = pyproj.Proj(NPZ["srs"].item())
            self.geod = pyproj.Geod(f'{self.proj} +a=6371200 +b=6371200')
            #self.geod = pyproj.Geod(NPZ["srs"].item())
            #self.geod = pyproj.Geod(self.proj.srs)
            self.lons = NPZ["lons"]
            self.lats = NPZ["lats"]
            self.X = NPZ["X"]
            self.Y = NPZ["Y"]
            self.dx = NPZ["dx"]
            self.dy = NPZ["dy"]
            self.state = NPZ["state"]
            self.county = NPZ["county"]
            
            # Workaround for loading the corrected wfo file, while keeping from having projection errors (still unsure why these happen with pyproj)
            #self.wfo = NPZ["wfo"]
            self.wfo = np.load(pathlib.Path(f'{impacts_grids_root}/cwas.npz'))['cwas']
            self.hospitals = NPZ["hospitals"]
            self.hospitalbeds = NPZ["hbeds"]
            self.mobilehomes = NPZ["mhomes"]
            self.mobileparks = NPZ["mparks"]
            self.psubstations = NPZ["pstations"]
            self.plines = NPZ["plines"]
        self._lons1d = self.lons.ravel()
        self._lats1d = self.lats.ravel()
        self._x1d = self.X.ravel()
        self._y1d = self.Y.ravel()
        self.grid_cell_area = self.dx * self.dy
        self.grid_cell_area_kmsq = self.grid_cell_area / 1000**2
        self.gridder = pgrid.Gridder(tx=self.X, ty=self.Y, dx=max(self.dx, self.dy))


class SyntheticTornado(object):
    def __init__(self, slon, slat, elon, elat, population, distance, rating, states, counties, wfos, hospitals,
                 hospitalbeds, mobileparks, mobilehomes, psubstations, plines, time, loc_precision=4):
        self.slon = round(slon, loc_precision)
        self.slat = round(slat, loc_precision)
        self.elon = round(elon, loc_precision)
        self.elat = round(elat, loc_precision)
        self.population = population
        self.distance = round(distance, loc_precision)
        self.rating = rating
        self.states = ",".join(_fips2state["{:02d}".format(s)] for s in states if s not in [0])
        self.counties = ",".join(["{:5d}".format(s) for s in counties if s not in [0]])
        self.wfos = ",".join(["{:s}".format(s) for s in wfos if s not in [0, "0"]])
        self.hospitals = hospitals
        self.hospitalbeds = hospitalbeds
        self.mobileparks = mobileparks
        self.mobilehomes = mobilehomes
        self.psubstations = psubstations
        self.plines = plines
        self.time = time

    @property
    def headers(self):
        return _synthetic_tornado_fields

    @property
    def values(self):
        vals = [self.__dict__[header] for header in self.headers]
        return vals

    @property
    def __geo_interface__(self):
        props = {h:v for h,v in zip(self.headers, self.values) if h not in ["slon", "slat", "elon", "elat"]}
        coords = [(self.slon, self.slat), (self.elon, self.elat)]
        base = {"type": "LineString", "coordinates": tuple(coords)}
        return {"type": "Feature", "geometry": base, "properties": props}


class SyntheticTornadoRealization(object):
    def __getitem__(self, idx):
        return self.tornadoes[idx]

    def __init__(self, tornadoes, number):
        self.sim_number = number
        self.tornadoes = tornadoes
        self.number_of_tornadoes = sum(1 for s in self.tornadoes)
        self.population = sum(s.population for s in self.tornadoes)
        self.hospitals = sum(s.hospitals for s in self.tornadoes)
        self.hospitalbeds = sum(s.hospitalbeds for s in self.tornadoes)
        self.mobileparks = sum(s.mobileparks for s in self.tornadoes)
        self.mobilehomes = sum(s.mobilehomes for s in self.tornadoes)
        self.psubstations = sum(s.psubstations for s in self.tornadoes)
        self.plines = sum(s.plines for s in self.tornadoes)

    @property
    def __geo_interface__(self):
        return {"type": "FeatureCollection", "features": [s.__geo_interface__ for s in self]}


class Realizations(object):
    def __getitem__(self, idx):
        return self.realizations[idx]

    def __init__(self, realizations):
        self.realizations = realizations

    @property
    def as_psv(self):
        header = f"sim|{'|'.join(_synthetic_tornado_fields)}"
        values = []
        for realization in self:
            for st in realization:
                v = ("|".join(str(v) for v in st.values))
                values.append(f"{str(realization.sim_number)}|{v}")
        values = "\n".join(values)
        return f"{header}\n{values}"


def get_distances(ratings, distribution):
    dists = np.zeros(ratings.shape, dtype=float)
    f0 = ratings == 0
    f1 = ratings == 1
    f2 = ratings == 2
    f3 = ratings == 3
    f4 = ratings == 4
    f5 = ratings == 5
    dists[f0] = distribution.d0.rvs(size=f0.sum())
    dists[f1] = distribution.d1.rvs(size=f1.sum())
    dists[f2] = distribution.d2.rvs(size=f2.sum())
    dists[f3] = distribution.d3.rvs(size=f3.sum())
    dists[f4] = distribution.d4.rvs(size=f4.sum())
    dists[f5] = distribution.d5.rvs(size=f5.sum())
    return dists


def simulate(inds, dists, ratings, direction, igrids, hgrids, hrgrids):
    if inds.shape[0] < 1:
        return []
    slons = igrids._lons1d[inds]
    slats = igrids._lats1d[inds]
    slons += np.random.uniform(-0.05, 0.05, size=slons.shape[0])
    slats += np.random.uniform(-0.05, 0.05, size=slats.shape[0])

    # Tornado time processing
    # If we can't produce the normalized grid, 
    try:
        norm_h = hgrids.norm_grid
    except Exception as e:

        # log the error to file
        logger.error(f'There was an error producing the normalized grid:\n{e}')

        # Set all tor times to a missing value
        tor_times = np.ones(len(idxs))*-9999
    else:
        norm_h_mask = np.ma.masked_invalid(norm_h)
        h_idxs = hgrids.gridder.grid_points(slons + 360, slats)
        norm_list = [norm_h[:,h_idx[0],h_idx[1]].values for h_idx in h_idxs]
        zippedIdxProb = zip(h_idxs,norm_list)
        fixed_list = [listFix(prob_list,norm_h_mask,h_idx) if np.ma.masked_invalid(prob_list).all() is np.ma.masked else prob_list for h_idx, prob_list in zippedIdxProb]
        tor_times = [pickTime(prob_list) for prob_list in fixed_list]

    # Insert new direction calculation
    # Use slon/slat to find grid box of the brm_grid and place into dirs variable

    hr_idxs = hrgrids.gridder.grid_points(slons, slats)
    brm_time_idx = np.array(tor_times) - 12
    brm_dirs = [hrgrids.brm_grid[brm_time_idx[i]][hr_idx[0]][hr_idx[1]] \
        for i, hr_idx in enumerate(hr_idxs)]

    # Add 10 degree random variation to the directions
    brm_dirs = brm_dirs + np.random.uniform(-10,10,len(brm_dirs))

    #dirs = direction.rvs(inds.shape[0])
    dists_meters = dists * 1609.34
    # elons, elats, _ = igrids.geod.fwd(slons, slats, dirs, dists_meters)
    elons, elats, _ = igrids.geod.fwd(slons, slats, brm_dirs, dists_meters)
    x1s, y1s = igrids.proj(slons, slats)
    x2s, y2s = igrids.proj(elons, elats)
    idxs = igrids.gridder.grid_lines(x1s, y1s, x2s, y2s)

    return [SyntheticTornado(slons[i], slats[i], elons[i], elats[i], int(igrids.population[idx].sum()),
                             float(dists[i]), int(ratings[i]), np.unique(
                                 igrids.state[idx]).tolist(),
                             np.unique(igrids.county[idx]).tolist(), np.unique(
                                 igrids.wfo[idx]).tolist(),
                             int(igrids.hospitals[idx].sum()), int(
                                 igrids.hospitalbeds[idx].sum()),
                             int(igrids.mobileparks[idx].sum()), int(
                                 igrids.mobilehomes[idx].sum()),
                             int(igrids.psubstations[idx].sum()), int(igrids.plines[idx].sum()),
                             tor_times[i])
            for i, idx in enumerate(idxs)]

def listFix(prob_list, norm_h_mask, h_idx):

    y,x = h_idx
    search = np.ma.masked_invalid(prob_list)
    i=1

    while search.all() is np.ma.masked:
        i += 1
        search = norm_h_mask[:,y-i:y+i,x-i:x+i] 

    # Get position of nonzero unmasked elements once the while loop finishes
    _, y_pos, x_pos = search.nonzero()

    # Get unique y,x pairs where we have valid href data along time axis
    unique_pairs = np.unique(np.dstack((y_pos,x_pos)),axis=1)

    # Initialize an array to sum our unique href prob lists
    validtime_len = len(prob_list)
    sum_array = np.zeros(validtime_len)

    # Get the number of unique lists so that we can create an average
    numberUnique = len(unique_pairs[0])

    # Add the unique lists
    for pair in unique_pairs[0]:
        sum_array += search[:,pair[0],pair[1]]

    # Get the average of the unique lists
    prob_list = sum_array / numberUnique

    return prob_list

def pickTime(prob_list):

    validtime_len = len(prob_list)

    # Ensure any small rounding errors are "smoothed over" prior to random choosing
    # Add/subtract the minor difference to the top prob
    if np.sum(prob_list) != 0:
        diff = 1 - np.sum(prob_list)
        n = np.argmax(prob_list)
        prob_list[n] = prob_list[n] + diff

    # Get time bucket
    time_bucket = np.random.choice(np.arange(validtime_len), size=1,replace=True, p=prob_list)[0]

    # Time bucket ( 0: 12-16Z, 1: 13-17Z, 2: 14-18Z ... 21: 8-12Z )
    # random 4 to choose a random hour in the 4 hour range
    start_hour = 36 - validtime_len
    spec_time = start_hour + time_bucket - random.randrange(4)
    if spec_time > 23:
        spec_time = spec_time - 24

    return spec_time


def make_continuous(probs):
    vals = [1, 2, 5, 10, 15, 30, 45, 60]
    continuous = np.zeros_like(probs)
    contours = [measure.find_contours(probs, v-1e-10) for v in vals]
    for tcontours, val in zip(contours, vals):
        for contour in tcontours:
            x, y = zip(*contour.astype(int))
            continuous[x, y] = val
    continuous = interpolate(continuous).astype(int, copy=False)
    continuous[probs < vals[0]] = 0
    return continuous


def interpolate(image):
    valid_mask = image > 0
    coords = np.array(np.nonzero(valid_mask)).T
    values = image[valid_mask]
    INTERP = I.LinearNDInterpolator(coords, values, fill_value=0)
    new_image = INTERP(list(np.ndindex(image.shape))).reshape(image.shape)
    return new_image


def weighted_choice(prob, probs, cprobs, size):
    weights = np.ma.asanyarray(cprobs[:])
    if prob >= 30:
        weights[probs < prob] = np.ma.masked
    elif prob <= 2:
        weights[probs > prob] = np.ma.masked
        # Edit to mask probs == 0
        # Edited again to adjust to <= 0 [grib files have -1, so == did not filter these out, and it *appears* to be
        # the source of our gridding issues.]
        weights[probs <= 0] = np.ma.masked
    else:
        weights[probs != prob] = np.ma.masked
    cumulative_weights = weights.cumsum()
    if np.ma.is_masked(cumulative_weights.max()):
        locs = []
    else:
        _locs = np.random.randint(
            cumulative_weights.min(), cumulative_weights.max(), size=size)
        locs = cumulative_weights.searchsorted(_locs)
    return locs


def flatten_list(_list):
    return np.array([item for sublist in _list for item in sublist])
