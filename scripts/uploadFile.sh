#!/bin/bash

set -e

vendorName=$1
vendorBucket=$2
queueUrl=$3

accountId=$(aws sts get-caller-identity | jq '.Account')
echo "Calling script from account: $accountId"

fileName=$(uuidgen).txt

echo "Creating temp file: $fileName"
openssl rand -base64 200 -out $fileName

echo "Uploading file to s3://$vendorBucket/$vendorName/$fileName"
aws s3 cp $fileName s3://$vendorBucket/$vendorName/$fileName --acl bucket-owner-full-control

echo "Deleting temp file"
rm $fileName

messageAttributes=$(jq -c -n --arg vendorName "$vendorName" --arg fileName "$fileName" '{vendorName: {DataType:"String", StringValue:$vendorName}, fileName: {DataType:"String", StringValue:$fileName}}')

echo "Sending SQS Message with Attributes: $messageAttributes"
aws sqs send-message --queue-url $queueUrl --message-body "S3 Vendor File: s3://$vendorBucket/$vendorName/$fileName" --message-group-id $vendorName --message-attributes $messageAttributes