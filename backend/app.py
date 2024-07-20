from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain.memory import ConversationBufferWindowMemory
from dotenv import load_dotenv
import os
import tempfile 
import redis
import pickle
import jwt
import requests
from jwt.algorithms import RSAAlgorithm
from functools import wraps
from flask import request, jsonify
import os


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"]}})

# Load environment variables
load_dotenv()

# Get API keys
openai_api_key = os.getenv('OPENAI_API_KEY')
aws_access_key = os.getenv('aws_access_key')
aws_secret_access_key = os.getenv('aws_secret_access_key')

# Initialize S3 client with credentials
s3 = boto3.client(
    's3',
    region_name='eu-north-1',
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_access_key
)

# S3 bucket information
bucket_name = 'seniorbucket'

# Initialize Redis client
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=False)

# Cognito User Pool details
REGION = os.getenv('REGION')
USER_POOL_ID = os.getenv('USER_POOL_ID')
APP_CLIENT_ID = os.getenv('APP_CLIENT_ID')

# Cognito keys URL
JWKS_URL = f'https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'

# Fetch the JSON Web Key Set
jwks = requests.get(JWKS_URL).json()

def get_public_key(token):
    kid = jwt.get_unverified_header(token)['kid']
    for key in jwks['keys']:
        if key['kid'] == kid:
            return RSAAlgorithm.from_jwk(key)
    raise ValueError('Public key not found in JWKS')

def get_user_sub(token):
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded['sub']
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Bearer token malformed'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            public_key = get_public_key(token)
            
            payload = jwt.decode(
                token, 
                public_key,
                algorithms=["RS256"],
                options={
                    'verify_exp': True,
                    'verify_aud': False,  
                    'verify_iss': True
                },
                issuer=f'https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}'
            )
            
            if payload['client_id'] != APP_CLIENT_ID:
                raise jwt.InvalidAudienceError("Invalid audience")
            
            if payload['token_use'] != 'access':
                raise jwt.InvalidTokenError("Invalid token use")
            
            request.user_sub = get_user_sub(token)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidAudienceError:
            return jsonify({'message': 'Invalid audience'}), 401
        except jwt.InvalidIssuerError:
            return jsonify({'message': 'Invalid issuer'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'message': f'Invalid token: {str(e)}'}), 401
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return jsonify({'message': f'Token is invalid! Error: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    return decorated


@app.route('/load_database', methods=['GET'])
@token_required
def load_database():
    user_sub = request.user_sub
    course = request.args.get('course')

    if redis_client.hexists(user_sub, 'current_course') and redis_client.hget(user_sub, 'current_course').decode() == course:
        return jsonify({"message": "Database already loaded"}), 200

    folder_name = f'{course}-vector-db-openai'

    with tempfile.TemporaryDirectory() as temp_dir:
        # Download the contents of the S3 folder
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=folder_name)
        for obj in response.get('Contents', []):
            if not obj['Key'].endswith('/'):  # Skip directories
                local_file_path = os.path.join(temp_dir, os.path.basename(obj['Key']))
                s3.download_file(bucket_name, obj['Key'], local_file_path)

        # Initialize OpenAI models
        embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)

        # Load the vector store from the temporary directory
        vector_store = FAISS.load_local(temp_dir, embedding_model, allow_dangerous_deserialization=True)

        # Serialize the FAISS index
        serialized_faiss = vector_store.serialize_to_bytes()
        memory_bytes = pickle.dumps(ConversationBufferWindowMemory(k=15))

        # Store data in Redis
        redis_client.hset(user_sub, mapping={
            'current_course': course,
            'serialized_faiss': serialized_faiss,
            'conversation_memory': memory_bytes,
            'message_count': '0'
        })

    if not redis_client.hexists(user_sub, 'serialized_faiss'):
        return jsonify({"error": "Failed to save data to Redis"}), 500

    return jsonify({"message": "Database loaded successfully"}), 200

@app.route('/query', methods=['POST'])
@token_required
def query():
    user_sub = request.user_sub
    if not redis_client.hexists(user_sub, 'serialized_faiss'):
        return jsonify({"error": "Database not loaded"}), 400

    data = request.json
    query = data.get('query')
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # Retrieve data from Redis
    serialized_faiss = redis_client.hget(user_sub, 'serialized_faiss')
    memory_bytes = redis_client.hget(user_sub, 'conversation_memory')
    message_count = int(redis_client.hget(user_sub, 'message_count'))

    # Deserialize data
    embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)
    vector_store = FAISS.deserialize_from_bytes(embeddings=embedding_model, serialized=serialized_faiss, allow_dangerous_deserialization=True)
    conversation_memory = pickle.loads(memory_bytes)

    retriever = vector_store.as_retriever()
    llm = ChatOpenAI(model="gpt-4", api_key=openai_api_key)
    system_prompt = (
        "Use the given context to answer the question. "
        "If you don't know the answer, say you don't know. "
        "Make sure to be concise."
        "Any code you write, make sure it includes ``` at the start and at the end."
        "Context: {context}"
        "Conversation history: {history}"
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            ("human", "{input}"),
        ]
    )
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    loaded_chain = create_retrieval_chain(retriever, question_answer_chain)

    conversation_memory.save_context({"input": query}, {"output": ""})
    message_count += 1

    history = conversation_memory.load_memory_variables({})["history"]

    result = loaded_chain.invoke({"input": query, "history": history})

    conversation_memory.save_context({"input": ""}, {"output": result['answer']})
    message_count += 1

    # Store updated memory and message count
    redis_client.hset(user_sub, mapping={
        'conversation_memory': pickle.dumps(conversation_memory),
        'message_count': str(message_count)
    })

    return jsonify({
        "answer": result['answer'],
        "messageCount": message_count,
        "memoryFull": message_count >= 30
    }), 200

@app.route('/clear_memory', methods=['POST'])
@token_required
def clear_memory():
    user_sub = request.user_sub
    if redis_client.hexists(user_sub, 'conversation_memory'):
        redis_client.hset(user_sub, mapping={
            'conversation_memory': pickle.dumps(ConversationBufferWindowMemory(k=15)),
            'message_count': '0'
        })
    return jsonify({"message": "Memory cleared", "messageCount": 0}), 200

if __name__ == '__main__':
    app.run(debug=True)
