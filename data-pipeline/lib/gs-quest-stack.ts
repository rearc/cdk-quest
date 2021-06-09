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

export class GsQuestStack extends cdk.Stack {
  private readonly resourceName: string = 'gs-quest-data-pipeline'

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const glueRole = this.setupIAMGlueRole()

    const s3Bucket = this.setupS3Buckets()
   
    s3Bucket.glue.grantRead(glueRole);

    new s3Deployment.BucketDeployment(this, 'DeployGlueJobFiles', {
      sources: [s3Deployment.Source.asset('./src/glue')],
      destinationBucket: s3Bucket.glue,
      destinationKeyPrefix: 'scripts'
    });

    const glueJob = new glue.CfnJob(this, `${this.resourceName}-job`, {
      role: glueRole.roleArn,
      command: {
        name: 'pythonshell',
        pythonVersion: '3',
        scriptLocation: `s3://${s3Bucket.glue.bucketName}/scripts/consumer.py`
      }
    });

    const queue = new sqs.Queue(this, `${this.resourceName}-queue`, {
      visibilityTimeout: cdk.Duration.hours(12)
    });
  }

  setupIAMGlueRole(): iam.Role {
    const glueRole = new iam.Role(this, `${this.resourceName}-role`, {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
    });
    
    const gluePolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSGlueServiceRole");
    glueRole.addManagedPolicy(gluePolicy)

    return glueRole
  }

  setupS3Buckets(): S3Bucket {
    const glue = new s3.Bucket(this, 'GlueBucket', {
      versioned: true,
      bucketName: `${this.resourceName}-glue-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const vendor = new s3.Bucket(this, 'VendorBucket', {
      versioned: true,
      bucketName: `${this.resourceName}-vendor-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const data = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      bucketName: `${this.resourceName}-data-bucket`,
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