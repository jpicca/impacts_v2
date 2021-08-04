import pathlib

import numpy as np
import pyproj
from scipy import interpolate as I
from scipy import stats
from skimage import measure

from pygridder import pygridder as pgrid

path_root = '/Users/josephpicca/projects/impacts/dev/impacts-app/scripts/'


_fips2state = {'01': 'AL', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
               '11': 'DC', '12': 'FL', '13': 'GA', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
               '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI',
               '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
               '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK',
               '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX',
               '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'}

_synthetic_tornado_fields = ["population", "distance", "rating", "states", 
        "counties", "wfos", "hospitals", "hospitalbeds", "mobileparks", 
        "mobilehomes", "psubstations", "plines", "slon", "slat", "elon", "elat"]

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
            self.wfo = np.load(pathlib.Path(f'{path_root}impacts-data/pas-input-data/cwas.npz'))['cwas']
            self.hospitals = NPZ["hospitals"]
            self.hospitalbeds = NPZ["hbeds"]
            self.mobilehomes = NPZ["mhomes"]
            self.mobileparks = NPZ["mparks"]
            self.psubstations = NPZ["pstations"]
            self.plines = NPZ["plines"]
            self.schools = NPZ["schools"]
        self._lons1d = self.lons.ravel()
        self._lats1d = self.lats.ravel()
        self._x1d = self.X.ravel()
        self._y1d = self.Y.ravel()
        self.grid_cell_area = self.dx * self.dy
        self.grid_cell_area_kmsq = self.grid_cell_area / 1000**2
        self.gridder = pgrid.Gridder(tx=self.X, ty=self.Y, dx=max(self.dx, self.dy))


class SyntheticTornado(object):
    def __init__(self, slon, slat, elon, elat, population, distance, rating, states, counties, wfos, hospitals,
                 hospitalbeds, mobileparks, mobilehomes, psubstations, plines, loc_precision=4):
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


def simulate(inds, dists, ratings, direction, igrids):
    if inds.shape[0] < 1:
        return []
    slons = igrids._lons1d[inds]
    slats = igrids._lats1d[inds]
    slons += np.random.uniform(-0.05, 0.05, size=slons.shape[0])
    slats += np.random.uniform(-0.05, 0.05, size=slats.shape[0])
    dirs = direction.rvs(inds.shape[0])
    dists_meters = dists * 1609.34
    elons, elats, _ = igrids.geod.fwd(slons, slats, dirs, dists_meters)
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
                             int(igrids.psubstations[idx].sum()), int(igrids.plines[idx].sum()))
            for i, idx in enumerate(idxs)]


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
