import google.generativeai as genai
from google.cloud import vision
import json
import re
import os
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GENAI_API_KEY"))

# Initialize FastAPI app
app = FastAPI()

# Configure CORS middleware
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
    return labels

# Function to query Gemini for filtering fruits and vegetables
def filter_fruits_and_vegetables(labels):
    """Filter out fruits and vegetables using Gemini API."""
    labels_str = ", ".join(labels)
    print(f"Labels detected: {labels_str}")

    # Prepare the query for Gemini API
    query = (
        f"Here is an array of ingredients: [{labels_str}] Please filter out any ingredients "
        f"that are rare, exotic, or unusual, and return only those that are commonly found "
        f"in a typical household kitchen (such as pantry staples, common vegetables, fruits, "
        f"everyday seasonings, and common proteins like chicken, turkey, eggs, or other widely "
        f"available and frequently used proteins). Ensure that your response is a valid JSON array, "
        f"and nothing else. Do not include any code blocks, explanations, or additional formatting. "
        f"Only provide a JSON array as the output."
    )

    # Make a request to Gemini API
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(query)

    if not response or not hasattr(response, 'text') or not response.text.strip():
        print("Invalid or empty response from Gemini API.")
        return []

    filtered_labels_str = response.text.strip()
    print(f"Raw response from Gemini API: {filtered_labels_str}")

    # Remove code block formatting if present
    if filtered_labels_str.startswith("```") and filtered_labels_str.endswith("```"):
        filtered_labels_str = filtered_labels_str.strip("```").strip()

    # Extract the JSON array using regex as a fallback
    match = re.search(r'\[.*?\]', filtered_labels_str)
    if match:
        filtered_labels_str = match.group(0)
        try:
            # Safely parse the JSON array
            filtered_labels = json.loads(filtered_labels_str)
            if not isinstance(filtered_labels, list):
                print("Parsed response is not a list.")
                return []
        except json.JSONDecodeError:
            print("Error parsing the filtered labels response.")
            filtered_labels = []
    else:
        print("No valid array found in the response.")
        filtered_labels = []

    print(f"Filtered labels: {filtered_labels}")
    return filtered_labels


@app.get("/")
def root():
    return {"message": "Welcome to the Helper API"}

# FastAPI endpoint for image upload and label extraction
@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    """Accepts an image, processes it, and returns a list of fruits and vegetables."""
    try:
        # Read the uploaded image content
        image_content = await file.read()

        # Detect labels using Google Vision API
        labels = detect_labels(image_content)

        # Filter fruits and vegetables using Gemini API
        filtered_labels = filter_fruits_and_vegetables(labels)

        return {"filtered_fruits_and_vegetables": filtered_labels}
    except Exception as e:
        print(f"Error processing the image: {e}")
        return {"error": "An error occurred while processing the image"}

# Run the FastAPI app using Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
