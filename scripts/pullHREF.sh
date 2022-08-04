#!/usr/bin/env bash

# Env Vars
RUN_TIME=$1
CURRENT_DATE=`date -u +"%Y%m%d"`
NOMADS="https://nomads.ncep.noaa.gov/pub/data/nccf/com/spc_post/prod/spc_post."${CURRENT_DATE}"/severe/"
WGET="/usr/local/bin/wget"
OUTDIR="/Users/josephpicca/projects/impacts/v3/data/cur-data/href/"

# Determine which ftimes to download
if [[ "$RUN_TIME" -eq "00" ]]
then
    echo "Using 00z f times"
    F_TIMES=(16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36)
else
    echo "Using 12z f times"
    F_TIMES=(04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24)
fi

# Make sure a day was given as an argument
if [[ -z "$RUN_TIME" ]]; then
    echo "Must provide RUN_TIME argument (either 00 or 12)"
    exit 1
fi

# Remove old files to make sure we're not running PAS on old HREF data
# rm $OUTDIR"/*"
find $OUTDIR -type f -name "*".grib2 -delete

for i in "${F_TIMES[@]}"
do
    FILEBASE="href_cal_tor.t"$RUN_TIME"z.4hr.f0"$i".grib2"
    echo $FILEBASE 
    $WGET -O $OUTDIR$FILEBASE $NOMADS$FILEBASE
done