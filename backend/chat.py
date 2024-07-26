import tempfile
import pickle
from datetime import datetime
import uuid
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain.memory import ConversationBufferWindowMemory
from config import OPENAI_API_KEY
from database import Database
from utils import deserialize_messages
from langchain.memory.chat_message_histories import ChatMessageHistory



class ChatManager:
    def __init__(self):
        self.embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=OPENAI_API_KEY)
        self.llm = ChatOpenAI(model="gpt-4", api_key=OPENAI_API_KEY)

    def generate_chat_title(self, messages):
        prompt = f"Generate a short, descriptive title (max 5 words) for this conversation:\n\n{messages}\n\nTitle:"
        response = self.llm.predict(prompt)
        return response.strip()

    def save_chat(self, user_sub, course_id, messages, message_count, current_chat_id):
        if not messages or message_count == 0:
            return False, "No messages to save!"

        timestamp = datetime.now().isoformat()
        title = self.generate_chat_title(str(messages))

        return Database.save_chat(user_sub, course_id, messages, message_count, current_chat_id, timestamp, title)

    def load_database(self, user_sub, course):
        with tempfile.TemporaryDirectory() as temp_dir:
            Database.download_s3_folder(f'{course}-vector-db-openai', temp_dir)

            vector_store = FAISS.load_local(temp_dir, self.embedding_model, allow_dangerous_deserialization=True)
            serialized_faiss = vector_store.serialize_to_bytes()
            memory_bytes = pickle.dumps(ConversationBufferWindowMemory(k=15))

            Database.store_in_redis(user_sub, 'current_course', course)
            Database.store_in_redis(user_sub, 'serialized_faiss', serialized_faiss)
            Database.store_in_redis(user_sub, 'conversation_memory', memory_bytes)
            Database.store_in_redis(user_sub, 'message_count', '0')

        return True

    def query(self, user_sub, query):
        serialized_faiss = Database.get_from_redis(user_sub, 'serialized_faiss')
        memory_bytes = Database.get_from_redis(user_sub, 'conversation_memory')
        message_count = int(Database.get_from_redis(user_sub, 'message_count'))

        vector_store = FAISS.deserialize_from_bytes(embeddings=self.embedding_model, serialized=serialized_faiss, allow_dangerous_deserialization=True)
        conversation_memory = pickle.loads(memory_bytes) if memory_bytes else ConversationBufferWindowMemory(k=10)

        retriever = vector_store.as_retriever()
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Use the given context to answer the question. If you don't know the answer, say you don't know. Make sure to be concise. Any code you write, make sure it includes ``` at the start and at the end. Context: {context} Conversation history: {history}"),
            ("human", "{input}"),
        ])
        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)
        loaded_chain = create_retrieval_chain(retriever, question_answer_chain)

        conversation_memory.save_context({"input": query}, {"output": ""})
        message_count += 1

        history = conversation_memory.load_memory_variables({})["history"]
        result = loaded_chain.invoke({"input": query, "history": history})

        conversation_memory.save_context({"input": ""}, {"output": result['answer']})
        message_count += 1

        Database.store_in_redis(user_sub, 'conversation_memory', pickle.dumps(conversation_memory))
        Database.store_in_redis(user_sub, 'message_count', str(message_count))

        return result['answer'], message_count

    def start_new_chat(self, user_sub, course_id, messages, message_count, current_chat_id):
        conversation_memory = ConversationBufferWindowMemory(k=15)
        chat_id = str(uuid.uuid4())

        if message_count not in ('0', 0) or current_chat_id is not None:
            self.save_chat(user_sub, course_id, messages, message_count, current_chat_id)
        
        Database.store_in_redis(user_sub, 'current_course', course_id)
        Database.store_in_redis(user_sub, 'conversation_memory', pickle.dumps(conversation_memory))
        Database.store_in_redis(user_sub, 'message_count', '0')
        Database.store_in_redis(user_sub, 'current_chat_id', chat_id)

        return chat_id
    def load_chat_into_memory(self, user_sub, chat_data):
        # Parse CourseId and Timestamp
        course_id, timestamp = chat_data['CourseId#Timestamp'].split('#')
        
        # Deserialize the messages
        deserialized_messages = deserialize_messages(chat_data['Messages'])
        
        # Create a ChatMessageHistory object
        chat_history = ChatMessageHistory()
        for msg in deserialized_messages:
            if msg['type'] == 'HumanMessage':
                chat_history.add_user_message(msg['content'])
            elif msg['type'] == 'AIMessage':
                chat_history.add_ai_message(msg['content'])
        
        # Create ConversationBufferWindowMemory with the ChatMessageHistory
        conversation_memory = ConversationBufferWindowMemory(k=15, chat_memory=chat_history)
        
        # Load the chat data into Redis
        Database.store_in_redis(user_sub, 'current_course', course_id)
        Database.store_in_redis(user_sub, 'conversation_memory', pickle.dumps(conversation_memory))
        Database.store_in_redis(user_sub, 'message_count', str(chat_data['MessageCount']))
        Database.store_in_redis(user_sub, 'current_chat_id', chat_data['chatId'])

        return course_id, timestamp, deserialized_messages, chat_data['MessageCount'], chat_data.get('Title', '')


chat_manager = ChatManager()