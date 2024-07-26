import boto3
from boto3.dynamodb.conditions import Key, Attr
from redis import Redis, ConnectionPool
import os
from config import AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, REGION, BUCKET_NAME
from utils import deserialize_messages, serialize_messages

# Initialize AWS clients
s3 = boto3.client(
    's3',
    region_name=REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

dynamodb = boto3.resource(
    'dynamodb',
    region_name=REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

chat_history_table = dynamodb.Table('ChatHistory')

# Initialize Redis
redis_pool = ConnectionPool(host='localhost', port=6379, db=0)
redis_client = Redis(connection_pool=redis_pool, decode_responses=False)

class Database:
    @staticmethod
    def save_chat(user_sub, course_id, messages, message_count, current_chat_id, timestamp, title):
        try:
            serialized_messages = serialize_messages(messages)
            chat_history_table.put_item(
                Item={
                    'userId': user_sub,
                    'chatId': current_chat_id,
                    'CourseId#Timestamp': f"{course_id}#{timestamp}",
                    'Title': title,
                    'Messages': serialized_messages,
                    'MessageCount': message_count,
                    'Timestamp': timestamp
                }
            )
            return True, current_chat_id
        except Exception as e:
            return False, f"Error saving chat to DynamoDB: {str(e)}"

    @staticmethod
    def get_chat_history(user_sub, course_id):
        try:
            response = chat_history_table.query(
                KeyConditionExpression=Key('userId').eq(user_sub),
                FilterExpression=Attr('CourseId#Timestamp').begins_with(f"{course_id}#"),
                ScanIndexForward=False,
                Limit=10
            )
            return response.get('Items', [])
        except Exception as e:
            raise Exception(f"Error querying chat history: {str(e)}")

    @staticmethod
    def load_chat(user_sub, chat_id):
        try:
            response = chat_history_table.get_item(
                Key={
                    'userId': user_sub,
                    'chatId': chat_id
                }
            )
            return response.get('Item')
        except Exception as e:
            raise Exception(f"Error loading chat: {str(e)}")

    @staticmethod
    def store_in_redis(user_sub, key, value):
        redis_client.hset(user_sub, key, value)

    @staticmethod
    def get_from_redis(user_sub, key):
        return redis_client.hget(user_sub, key)

    @staticmethod
    def delete_from_redis(user_sub, *keys):
        redis_client.hdel(user_sub, *keys)
    
    @staticmethod
    def delete_chat(user_sub, chat_id):
        try:
            response = chat_history_table.delete_item(
                Key={
                    'userId': user_sub,
                    'chatId': chat_id
                },
                ReturnValues='ALL_OLD'  
            )
            
            if 'Attributes' in response:
                return True, "Chat deleted successfully"
            else:
                return False, "Chat not found"
        except Exception as e:
            return False, f"Error deleting chat: {str(e)}"
    
    @staticmethod
    def update_chat_title(user_sub, chat_id, new_title):
        try:
            response = chat_history_table.update_item(
                Key={
                    'userId': user_sub,
                    'chatId': chat_id
                },
                UpdateExpression="set Title = :t",
                ExpressionAttributeValues={
                    ':t': new_title
                },
                ReturnValues="UPDATED_NEW"
            )
            
            if 'Attributes' in response:
                return True, "Chat title updated successfully"
            else:
                return False, "Chat not found"
        except Exception as e:
            return False, f"Error updating chat title: {str(e)}"


    @staticmethod
    def download_s3_folder(folder_name, temp_dir):
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=folder_name)
        for obj in response.get('Contents', []):
            if not obj['Key'].endswith('/'):  # Skip directories
                local_file_path = os.path.join(temp_dir, os.path.basename(obj['Key']))
                s3.download_file(BUCKET_NAME, obj['Key'], local_file_path)

