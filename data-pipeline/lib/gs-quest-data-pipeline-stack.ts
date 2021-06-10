import * as cdk from '@aws-cdk/core';

import * as glue from '@aws-cdk/aws-glue';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as sqs from '@aws-cdk/aws-sqs';

interface S3Bucket {
  glue: s3.Bucket;
  vendor: s3.Bucket;
  data: s3.Bucket;
}

export class GsQuestDataPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketNamePrefix = new cdk.CfnParameter(this, "bucketNamePrefix", {
      type: "String",
      description: "The prefix to use for all s3 buckets created in this stack."
    });

    const glueRole = this.setupIAMGlueRole();

    const s3Bucket = this.setupS3Buckets(bucketNamePrefix.valueAsString);

    s3Bucket.glue.grantRead(glueRole);
    s3Bucket.vendor.grantRead(glueRole);
    s3Bucket.data.grantReadWrite(glueRole);

    new s3Deployment.BucketDeployment(this, 'DeployGlueJobFiles', {
      sources: [s3Deployment.Source.asset('./src/glue')],
      destinationBucket: s3Bucket.glue,
      destinationKeyPrefix: 'scripts'
    });

    const queue = new sqs.Queue(this, 'GsQuestDataPipelineQueue', {
      fifo: true,
      contentBasedDeduplication: true
    });

    queue.grantConsumeMessages(glueRole)

    new glue.CfnJob(this, 'GsQuestDataPipelineGlueJob', {
      role: glueRole.roleArn,
      command: {
        name: 'pythonshell',
        pythonVersion: '3',
        scriptLocation: `s3://${s3Bucket.glue.bucketName}/scripts/consumer.py`
      },
      defaultArguments: {
        '--queue_url': queue.queueUrl,
        '--vendor_bucket_name': s3Bucket.vendor.bucketName,
        '--data_bucket_name': s3Bucket.data.bucketName
      }
    });
  }

  setupIAMGlueRole(): iam.Role {
    const glueRole = new iam.Role(this, 'GsQuestDataPipelineRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
    });

    const gluePolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSGlueServiceRole");
    glueRole.addManagedPolicy(gluePolicy);

    return glueRole
  }

  setupS3Buckets(bucketNamePrefix: string): S3Bucket {
    const glue = new s3.Bucket(this, 'GlueBucket', {
      versioned: true,
      bucketName: `${bucketNamePrefix}-glue-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const vendor = new s3.Bucket(this, 'VendorBucket', {
      versioned: true,
      bucketName: `${bucketNamePrefix}-vendor-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const data = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      bucketName: `${bucketNamePrefix}-data-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    return {
      glue,
      vendor,
      data
    }
  }
}