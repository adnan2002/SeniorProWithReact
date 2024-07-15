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

app = Flask(__name__)
CORS(app)

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

# Global variables to store the loaded chain and memory
loaded_chain = None
current_course = None
conversation_memory = None
message_count = 0

@app.route('/load_database', methods=['GET'])
def load_database():
    global loaded_chain, current_course, conversation_memory, message_count
    course = request.args.get('course')
    
    if course == current_course and loaded_chain is not None:
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
        llm = ChatOpenAI(model="gpt-4", api_key=openai_api_key)
        embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)

        # Load the vector store from the temporary directory
        vector_store = FAISS.load_local(temp_dir, embedding_model, allow_dangerous_deserialization=True)

        retriever = vector_store.as_retriever()

        # Initialize conversation memory
        conversation_memory = ConversationBufferWindowMemory(k=15)
        message_count = 0

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
        current_course = course

    return jsonify({"message": "Database loaded successfully"}), 200

@app.route('/query', methods=['POST'])
def query():
    global loaded_chain, conversation_memory, message_count
    if loaded_chain is None:
        return jsonify({"error": "Database not loaded"}), 400

    data = request.json
    query = data.get('query')

    if not query:
        return jsonify({"error": "No query provided"}), 400

    # Add the query to memory
    conversation_memory.save_context({"input": query}, {"output": ""})
    message_count += 1

    # Get the conversation history
    history = conversation_memory.load_memory_variables({})["history"]

    # Invoke the chain with the query and history
    result = loaded_chain.invoke({"input": query, "history": history})

    # Add the response to memory
    conversation_memory.save_context({"input": ""}, {"output": result['answer']})
    message_count += 1

    return jsonify({
        "answer": result['answer'],
        "messageCount": message_count,
        "memoryFull": message_count >= 30
    }), 200

@app.route('/clear_memory', methods=['POST'])
def clear_memory():
    global conversation_memory, message_count
    conversation_memory.clear()
    message_count = 0
    return jsonify({"message": "Memory cleared", "messageCount": 0}), 200

if __name__ == '__main__':
    app.run(debug=True)