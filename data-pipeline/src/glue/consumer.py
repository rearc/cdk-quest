import boto3

sqs = boto3.client('sqs')

queue_url = 'SQS_QUEUE_URL' # Todo: Parameterize this

# Receive message from SQS queue
response = sqs.receive_message(
  QueueUrl=queue_url,
  AttributeNames=[
    'SentTimestamp'
  ],
  MaxNumberOfMessages=1, # Should we receive more messages?
  MessageAttributeNames=[
    'All'
  ],
  VisibilityTimeout=0,
  WaitTimeSeconds=0
)

message = response['Messages'][0]
# Todo: Parse message which contains file location in the vendor s3 bucket then copy this file to the data bucket


receipt_handle = message['ReceiptHandle']

sqs.delete_message(
  QueueUrl=queue_url,
  ReceiptHandle=receipt_handle
)
print('Successfully processed message: %s' % message)