import google.generativeai as genai
from google.cloud import vision
import json
import re
import os
import asyncio
from PIL import Image
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ingredients import ingredients_list

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

# Function to preprocess the image
def preprocess_image(image_content):
    """Resize and compress the image to make it lightweight for Vision API."""
    try:
        with Image.open(BytesIO(image_content)) as img:
            img = img.convert("RGB")  # Ensure image is in RGB format
            img = img.resize((800, 800))  # Resize to 800x800 pixels
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=85)  # Compress and save as JPEG
            return buffer.getvalue()
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return image_content  # Return the original image if preprocessing fails

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
def gemini_filter(labels):
    """Filter out fruits and vegetables using Gemini API."""
    labels_str = ", ".join(labels)
    print(f"Labels detected: {labels_str}")

    query = (
        f"From [{labels_str}], return a JSON array of specific edible ingredients filtered out from the given array: "
        f"- Include common fruits, vegetables, meats, seafood, dairy, eggs, grains, spices, herbs, teas, coffees, and condiments. "
        f"- Exclude generic terms (e.g., 'Ingredient,' 'Food'), prepared foods (e.g., 'masala chai'), non-consumables (e.g., 'Tableware'), "
        f"broad categories (e.g., 'Spice'), and rare or uncommon items. "
        f"Respond with a valid JSON array without any kind of formatting, no extra text, no extra description or errors."
    )

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(query)

    if not response or not hasattr(response, 'text') or not response.text.strip():
        print("Invalid or empty response from Gemini API.")
        return []

    filtered_labels_str = response.text.strip()
    print(f"Raw response from Gemini API: {filtered_labels_str}")

    if filtered_labels_str.startswith("```") and filtered_labels_str.endswith("```"):
        filtered_labels_str = filtered_labels_str.strip("```").strip()

    match = re.search(r'\[.*?\]', filtered_labels_str)
    if match:
        filtered_labels_str = match.group(0)
        try:
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

# Wrapper for Gemini filtering with timeout
async def filter_with_timeout(labels, timeout=0.2):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        try:
            return await asyncio.wait_for(loop.run_in_executor(executor, gemini_filter, labels), timeout)
        except asyncio.TimeoutError:
            print("Gemini API timed out. Returning locally filtered labels.")
            return [label for label in labels if label.lower() in ingredients_list]

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

        # Preprocess the image to make it lightweight
        processed_image = preprocess_image(image_content)

        # Detect labels using Google Vision API
        labels = detect_labels(processed_image)

        # Filter fruits and vegetables using Gemini API with timeout
        filtered_labels = await filter_with_timeout(labels)

        return {"filtered_fruits_and_vegetables": filtered_labels}
    except Exception as e:
        print(f"Error processing the image: {e}")
        return {"error": "An error occurred while processing the image"}

# Run the FastAPI app using Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
