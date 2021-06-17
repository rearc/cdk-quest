import boto3
import sys
import time
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

#need to experiment with inferring the region name
#my_session = boto3.session.Session()
#my_region = my_session.region_name

#my_region = s3.meta.region_name

sqs = boto3.client('sqs', region_name="us-east-1")

args = getResolvedOptions(sys.argv,
                          ['queue_url',
                           'vendor_bucket_name',
                           'data_bucket_name', 
                           'JOB_NAME'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

queue_url = args['queue_url']
print('queue_url: %s' % queue_url)

vendor_bucket_name = args['vendor_bucket_name']
print('vendor_bucket_name: %s' % vendor_bucket_name)

data_bucket_name = args['data_bucket_name']
print('data_bucket_name: %s' % data_bucket_name)

def current_time():
    return round(time.time() * 1000)

def retrieve_messages():
  response = sqs.receive_message(
    QueueUrl=queue_url,
    AttributeNames=[
      'vendorName',
      'fileName'
    ],
    MaxNumberOfMessages=10,
    MessageAttributeNames=[
      'All'
    ],
    VisibilityTimeout=200,
    WaitTimeSeconds=0
  )
  print('response: %s' % response)

  if 'Messages' in response:
    return response['Messages']
  else:
    print('Finished receiving all messages from SQS')
    return []

# Receive a batch of messages from the SQS queue
messages = retrieve_messages()

while len(messages) > 0:
  for message in messages:
    print('Full Message: %s' % message)
    print('Message Body: %s' % message['Body'])
    print('Message Attributes: %s' % message['MessageAttributes'])

    receipt_handle = message['ReceiptHandle']

    # Strip vendor name for message attributes
    vendor_name = message['MessageAttributes']['vendorName']['StringValue']
    print('vendor_name: %s' % vendor_name)

    # Strip file name for message attributes
    file_name = message['MessageAttributes']['fileName']['StringValue']
    print('file_name: %s' % file_name)

    # Copy vendor file to data file

    read_s3_options = {
      "paths" : ["s3://" + vendor_bucket_name + "/" + vendor_name + "/" + file_name],
      "recurse" : True
    }

    write_s3_options = {
      "path" : "s3://" + data_bucket_name + "/json_dir" 
    }

    inputGDF = glueContext.create_dynamic_frame_from_options(connection_type="s3", 
      connection_options=read_s3_options, format="csv")
    outputGDF = glueContext.write_dynamic_frame.from_options(frame=inputGDF, connection_type="s3",
      connection_options=write_s3_options, format="json")
    
    sqs.delete_message(
      QueueUrl=queue_url,
      ReceiptHandle=receipt_handle
    )
    print('Successfully deleted message')

  # Receive the next batch of messages from the SQS queue
  messages = retrieve_messages()