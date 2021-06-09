import boto3

s3 = boto3.resource('s3')
sqs = boto3.client('sqs')

queue_url = 'https://sqs.us-east-1.amazonaws.com/209490147253/GsQuestDataPipelineStack-gsquestdatapipelinequeue24B34FEE-F5TF0P2LKRRR.fifo' # Todo: Parameterize this

# Receive message from SQS queue
response = sqs.receive_message(
  QueueUrl=queue_url,
  AttributeNames=[
    'vendorName',
    'fileName'
  ],
  MaxNumberOfMessages=1, # Should we receive more messages?
  MessageAttributeNames=[
    'All'
  ],
  VisibilityTimeout=5,
  WaitTimeSeconds=0
)

message = response['Messages'][0]
print('Successfully retrieved file: %s' % message)
print('Message Body: %s' % message['Body'])
print('Message Attributes: %s' % message['MessageAttributes'])

vendorName = message['MessageAttributes']['vendorName']['StringValue']
print('VendorName: %s' % vendorName)

fileName = message['MessageAttributes']['fileName']['StringValue']
print('FileName: %s' % fileName)

copy_source = {
  'Bucket': 'gs-quest-data-pipeline-vendor-bucket', # Todo: Parameterize this
  'Key': vendorName + '/' + fileName
}
bucket = s3.Bucket('gs-quest-data-pipeline-data-bucket') # Todo: Parameterize this
bucket.copy(copy_source, vendorName + '-' + fileName)
print('Successfully copied message from the vendor bucket to the data bucket')

receipt_handle = message['ReceiptHandle']

sqs.delete_message(
  QueueUrl=queue_url,
  ReceiptHandle=receipt_handle
)
print('Successfully deleted message')