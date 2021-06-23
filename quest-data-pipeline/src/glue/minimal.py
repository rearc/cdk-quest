import boto3
import sys
import time
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job


args = getResolvedOptions(sys.argv, ['JOB_NAME'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

#connection needs to be created by the cdk script
read_s3_options = {
    "foo" : "bar",
    "some_path" : "/my_path",
    "some_key": "some value",
    "connectionName" : "test_connection"
}

inputGDF = glueContext.create_dynamic_frame.from_options(connection_type="custom.spark", connection_options=read_s3_options)

print("custom connection should have worked.")

