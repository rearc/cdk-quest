# CDK Quest

## Data Pipeline

Contains the core data pipeline resource setup in AWS which includes Glue, SQS and various S3 Buckets.

![Architecture](docs/ARCH.png)

### CDK Setup
From the [data-pipeline/](data-pipeline/) directory, run the following commands:
```
npm install -g cdk
cdk deploy --parameters bucketNamePrefix=<prefix>
```

If the aws account you're deploy to was never boostrapped before, run the following command before deploying:
```
npm run cdk bootstrap aws://<account-id>/us-east-1
```

### Demo Scripts
Examples are located in the [scripts/](scripts/) directory. The following command can be used for uploading a file to the data pipeline (replacing parameters with actual resource names/urls):
```
sh uploadFile.sh test-vendor test-vendor-bucket https://sqs.us-east-1.amazonaws.com/1234567890/test-vendor-queue.fifo
```