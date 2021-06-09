#!/bin/bash

set -e

vendorName=$1
vendorBucket=$2
queueUrl=$3

file=$(uuidgen).txt
echo "Creating temp file: $file"

openssl rand -base64 200 -out $file

echo "Uploading file to s3://$vendorBucket/$vendorName/$file"
aws s3 cp $file s3://$vendorBucket/$vendorName/$file

rm $file

aws sqs send-message --queue-url $queueUrl --message-body "s3://$vendorBucket/$vendorName/$file" --message-group-id $vendorName