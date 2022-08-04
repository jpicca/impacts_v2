#!/usr/bin/env bash

# This script downloads necessary data, runs the PAS script

# Env Vars
N_SIMS=10000
DAY=$1
SHAPE_URL="https://www.spc.noaa.gov/products/outlook/day"$DAY"otlk-shp.zip"
GRIB=0

# Get some runtime metadata
CURRENT_DATE=`date -u +"%Y%m%d"`
CURRENT_TIME=`date -u +"%H%M"`
echo "Today's date is... ${CURRENT_DATE}"
echo "The time is... ${CURRENT_TIME}"

# Script environment setup
DIR_ROOT="/Users/josephpicca/projects/impacts/v3"
PYTHON="/Users/josephpicca/opt/anaconda3/envs/impacts-prod-parallel/bin/python"
PYTHON_UTIL="/Users/josephpicca/opt/anaconda3/envs/impacts-ml/bin/python"
PYTHON_INJFAT="/Users/josephpicca/opt/anaconda3/envs/impacts-injfat/bin/python"
WGET="/usr/local/bin/wget"
SCRIPT_DIR="/scripts"
CURDATA_DIR="/data/cur-data"
PAS_SCRIPT=$SCRIPT_DIR"/py/pas.py"
NPZ_SCRIPT=$SCRIPT_DIR"/py/processNPZ.py"
STA_SCRIPT=$SCRIPT_DIR"/py/makestats.py"
IMPACTS_DATA=$DIR_ROOT$SCRIPT_DIR"/impacts-data/"
HREF=$DIR_ROOT$CURDATA_DIR"/href/"
HRRR=$DIR_ROOT$CURDATA_DIR"/hrrr-stack/"
OUTLOOK_NPZ=$DIR_ROOT$CURDATA_DIR"/outlooks-npz"

###########################################
## ** USE THIS BLOCK FOR CURRENT DATE ** ##
###########################################

# Make sure a day was given as an argument
if [[ -z "$DAY" ]]; then
    echo "Must provide DAY as argument (almost certainly 1)"
    exit 1
fi

# Get shapefile.zip and geojson
#$WGET -O $DIR_ROOT$CURDATA_DIR"/outlooks-shp/day"$DAY"_shapefile.zip" $SHAPE_URL
#$WGET -O $DIR_ROOT$CURDATA_DIR"/geojson/day"$DAY".geojson" "https://www.spc.noaa.gov/products/outlook/day"$DAY"otlk_torn.nolyr.geojson"

# # Copy the geojson to the web folder for plotting
#cp $DIR_ROOT$CURDATA_DIR"/geojson/day"$DAY".geojson" $DIR_ROOT"/web/includes/geo/day"$DAY"_torn.geojson"

# echo "*** Running the shapefile to npz script ***"
#$PYTHON $DIR_ROOT$NPZ_SCRIPT -p $IMPACTS_DATA -d $DAY -g

OTLK_FILE=`find $OUTLOOK_NPZ -maxdepth 1 -type f -name "day"$DAY"*" | xargs stat -f '%c %N' | sort -r | head -1 | sed 's/.* //'`
filename=`basename $OTLK_FILE`
IFS="_" read -ra FILE_ARR <<< "$filename"
OUTLOOK_TIME=${FILE_ARR[1]}
OUTLOOK_TS=${FILE_ARR[2]}

echo $OUTLOOK_TS

# # Run PAS
# echo "***Running PAS script***"
# $PYTHON $DIR_ROOT$PAS_SCRIPT -f $OTLK_FILE -n $N_SIMS -p $IMPACTS_DATA -hr $HREF -hrr $HRRR -t $OUTLOOK_TIME -ig $GRIB

# Run the stat maker
echo "***Post processing PAS output for web viz tornado stats..."
$PYTHON $DIR_ROOT$STA_SCRIPT -f $IMPACTS_DATA"/output/"$OUTLOOK_TS".psv.gz" -r $DIR_ROOT$SCRIPT_DIR -d $DAY

## After running PAS, need a script to calculate estimate injuries and fatalities