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
  jar: s3.Bucket;
}

export class QuestDataPipelineStack extends cdk.Stack {
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
    s3Bucket.jar.grantRead(glueRole);

    new s3Deployment.BucketDeployment(this, 'DeployGlueJobFiles', {
      sources: [s3Deployment.Source.asset('./src/glue')],
      destinationBucket: s3Bucket.glue,
      destinationKeyPrefix: 'scripts'
    });

    const queue = new sqs.Queue(this, 'QuestDataPipelineQueue', {
      fifo: true,
      contentBasedDeduplication: true
    });

    const csv_queue = new sqs.Queue(this, 'QuestDataPipelineQueueCSV', {
      fifo: true,
      contentBasedDeduplication: true
    });

    queue.grantConsumeMessages(glueRole)
    csv_queue.grantConsumeMessages(glueRole) 

    new glue.CfnJob(this, 'QuestDataPipelineGlueJob', {
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

    new glue.CfnJob(this, 'QuestDataPipelineGlueJobS3Conn', {
      role: glueRole.roleArn,
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: `s3://${s3Bucket.glue.bucketName}/scripts/consumer_s3conn.py`
      },
      defaultArguments: {
        '--queue_url': csv_queue.queueUrl,
        '--vendor_bucket_name': s3Bucket.vendor.bucketName,
        '--data_bucket_name': s3Bucket.data.bucketName,
        '--JOB_NAME': "testJobS3Conns"
      }
    });

    //TODO
    //need to add code for creating the connector and the connection referenced by the python script
    //need to add a directory for java related stuff, along with docs for how to build the jar file for testing
    new glue.CfnJob(this, 'minimalTest', {
      role: glueRole.roleArn,
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: `s3://${s3Bucket.glue.bucketName}/scripts/minimal.py`
      },
      //do we need to build this jar first before deployment?
      //chicken and egg question
      defaultArguments: {
        '--JOB_NAME': "super_minimal",
        '--extra-jars': `s3://${s3Bucket.jar.bucketName}/true_minimal-3.0.jar`
      },
      glueVersion: '2.0',
      numberOfWorkers: 2,
      workerType: "Standard"
    });

    new cdk.CfnOutput(this, 'queueArn', {
      value: queue.queueArn,
      exportName: 'quest-data-pipeline-queue-arn'
    });

    new cdk.CfnOutput(this, 'queueUrl', {
      value: queue.queueUrl,
      exportName: 'quest-data-pipeline-queue-url'
    });

    new cdk.CfnOutput(this, 'csv_queueUrl', {
      value: csv_queue.queueUrl,
      exportName: 'quest-data-pipeline-csv-queue-url'
    });

    new cdk.CfnOutput(this, 'vendorBucketName', {
      value: s3Bucket.vendor.bucketName,
      exportName: 'quest-data-pipeline-vendor-bucket-name'
    });
  }

  setupIAMGlueRole(): iam.Role {
    const glueRole = new iam.Role(this, 'QuestDataPipelineRole', {
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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED
    });

    const vendor = new s3.Bucket(this, 'VendorBucket', {
      versioned: true,
      bucketName: `${bucketNamePrefix}-vendor-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED
    });

    const data = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      bucketName: `${bucketNamePrefix}-data-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED
    });

    const jar = new s3.Bucket(this, 'JarBucket', {
      versioned: true,
      bucketName: `${bucketNamePrefix}-jar-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED
    });

    return {
      glue,
      vendor,
      data,
      jar
    }
  }
}