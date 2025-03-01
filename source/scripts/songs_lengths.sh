#!/bin/bash

for filename in ../music/*; do
	#duration=$(ffmpeg -i $filename 2>&1 | grep "Duration" | awk '{print $2}' | tr -d ,)
	#echo "$duration: " $(basename "$filename")
	mediainfo --Output=Audio "$filename" | grep -e Complete -e Duration
done
