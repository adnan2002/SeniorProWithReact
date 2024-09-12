import os
import json
import tempfile
import boto3
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain.docstore.document import Document
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

# Initialize HuggingFace embeddings
embedding_model = OpenAIEmbeddings(model="text-embedding-3-large", api_key=os.getenv('OPENAI_API_KEY'))

# Initialize S3 client
s3 = boto3.client('s3',
                  region_name='eu-north-1',
                  aws_access_key_id=os.getenv('aws_access_key'),
                  aws_secret_access_key=os.getenv('aws_secret_access_key'))

input_text = input("Enter Course Name: ")
post_fix = f"{input_text}-vector-db-openai"
folder = f"{post_fix}"  # Specify the folder name

# Function to update courses.json
def update_courses_json(course_name):
    # Use os.path.dirname(__file__) to get the correct path for courses.json
    json_file_path = os.path.join(os.path.dirname(__file__), 'courses.json')
    
    # Load existing courses from the JSON file
    with open(json_file_path, 'r') as json_file:
        courses = json.load(json_file)
    
    # Check if course already exists
    if course_name not in courses:
        # Append the new course name
        courses.append(course_name)
        
        # Write the updated courses back to the JSON file
        with open(json_file_path, 'w') as json_file:
            json.dump(courses, json_file, indent=4)
        
        print(f"Course '{course_name}' added to courses.json.")
    else:
        print(f"Course '{course_name}' already exists in courses.json.")

def create_vector_db():
    # Specify the directory containing the PDF files
    pdf_directory = "pdfs"
    
    documents = []
    
    # Iterate through all files in the pdfs directory
    for filename in os.listdir(pdf_directory):
        if filename.endswith('.pdf'):
            file_path = os.path.join(pdf_directory, filename)
            loader = PyPDFLoader(file_path)
            pages = loader.load_and_split()
            
            # Add pages to documents list with metadata
            documents.extend([
                Document(page_content=page.page_content, metadata={"source": filename})
                for page in pages
            ])

    # Create a FAISS vector store
    vector_store = FAISS.from_documents(documents=documents, embedding=embedding_model)

    # Save the vector store to a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        vector_store.save_local(temp_dir)
        
        # Upload the index files to S3
        for filename in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, filename)
            s3_key = f"{folder}/{filename}"
            s3.upload_file(file_path, 'seniorbucket', s3_key)

    print(f"Vector store created with {len(documents)} documents from {len(os.listdir(pdf_directory))} PDF files and saved successfully to S3.")
    
    # Update the JSON file with the new course
    update_courses_json(input_text)

# Call the function to create the vector store
create_vector_db()
