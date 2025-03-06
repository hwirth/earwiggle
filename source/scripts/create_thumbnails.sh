#!/bin/bash

# Quality 1..100, 90: Pretty good
THUMB_WIDTH=64
THUMB_QUALITY=85

COVER_WIDTH=352    # 8px less than --audio-width
COVER_QUALITY=85

if [ "$1" == "-o" ]; then
	rm ../thumbnails/*.jpg
	rm ../covers/*.jpg
fi

for image in ../fullsize/*; do
	if [ -f "$image" ]; then
		filename=$(basename "$image")
		output="../thumbnails/${filename%.*}.jpg"
		if [ -f "$output" ]; then
			echo "Already exists: $image"
		else
			echo "Resizing $image to $output"
			filename="${image%.*}"
			magick "$image" -resize "${THUMB_WIDTH}x" -quality $THUMB_QUALITY -strip "$output"
		fi
	fi
done

for image in ../fullsize/*; do
	if [ -f "$image" ]; then
		filename=$(basename "$image")
		output="../covers/${filename%.*}.jpg"
		if [ -f "$output" ]; then
			echo "Already exists: $image"
		else
			echo "Resizing $image to $output"
			filename="${image%.*}"
			magick "$image" -resize "${COVER_WIDTH}x" -quality $COVER_QUALITY -strip "$output"
		fi
	fi
done
