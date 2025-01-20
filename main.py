import google.generativeai as genai
from google.cloud import vision
import ast
import re
import os
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import logging
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GENAI_API_KEY"))

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all domains (you can restrict this to specific origins)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Initialize Google Cloud Vision Client
def detect_labels(image_content, max_results=50):
    """Detects labels in the file using Vision API."""
    client = vision.ImageAnnotatorClient()

    image = vision.Image(content=image_content)

    feature = vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=max_results)
    request = vision.AnnotateImageRequest(image=image, features=[feature])
    response = client.annotate_image(request=request)

    labels = [label.description for label in response.label_annotations]
    print(labels)
    return labels

# Function to query Gemini for filtering fruits and vegetables
def filter_fruits_and_vegetables(labels):
    """Filter out fruits and vegetables using Gemini API."""
    
    # Prepare the prompt for Gemini
    labels_str = ", ".join(labels)
    query = f"Here is an array: [{labels_str}] Filter out the ingredients that are not commonly found in a typical household kitchen, such as rare or exotic varieties. Return only the ingredients that are most commonly found in households, in an array. Only return the array in your response, no other explanation or categorization."

    # Make a request to Gemini
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(query)
    
    # Extract the filtered list from the response and parse it
    filtered_labels_str = response.text.strip()
    
    # Use regex to extract content between square brackets
    match = re.search(r'\[(.*?)\]', filtered_labels_str)
    if match:
        filtered_labels_str = match.group(1)  # Get the content inside brackets
        
        # Try to safely convert the response text into a list (assumes the response is in array format)
        try:
            filtered_labels = ast.literal_eval(filtered_labels_str)
        except ValueError:
            filtered_labels = []  # If there's an issue with parsing, return an empty list
    else:
        filtered_labels = []

    return filtered_labels

@app.get("/")
def root():
    return {"Text" : "Helper API"}

# FastAPI endpoint for image upload and label extraction
@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    """Accepts an image, processes it, and returns a list of fruits and vegetables."""
    
    # Read the uploaded image content
    image_content = await file.read()

    # Detect labels using Google Vision API
    labels = detect_labels(image_content)

    # Filter fruits and vegetables using Gemini
    filtered_labels = filter_fruits_and_vegetables(labels)

    return {"filtered_fruits_and_vegetables": filtered_labels}

# Run the FastAPI app using Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
