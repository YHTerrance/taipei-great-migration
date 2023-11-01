#!/bin/bash

set -euxo pipefail

# Base URL
base_url="http://tcgmetro.blob.core.windows.net/stationod/%E8%87%BA%E5%8C%97%E6%8D%B7%E9%81%8B%E6%AF%8F%E6%97%A5%E5%88%86%E6%99%82%E5%90%84%E7%AB%99OD%E6%B5%81%E9%87%8F%E7%B5%B1%E8%A8%88%E8%B3%87%E6%96%99_"

# Download path
save_path="../data"

year="2023"

# Loop over the desired file numbers
for num in {9..9}
do
  # Pad single digit numbers with a leading zero
  padded_num=$(printf "%02d" $num)

  file="${year}${padded_num}"

  # Construct the full URL
  full_url="${base_url}${file}.csv"

  # Construct the output file name
  output_file="${save_path}/${file}.csv"

  # Use wget to download the file
  wget -O "${output_file}" "${full_url}"
done
