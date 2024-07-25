# # app.py

# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import boto3
# from boto3.dynamodb.conditions import Key, Attr
# from datetime import datetime
# from langchain_community.vectorstores import FAISS
# from langchain_openai import OpenAIEmbeddings, ChatOpenAI
# from langchain_core.prompts import ChatPromptTemplate
# from langchain.chains.combine_documents import create_stuff_documents_chain
# from langchain.chains.retrieval import create_retrieval_chain
# from langchain.memory import ConversationBufferWindowMemory
# from langchain_core.messages import HumanMessage, AIMessage
# from langchain.memory.chat_message_histories import ChatMessageHistory
# from dotenv import load_dotenv
# import os
# import tempfile 
# from redis import Redis, ConnectionPool
# import pickle
# import jwt
# import requests
# from jwt.algorithms import RSAAlgorithm
# from functools import wraps
# from flask import request, jsonify
# import os
# import uuid
# def serialize_messages(messages):
#     serialized_messages = []
#     for msg in messages:
#         if isinstance(msg, dict):
#             msg_type = msg['type']
#             content = msg['content']
#             additional_kwargs = msg.get('additional_kwargs', {})
#         else:
#             msg_type = msg.__class__.__name__
#             content = msg.content
#             additional_kwargs = getattr(msg, 'additional_kwargs', {})

#         serialized_msg = {
#             'M': {
#                 'type': {'S': msg_type},
#                 'content': {'S': content},
#                 'additional_kwargs': {'M': {}}
#             }
#         }
#         for key, value in additional_kwargs.items():
#             serialized_msg['M']['additional_kwargs']['M'][key] = {'S': str(value)}
#         serialized_messages.append(serialized_msg)
#     return serialized_messages
# def deserialize_messages(serialized_messages):
#     messages = []
#     for msg in serialized_messages:
#         if isinstance(msg, dict) and 'M' in msg:
#             msg_data = msg['M']
#             messages.append({
#                 'type': msg_data['type']['S'],
#                 'content': msg_data['content']['S'],
#                 'additional_kwargs': {k: v['S'] for k, v in msg_data['additional_kwargs']['M'].items()} if msg_data['additional_kwargs']['M'] else {}
#             })
#         else:
#             # If the message is already in the desired format, just append it
#             messages.append(msg)
#     return messages
# app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"]}})

# # Load environment variables
# load_dotenv()

# # Get API keys
# openai_api_key = os.getenv('OPENAI_API_KEY')
# aws_access_key = os.getenv('aws_access_key')
# aws_secret_access_key = os.getenv('aws_secret_access_key')

# # Initialize S3 client with credentials
# s3 = boto3.client(
#     's3',
#     region_name='eu-north-1',
#     aws_access_key_id=aws_access_key,
#     aws_secret_access_key=aws_secret_access_key
# )

# dynamodb = boto3.resource(
#     'dynamodb',
#     region_name='eu-north-1',
#     aws_access_key_id=aws_access_key,
#     aws_secret_access_key=aws_secret_access_key
# )

# chat_history_table = dynamodb.Table('ChatHistory')

# def generate_chat_title(messages, llm):
#     prompt = f"Generate a short, descriptive title (max 5 words) for this conversation:\n\n{messages}\n\nTitle:"
#     response = llm.predict(prompt)
#     return response.strip()

# def save_chat(user_sub, course_id, messages, message_count, current_chat_id):
#     if not messages or message_count == 0:
#         return False, "No messages to save!"
    
    
#     timestamp = datetime.now().isoformat()
#     llm = ChatOpenAI(model="gpt-4", api_key=openai_api_key)
#     title = generate_chat_title(str(messages), llm)
#     serialized_messages = serialize_messages(messages)

#     # Query existing chat by userId and chatId
#     try:
#         existing_chat = chat_history_table.get_item(
#             Key={
#                 'userId': user_sub,
#                 'chatId': current_chat_id
#             }
#         )
#     except Exception as e:
#         return False, f"Error querying DynamoDB: {str(e)}"

#     if 'Item' in existing_chat:
#         # Update existing chat
#         try:
#             chat_history_table.update_item(
#                 Key={
#                     'userId': user_sub,
#                     'chatId': current_chat_id
#                 },
#                 UpdateExpression="SET Messages = :m, MessageCount = :mc, #ts = :ts, Title = :t, #cit = :cit",
#                 ExpressionAttributeNames={
#                     '#ts': 'Timestamp',
#                     '#cit': 'CourseId#Timestamp'
#                 },
#                 ExpressionAttributeValues={
#                     ':m': serialized_messages,
#                     ':mc': message_count,
#                     ':ts': timestamp,
#                     ':t': title,
#                     ':cit': f"{course_id}#{timestamp}"
#                 }
#             )
#             return True, current_chat_id
#         except Exception as e:
#             return False, f"Error updating DynamoDB: {str(e)}"
#     else:
#         # Create new chat
#         try:
#             chat_history_table.put_item(
#                 Item={
#                     'userId': user_sub,
#                     'chatId': current_chat_id,
#                     'CourseId#Timestamp': f"{course_id}#{timestamp}",
#                     'Title': title,
#                     'Messages': serialized_messages,
#                     'MessageCount': message_count,
#                     'Timestamp': timestamp
#                 }
#             )
#             return True, current_chat_id
#         except Exception as e:
#             return False, f"Error creating new item in DynamoDB: {str(e)}"

# # S3 bucket information
# bucket_name = 'seniorbucket'

# # Initialize Redis connection pool
# redis_pool = ConnectionPool(host='localhost', port=6379, db=0)


# # Initialize Redis client with the connection pool
# redis_client = Redis(connection_pool=redis_pool, decode_responses=False)



# # Cognito User Pool details
# REGION = os.getenv('REGION')
# USER_POOL_ID = os.getenv('USER_POOL_ID')
# APP_CLIENT_ID = os.getenv('APP_CLIENT_ID')

# # Cognito keys URL
# JWKS_URL = f'https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'

# # Fetch the JSON Web Key Set
# jwks = requests.get(JWKS_URL).json()

# def get_public_key(token):
#     kid = jwt.get_unverified_header(token)['kid']
#     for key in jwks['keys']:
#         if key['kid'] == kid:
#             return RSAAlgorithm.from_jwk(key)
#     raise ValueError('Public key not found in JWKS')

# def get_user_sub(token):
#     try:
#         decoded = jwt.decode(token, options={"verify_signature": False})
#         return decoded['sub']
#     except jwt.InvalidTokenError:
#         return None
    



# def token_required(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         token = None
#         if 'Authorization' in request.headers:
#             auth_header = request.headers['Authorization']
#             try:
#                 token = auth_header.split(" ")[1]
#             except IndexError:
#                 return jsonify({'message': 'Bearer token malformed'}), 401
        
#         if not token:
#             return jsonify({'message': 'Token is missing!'}), 401
        
#         try:
#             public_key = get_public_key(token)
            
#             payload = jwt.decode(
#                 token, 
#                 public_key,
#                 algorithms=["RS256"],
#                 options={
#                     'verify_exp': True,
#                     'verify_aud': False,  
#                     'verify_iss': True
#                 },
#                 issuer=f'https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}'
#             )
            
#             if payload['client_id'] != APP_CLIENT_ID:
#                 raise jwt.InvalidAudienceError("Invalid audience")
            
#             if payload['token_use'] != 'access':
#                 raise jwt.InvalidTokenError("Invalid token use")
            
#             request.user_sub = get_user_sub(token)
            
#         except jwt.ExpiredSignatureError:
#             return jsonify({'message': 'Token has expired'}), 401
#         except jwt.InvalidAudienceError:
#             return jsonify({'message': 'Invalid audience'}), 401
#         except jwt.InvalidIssuerError:
#             return jsonify({'message': 'Invalid issuer'}), 401
#         except jwt.InvalidTokenError as e:
#             return jsonify({'message': f'Invalid token: {str(e)}'}), 401
#         except Exception as e:
#             print(f"Token validation error: {str(e)}")
#             return jsonify({'message': f'Token is invalid! Error: {str(e)}'}), 401
        
#         return f(*args, **kwargs)
#     return decorated


# @app.route('/save_chat', methods=['POST'])
# @token_required
# def save_current_chat():
#     user_sub = request.user_sub
#     if redis_client.hexists(user_sub, 'conversation_memory'):
#         course_id = redis_client.hget(user_sub, 'current_course').decode()
#         memory_bytes = redis_client.hget(user_sub, 'conversation_memory')
#         message_count = int(redis_client.hget(user_sub, 'message_count'))
#         conversation_memory = pickle.loads(memory_bytes)
#         messages = conversation_memory.chat_memory.messages
#         current_chat_id = redis_client.hget(user_sub, 'current_chat_id').decode()

#         success, result = save_chat(user_sub, course_id, messages, message_count, current_chat_id)
        
#         if success:
#             return jsonify({"message": "Chat saved successfully", "chatId": result}), 200
#         else:
#             return jsonify({"error": result}), 400
#     else:
#         return jsonify({"error": "No active chat to save"}), 400


# @app.route('/get_chat_history', methods=['GET'])
# @token_required
# def get_chat_history():
#     user_sub = request.user_sub
#     course_id = request.args.get('course_id')
    
#     response = chat_history_table.query(
#         KeyConditionExpression=Key('userId').eq(user_sub),
#         FilterExpression=Attr('CourseId#Timestamp').begins_with(f"{course_id}#"),
#         ScanIndexForward=False,
#         Limit=10  
#     )
    
#     chat_history = response.get('Items', [])
    
#     # Deserialize messages for each chat entry
#     for chat in chat_history:
#         chat['Messages'] = deserialize_messages(chat['Messages'])
    
#     return jsonify(chat_history), 200

# @app.route('/load_chat', methods=['GET'])
# @token_required
# def load_chat():
#     user_sub = request.user_sub
#     chat_id = request.args.get('chat_id')
    
#     response = chat_history_table.get_item(
#         Key={
#             'userId': user_sub,
#             'chatId': chat_id
#         }
#     )
    
#     if 'Item' not in response:
#         return jsonify({"error": "Chat not found"}), 404
    
#     chat_data = response['Item']
    
#     # Parse CourseId and Timestamp
#     course_id, timestamp = chat_data['CourseId#Timestamp'].split('#')
    
#     # Deserialize the messages
#     deserialized_messages = deserialize_messages(chat_data['Messages'])
    
#     # Create a ChatMessageHistory object
#     chat_history = ChatMessageHistory()
#     for msg in deserialized_messages:
#         if msg['type'] == 'HumanMessage':
#             chat_history.add_user_message(msg['content'])
#         elif msg['type'] == 'AIMessage':
#             chat_history.add_ai_message(msg['content'])
    
#     # Create ConversationBufferWindowMemory with the ChatMessageHistory
#     conversation_memory = ConversationBufferWindowMemory(k=15, chat_memory=chat_history)
    
#     # Load the chat data into Redis
#     redis_client.hset(user_sub, mapping={
#         'current_course': course_id,
#         'conversation_memory': pickle.dumps(conversation_memory),
#         'message_count': str(chat_data['MessageCount']),
#         'current_chat_id': chat_id
#     })
    
#     # Filter out empty messages
#     non_empty_messages = [msg for msg in deserialized_messages if msg['content']]
    
#     return jsonify({
#         "message": "Chat loaded successfully",
#         "messageCount": chat_data['MessageCount'],
#         "messages": non_empty_messages,
#         "courseId": course_id,
#         "timestamp": timestamp,
#         "title": chat_data.get('Title', '')
#     }), 200


# @app.route('/load_database', methods=['GET'])
# @token_required
# def load_database():
#     user_sub = request.user_sub
#     course = request.args.get('course')

#     if redis_client.hexists(user_sub, 'current_course') and redis_client.hget(user_sub, 'current_course').decode() == course:
#         return jsonify({"message": "Database already loaded"}), 200

#     folder_name = f'{course}-vector-db-openai'

#     with tempfile.TemporaryDirectory() as temp_dir:
#         # Download the contents of the S3 folder
#         response = s3.list_objects_v2(Bucket=bucket_name, Prefix=folder_name)
#         for obj in response.get('Contents', []):
#             if not obj['Key'].endswith('/'):  # Skip directories
#                 local_file_path = os.path.join(temp_dir, os.path.basename(obj['Key']))
#                 s3.download_file(bucket_name, obj['Key'], local_file_path)

#         # Initialize OpenAI models
#         embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)

#         # Load the vector store from the temporary directory
#         vector_store = FAISS.load_local(temp_dir, embedding_model, allow_dangerous_deserialization=True)

#         # Serialize the FAISS index
#         serialized_faiss = vector_store.serialize_to_bytes()
#         memory_bytes = pickle.dumps(ConversationBufferWindowMemory(k=15))

#         # Store data in Redis
#         redis_client.hset(user_sub, mapping={
#             'current_course': course,
#             'serialized_faiss': serialized_faiss,
#             'conversation_memory': memory_bytes,
#             'message_count': '0'
#         })

#     if not redis_client.hexists(user_sub, 'serialized_faiss'):
#         return jsonify({"error": "Failed to save data to Redis"}), 500

#     return jsonify({"message": "Database loaded successfully"}), 200

# @app.route('/query', methods=['POST'])
# @token_required
# def query():
#     user_sub = request.user_sub
#     if not redis_client.hexists(user_sub, 'serialized_faiss'):
#         return jsonify({"error": "Database not loaded"}), 400

#     data = request.json
#     query = data.get('query')
#     if not query:
#         return jsonify({"error": "No query provided"}), 400

#     # Retrieve data from Redis
#     serialized_faiss = redis_client.hget(user_sub, 'serialized_faiss')
#     memory_bytes = redis_client.hget(user_sub, 'conversation_memory')
#     message_count = int(redis_client.hget(user_sub, 'message_count'))

#     # Deserialize data
#     embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)
#     vector_store = FAISS.deserialize_from_bytes(embeddings=embedding_model, serialized=serialized_faiss, allow_dangerous_deserialization=True)
    
#     # Use a persistent conversation memory
#     if memory_bytes:
#         conversation_memory = pickle.loads(memory_bytes)
#     else:
#         conversation_memory = ConversationBufferWindowMemory(k=10)

#     retriever = vector_store.as_retriever()
#     llm = ChatOpenAI(model="gpt-4", api_key=openai_api_key)
#     system_prompt = (
#         "Use the given context to answer the question. "
#         "If you don't know the answer, say you don't know. "
#         "Make sure to be concise."
#         "Any code you write, make sure it includes ``` at the start and at the end."
#         "Context: {context}"
#         "Conversation history: {history}"
#     )
#     prompt = ChatPromptTemplate.from_messages(
#         [
#             ("system", system_prompt),
#             ("human", "{input}"),
#         ]
#     )
#     question_answer_chain = create_stuff_documents_chain(llm, prompt)
#     loaded_chain = create_retrieval_chain(retriever, question_answer_chain)

#     conversation_memory.save_context({"input": query}, {"output": ""})
#     message_count += 1

#     history = conversation_memory.load_memory_variables({})["history"]

#     result = loaded_chain.invoke({"input": query, "history": history})

#     conversation_memory.save_context({"input": ""}, {"output": result['answer']})
#     message_count += 1

#     # Store updated memory and message count
#     redis_client.hset(user_sub, mapping={
#         'conversation_memory': pickle.dumps(conversation_memory),
#         'message_count': str(message_count)
#     })

#     return jsonify({
#         "answer": result['answer'],
#         "messageCount": message_count,
#         "memoryFull": message_count >= 30
#     }), 200
    
# # @app.route('/clear_memory', methods=['POST'])
# # @token_required
# # def clear_memory():
# #     user_sub = request.user_sub
# #     if redis_client.hexists(user_sub, 'conversation_memory'):
# #         # Save the current chat before clearing
# #         course_id = redis_client.hget(user_sub, 'current_course').decode()
# #         memory_bytes = redis_client.hget(user_sub, 'conversation_memory')
# #         message_count = int(redis_client.hget(user_sub, 'message_count'))
# #         conversation_memory = pickle.loads(memory_bytes)
# #         messages = conversation_memory.chat_memory.messages
# #         current_chat_id = redis_client.hget(user_sub, 'current_chat_id').decode()

# #         save_chat(user_sub, course_id, messages, message_count, current_chat_id)

# #         redis_client.hdel(user_sub, 'current_course', 'conversation_memory', 'message_count', 'current_chat_id')

# #         # Clear the memory
# #         redis_client.hset(user_sub, mapping={
# #             'conversation_memory': pickle.dumps(ConversationBufferWindowMemory(k=15)),
# #             'message_count': '0'
# #         })
    
# #     return jsonify({"message": "Memory cleared and chat saved", "messageCount": 0}), 200

# @app.route('/start_chat', methods=['POST'])
# @token_required
# def start_chat():
#     user_sub = request.user_sub
#     data = request.json
#     course_id = data.get('course_id')
#     if redis_client.hexists(user_sub, 'conversation_memory'):
#         # Save the current chat before clearing
#         course_id = redis_client.hget(user_sub, 'current_course').decode()
#         memory_bytes = redis_client.hget(user_sub, 'conversation_memory')
#         message_count = int(redis_client.hget(user_sub, 'message_count'))
#         conversation_memory = pickle.loads(memory_bytes)
#         messages = conversation_memory.chat_memory.messages
#         current_chat_id = redis_client.hget(user_sub, 'current_chat_id').decode()

#         save_chat(user_sub, course_id, messages, message_count, current_chat_id)

#         redis_client.hdel(user_sub, 'current_course', 'conversation_memory', 'message_count', 'current_chat_id')



    
#     if not course_id:
#         return jsonify({"error": "Course ID is required"}), 400

    

#     # Initialize a new conversation memory
#     conversation_memory = ConversationBufferWindowMemory(k=15)

#     chat_id = str(uuid.uuid4())

#     # Store initial chat data in Redis
#     redis_client.hset(user_sub, mapping={
#         'current_course': course_id,
#         'conversation_memory': pickle.dumps(conversation_memory),
#         'message_count': '0',
#         'current_chat_id': chat_id
#     })

#     return jsonify({"message": "New chat session started, previous session cleared", "current_course": course_id}), 200

# if __name__ == '__main__':
#     app.run(debug=True)

from flask import Flask
from flask_cors import CORS
from routes import init_routes

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"]}})

init_routes(app)

if __name__ == '__main__':
    app.run(debug=True)
