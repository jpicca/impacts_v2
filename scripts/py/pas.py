import argparse
import datetime
import gzip
import pathlib
from os import environ as E
import os
# from poplib import POP3_PORT
from log import pasLogger
import sys

import geojson
import numpy as np
import pyproj
from scipy import stats

import dclasses as dc
import pygrib as pg

### CLI Parser ###
file_help = "The NDFD file to use as a probability grid."
ftype_help = "If we're using a grib file or an npz file"
time_help = "The time of the outlook (not issuance time, but the 1200, 1630, etc time)"
area_help = "The area of a single NDFD grid cell (in kilometers)."
nsim_help = "The number of simulations to run. Default is 10,000."
tdir_help = "The mean storm direction. Used as bandwidth to normal distribution. Default is 50 degrees."
tstm_help = "Boolean flag to determine whether to extend tornado probabilities to thunder line. Default is False."
cool_help = "A list of months (digit) corresponding to what the coolseason should be. Default is [1,2,3,4,11,12]."
ipth_help = "Path to the Impacts Data Root. If not provided, check for environment variable."
tsig_help = "Boolean to incorporate triple sig rating distribution. If not provided, it is not used."
href_help = "Path to href grids to be used for timing guidance."
hrrr_help = "Path to hrrr formatted grids to be used for movement guidance."
tsdenom_help = "The denominator (1/n) for how often to sample the triple sig distribution (instead of the double sig). Default is 15 (triple sig sampled approx 6.67 percent of the time)"

parser = argparse.ArgumentParser()
parser.add_argument("-f", "--file", required=True, help=file_help)
parser.add_argument("-t", "--time", required=True, help=time_help)
parser.add_argument("-ig", "--isgrib", required=False, default=True, help=ftype_help)
parser.add_argument("-a", "--area", required=False, default=25, help=area_help)
parser.add_argument("-n", "--nsims", required=False, default=10000, type=int, help=nsim_help)
parser.add_argument("-d", "--direction", required=False, default=50, type=float, help=tdir_help)
parser.add_argument("-c", "--cat", required=False, default=False, type=bool, help=tstm_help)
parser.add_argument("-p", "--path", type=str, required=False, default=None, help=ipth_help)
parser.add_argument("-hr", "--href", type=str, required=True, help=href_help)
parser.add_argument("-hrr", "--hrrr", type=str, required=True, help=hrrr_help)
parser.add_argument("-cs", "--coolseason", required=False, default=[1, 2, 3, 4, 11, 12], nargs="+",
                    type=int, help=cool_help)
parser.add_argument("-ts", "--triplesig", required=False, default=False, help=tsig_help)
parser.add_argument("-td", "--tsdenom", required=False, default=15, type=int, help=tsdenom_help)
args = parser.parse_args()

### Parse CLI Arguments ###
ndfd_file = pathlib.Path(args.file)
ndfd_area = args.area
nsims = args.nsims
otlk_time = args.time
tornado_direction_distribution = stats.norm(args.direction, 15)
coolseason = args.coolseason
useTriple = args.triplesig
tsDenom = args.tsdenom

if args.path is None:
    impacts_data_root = pathlib.Path(E["IMPACTSDATA"], "pas-input-data").expanduser().resolve()
else:
    impacts_data_root = pathlib.Path(args.path, "pas-input-data").resolve()

href_grids_root = pathlib.Path(args.href)
hrrr_grids_root = pathlib.Path(args.hrrr)

outdir = pathlib.Path(args.path,"output").resolve()
outdir.mkdir(exist_ok=True)

# Read grib file
def read_ndfd_grib_file(grbfile):
    """ Read an SPC Outlook NDFD Grib2 File """
    with pg.open(grbfile.as_posix()) as GRB:
        try:
            vals = GRB[1].values.filled(-1)
        except AttributeError:
            vals = GRB[1].values
    return vals



# Set up out path/file
#outfile = outdir.joinpath('sims.psv.gz')

### Setup Simulation ###
# Determine Date/Time of outlook from filename
if int(args.isgrib):
    date_in_name = ndfd_file.name.split("_")[-1]
    dt = datetime.datetime.strptime(date_in_name, "%Y%m%d%H%M%S")
    outfile = outdir.joinpath(f"{dt.strftime('%Y%m%d%H%M%S')}.psv.gz")

    # Read Tornado File; Extend to thunder (if chosen) and create continuous grid
    torn = read_ndfd_grib_file(ndfd_file)

    # Read Tornado File; Extend to thunder (if chosen) and create continuous grid
    torn = read_ndfd_grib_file(ndfd_file)
    if args.cat:
        cat = read_ndfd_grib_file(ndfd_file.with_name(ndfd_file.name.replace("torn", "cat")))
        cat[cat > 0] = 1
        torn[torn < 2] = cat[torn < 2]
    try:
        continuous_torn = dc.make_continuous(torn)
    except ValueError:
        import sys
        if torn.max() == 0:
            with gzip.GzipFile(outfile, "w") as OUT:
                OUT.write("".encode())
            sys.exit(0)
        else:
            print("There was an uncaught error converting to continuous probabilities. Exiting...")
            sys.exit(1)

    # Read/Create Single and Double Sig Grids
    sigtorn = read_ndfd_grib_file(ndfd_file.with_name(ndfd_file.name.replace("torn", "sigtorn"))).astype(int)

# If we're using an npz file
else:
    print('Using the npz file!')
    date_in_name=ndfd_file.name.split("_")[2]
    dt = datetime.datetime.strptime(date_in_name, "%Y%m%d%H%M%S")
    outfile = outdir.joinpath(f"{dt.strftime('%Y%m%d%H%M%S')}.psv.gz")

    # Load npz file
    outlook_grids = np.load(ndfd_file)
    torn = outlook_grids['torn']
    try:
        continuous_torn = dc.make_continuous(torn)
    except ValueError:
        import sys
        if torn.max() == 0:
            with gzip.GzipFile(outfile, "w") as OUT:
                OUT.write("".encode())
            sys.exit(0)
        else:
            print("There was an uncaught error converting to continuous probabilities. Exiting...")
            sys.exit(1)

    sigtorn = outlook_grids['sigtorn'].astype(int)


sigtorn[sigtorn > 0] = 1
if (torn.max() >= 30) and (sigtorn.max() > 0):
    sigtorn[torn >= 15] += 1
sigtorn_1d = sigtorn.ravel()
usesig = True if (dt.month in coolseason) or (sigtorn.max() > 0) else False

### Run Tornado Count Simulation ###
print(f"Running {nsims:,d} Tornado Count Simulations")
tornado_dists = dc.TornadoDistributions()
counts = np.zeros((5, nsims), dtype=int)
counts[0, :] = (tornado_dists.f02.rvs(nsims) * ndfd_area * (torn == 2).sum()).astype(int)
counts[1, :] = (tornado_dists.f05.rvs(nsims) * ndfd_area * (torn == 5).sum()).astype(int)
counts[2, :] = (tornado_dists.f10.rvs(nsims) * ndfd_area * (torn == 10).sum()).astype(int)
counts[3, :] = (tornado_dists.f15.rvs(nsims) * ndfd_area * (torn == 15).sum()).astype(int)
counts[4, :] = (tornado_dists.f30.rvs(nsims) * ndfd_area * (torn >= 30).sum()).astype(int)

### Setup Impact Simulation ###
igrids = dc.ImpactGrids(impacts_data_root)

### Prep HREF data and get norm grid
hgrids = dc.hrefGrids(href_grids_root, otlk_time)

### Read in HRRR stack and setup BRM grid
hrgrids = dc.hrrrGrids(hrrr_grids_root)

scounts = counts.sum(axis=1)
inds02 = dc.weighted_choice(prob=2, probs=torn, cprobs=continuous_torn, size=scounts[0])
inds05 = dc.weighted_choice(prob=5, probs=torn, cprobs=continuous_torn, size=scounts[1])
inds10 = dc.weighted_choice(prob=10, probs=torn, cprobs=continuous_torn, size=scounts[2])
inds15 = dc.weighted_choice(prob=15, probs=torn, cprobs=continuous_torn, size=scounts[3])
inds30 = dc.weighted_choice(prob=30, probs=torn, cprobs=continuous_torn, size=scounts[4])
inds = dc.flatten_list([inds02, inds05, inds10, inds15, inds30])

non_sig_inds = sigtorn_1d[inds] == 0
single_sig_inds = sigtorn_1d[inds] == 1
double_sig_inds = sigtorn_1d[inds] == 2

if usesig:
    single_sig_inds += non_sig_inds
    non_sig_inds[:] = False
        
# Handle Locations
non_sig_loc_inds = inds[non_sig_inds]
single_sig_loc_inds = inds[single_sig_inds]
double_sig_loc_inds = inds[double_sig_inds]

# Handle Ratings
_mags=[0, 1, 2, 3, 4, 5]
non_sig_ratings = np.random.choice(_mags, size=non_sig_inds.sum(),
                                    replace=True, p=tornado_dists.r_nonsig)
single_sig_ratings = np.random.choice(_mags, size=single_sig_inds.sum(),
                                        replace=True, p=tornado_dists.r_singlesig)

# Logic for how to handle double_sig (and triple_sig)
# Need to take a command line arg if we're using triple sig (and possible weight)

if useTriple:
    adj_dist = ((tsDenom-1)*tornado_dists.r_doublesig + tornado_dists.r_triplesig) / tsDenom
    double_sig_ratings = np.random.choice(_mags, size=double_sig_inds.sum(),
                                            replace=True, p=adj_dist)
else:
    double_sig_ratings = np.random.choice(_mags, size=double_sig_inds.sum(),
                                            replace=True, p=tornado_dists.r_doublesig)

# Handle Distances
non_sig_distances = dc.get_distances(non_sig_ratings, tornado_dists)
single_sig_distances = dc.get_distances(single_sig_ratings, tornado_dists)
double_sig_distances = dc.get_distances(double_sig_ratings, tornado_dists)

#print("Running simulations...")
#print("    Non Sig...")
non_sig = dc.simulate(non_sig_loc_inds, non_sig_distances,
                        non_sig_ratings, tornado_direction_distribution, igrids, hgrids, hrgrids)
#print("    Single Sig...")
single_sig = dc.simulate(single_sig_loc_inds, single_sig_distances,
                            single_sig_ratings, tornado_direction_distribution, igrids, hgrids, hrgrids)
#print("    Double Sig...")
double_sig = dc.simulate(double_sig_loc_inds, double_sig_distances,
                            double_sig_ratings, tornado_direction_distribution, igrids, hgrids, hrgrids)

#print("Splitting simulations back out...")
simulated_tornadoes = dc.flatten_list([non_sig, single_sig, double_sig])
np.random.shuffle(simulated_tornadoes)
_sims = np.split(simulated_tornadoes, counts.sum(axis=0).cumsum())[:-1]
realizations = dc.Realizations([dc.SyntheticTornadoRealization(_sim, i+1) for i, _sim in enumerate(_sims)])

#print("Writing Out gzipped PSV file...")
with gzip.GzipFile(outfile, "w") as OUT:
    OUT.write(realizations.as_psv.encode())

print("Script ran successfully!")

