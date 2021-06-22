#!/usr/bin/env bash

# Env Vars
RUN_TIME=$1
CURRENT_DATE=`date -u +"%Y%m%d"`
NOMADS="https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr."${CURRENT_DATE}"/conus/"
WGET="/usr/local/bin/wget"
OUTDIR="/Users/josephpicca/projects/impacts/v2/cur-data/hrrr/"
PYTHON_UTIL="/Users/josephpicca/opt/anaconda3/envs/impacts-ml/bin/python"
MPI="/Users/josephpicca/opt/anaconda3/envs/impacts-ml/bin/mpirun"
DIR_ROOT="/Users/josephpicca/projects/impacts/v2"
CURDATA_DIR="/cur-data"
SCRIPT_DIR="/scripts"

# Determine which ftimes to download
if [[ "$RUN_TIME" -eq "00" ]]
then
    echo "Using 00z f times"
    F_TIMES=(12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35)
else
    echo "Using 12z f times"
    F_TIMES=(00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23)
fi

# Remove old files to make sure we're not running PAS on old HREF data
## *** Uncomment this section when ready to run in real time ***
#rm -r $OUTDIR"*"
find $OUTDIR -type f -name "*".grib2 -delete

for i in "${F_TIMES[@]}"
do
    FILEBASE="hrrr.t"$RUN_TIME"z.wrfnatf"$i".grib2"
    echo $FILEBASE 
    $WGET -O $OUTDIR$FILEBASE $NOMADS$FILEBASE
done

# Spin up a dask cluster & run script
$MPI -np 6 $PYTHON_UTIL $DIR_ROOT$SCRIPT_DIR"/py/processHRRR.py" -p $DIR_ROOT$CURDATA_DIR"/hrrr/*"
