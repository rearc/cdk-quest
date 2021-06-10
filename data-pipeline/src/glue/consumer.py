import boto3
import sys
import time
from awsglue.utils import getResolvedOptions

s3 = boto3.resource('s3')
sqs = boto3.client('sqs')

args = getResolvedOptions(sys.argv,
                          ['queue_url',
                           'vendor_bucket_name',
                           'data_bucket_name'])

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
    VisibilityTimeout=5,
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
    copy_source = {
      'Bucket': vendor_bucket_name,
      'Key': vendor_name + '/' + file_name
    }
    bucket = s3.Bucket(data_bucket_name)
    bucket.copy(copy_source, "{timestamp}-{vendor}-{file}".format(timestamp = current_time(), vendor = vendor_name, file = file_name))
    print('Successfully copied message from the vendor bucket to the data bucket')

    sqs.delete_message(
      QueueUrl=queue_url,
      ReceiptHandle=receipt_handle
    )
    print('Successfully deleted message')

  # Receive the next batch of messages from the SQS queue
  messages = retrieve_messages()