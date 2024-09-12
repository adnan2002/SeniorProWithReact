from flask import request, jsonify
from auth import token_required
from chat import chat_manager
from database import Database
from utils import serialize_messages, deserialize_messages
import pickle
import json
import os

def init_routes(app):
    @app.route('/save_chat', methods=['POST'])
    @token_required
    def save_current_chat():
        user_sub = request.user_sub
        course_id = Database.get_from_redis(user_sub, 'current_course').decode()
        memory_bytes = Database.get_from_redis(user_sub, 'conversation_memory')
        message_count = int(Database.get_from_redis(user_sub, 'message_count'))
        conversation_memory = pickle.loads(memory_bytes)
        messages = conversation_memory.chat_memory.messages
        current_chat_id = Database.get_from_redis(user_sub, 'current_chat_id').decode()

        success, result = chat_manager.save_chat(user_sub, course_id, messages, message_count, current_chat_id)
        
        if success:
            return jsonify({"message": "Chat saved successfully", "chatId": result}), 200
        else:
            return jsonify({"error": result}), 400

    @app.route('/get_chat_history', methods=['GET'])
    @token_required
    def get_chat_history():
        user_sub = request.user_sub
        course_id = request.args.get('course_id')
        
        chat_history = Database.get_chat_history(user_sub, course_id)
        
        # Deserialize messages for each chat entry
        for chat in chat_history:
            chat['Messages'] = deserialize_messages(chat['Messages'])
        
        return jsonify(chat_history), 200

    @app.route('/load_chat', methods=['GET'])
    @token_required
    def load_chat():
        user_sub = request.user_sub
        chat_id = request.args.get('chat_id')
        
        chat_data = Database.load_chat(user_sub, chat_id)
        
        if not chat_data:
            return jsonify({"error": "Chat not found"}), 404
        
        course_id, timestamp = chat_data['CourseId#Timestamp'].split('#')
        
        deserialized_messages = deserialize_messages(chat_data['Messages'])
        
        chat_manager.load_chat_into_memory(user_sub, chat_data)
        
        non_empty_messages = [msg for msg in deserialized_messages if msg['content']]
        
        return jsonify({
            "message": "Chat loaded successfully",
            "messageCount": chat_data['MessageCount'],
            "messages": non_empty_messages,
            "courseId": course_id,
            "timestamp": timestamp,
            "title": chat_data.get('Title', '')
        }), 200

    @app.route('/load_database', methods=['GET'])
    @token_required
    def load_database_route():
        user_sub = request.user_sub
        course = request.args.get('course')

        if Database.get_from_redis(user_sub, 'current_course') == course:
            return jsonify({"message": "Database already loaded"}), 200

        success = chat_manager.load_database(user_sub, course)

        if success:
            return jsonify({"message": "Database loaded successfully"}), 200
        else:
            return jsonify({"error": "Failed to load database"}), 500

    @app.route('/query', methods=['POST'])
    @token_required
    def query_route():
        user_sub = request.user_sub
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({"error": "No query provided"}), 400

        if not Database.get_from_redis(user_sub, 'serialized_faiss'):
            return jsonify({"error": "Database not loaded"}), 400

        answer, message_count = chat_manager.query(user_sub, query)

        return jsonify({
            "answer": answer,
            "messageCount": message_count,
            "memoryFull": message_count >= 30
        }), 200

    @app.route('/start_chat', methods=['POST'])
    @token_required
    def start_chat():
        user_sub = request.user_sub
        data = request.json
        course_id = data.get('course_id')
        
        if not course_id:
            return jsonify({"error": "Course ID is required"}), 400

        memory_bytes = Database.get_from_redis(user_sub, 'conversation_memory')
        message_count = int(Database.get_from_redis(user_sub, 'message_count'))
        try:
            current_chat_id = Database.get_from_redis(user_sub, 'current_chat_id').decode()
        except AttributeError:
            current_chat_id = None
            
        if memory_bytes:
            conversation_memory = pickle.loads(memory_bytes)
            messages = conversation_memory.chat_memory.messages
        else:
            messages = []


        chat_id = chat_manager.start_new_chat(user_sub, course_id, messages, message_count, current_chat_id)

        return jsonify({
            "message": "New chat session started, previous session cleared",
            "current_course": course_id,
            "chat_id": chat_id
        }), 200
    @app.route('/delete_chat', methods=['DELETE'])
    @token_required
    def delete_chat_route():
        user_sub = request.user_sub
        chat_id = request.json.get('chat_id')
        
        if not chat_id:
            return jsonify({"error": "Chat ID is required"}), 400

        success, message = Database.delete_chat(user_sub, chat_id)

        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
    
    @app.route('/edit_chat_title', methods=['PUT'])
    @token_required
    def edit_chat_title():
        user_sub = request.user_sub
        data = request.json
        chat_id = data.get('chat_id')
        new_title = data.get('new_title')
        
        if not chat_id or not new_title:
            return jsonify({"error": "Chat ID and new title are required"}), 400

        success, message = Database.update_chat_title(user_sub, chat_id, new_title)

        if success:
            return jsonify({"message": message, "new_title": new_title}), 200
        else:
            return jsonify({"error": message}), 400
    
    @app.route('/courses', methods=['GET'])
    def get_courses():
        try:
            courses_path = os.path.join(os.path.dirname(__file__), 'courses.json')
            with open(courses_path, 'r') as f:
                courses = json.load(f)
            return jsonify(courses), 200
        except FileNotFoundError:
            return jsonify({"error": "Courses file not found"}), 404