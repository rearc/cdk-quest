import * as cdk from '@aws-cdk/core';

import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';

export class QuestVendorBootstrapStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const accountId = new cdk.CfnParameter(this, "accountId", {
      type: "String",
      description: "The aws account id to grant access to data pipeline resources."
    });

    const vendorName = new cdk.CfnParameter(this, "vendorName", {
      type: "String",
      description: "Name of the vendor."
    });

    const account = new iam.AccountPrincipal(accountId.valueAsString);

    const queueArn = cdk.Fn.importValue('quest-data-pipeline-queue-arn')
    const queue = sqs.Queue.fromQueueArn(this, 'QuestDataPipelineQueue', queueArn)

    const queuePolicy = new sqs.QueuePolicy(this, 'QuestDataPipelineQueuePolicy', {
      queues: [queue]
    })
    queuePolicy.document.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [account],
        actions: ['sqs:SendMessage'],
        resources: [queueArn],
      })
    )

    const vendorBucketName = cdk.Fn.importValue('quest-data-pipeline-vendor-bucket-name')
    const vendorBucket = s3.Bucket.fromBucketName(this, 'VendorBucket', vendorBucketName)

    const bucketPolicy = new s3.BucketPolicy(this, 'VendorBucketPolicy', {
      bucket: vendorBucket
    });
    bucketPolicy.document.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [account],
        actions: ['s3:PutObject', 's3:PutObjectAcl'],
        resources: [`${vendorBucket.bucketArn}/${vendorName.valueAsString}/*`],
        conditions: {
          "StringEquals": {
            "s3:x-amz-acl": "bucket-owner-full-control"
          }
        }
      })
    );
  }
}
