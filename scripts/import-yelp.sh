#!/bin/sh
set -eu

# Validate every source before writing to MongoDB. Files use JSON Lines.
for source in business review user tip checkin; do
  if [ ! -f "/dataset/yelp_academic_dataset_${source}.json" ]; then
    echo "Missing /dataset/yelp_academic_dataset_${source}.json. Set YELP_DATA_DIR in .env." >&2
    exit 1
  fi
done

# Refuse repeated imports: tips/checkins have no stable unique source ID.
for collection in businesses reviews users tips checkins; do
  count=$(mongosh "mongodb://mongo:27017/$MONGODB_DB" --quiet --eval "db.getCollection('$collection').countDocuments({}, {limit: 1})")
  if [ "$count" != "0" ]; then
    echo "Collection $collection is not empty; import cancelled to avoid duplicates." >&2
    exit 1
  fi
done

for mapping in business:businesses review:reviews user:users tip:tips checkin:checkins; do
  source=${mapping%%:*}
  collection=${mapping#*:}
  mongoimport --uri="mongodb://mongo:27017" --db="$MONGODB_DB" \
    --collection="$collection" --file="/dataset/yelp_academic_dataset_${source}.json" \
    --stopOnError
done
