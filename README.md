# TL;DR
The **Smart Recipe Generator** is a web app that allows users to upload images of ingredients, which are then recognized and refined using Google Vision and Gemini APIs. Users can customize recipe suggestions by entering dietary preferences and restrictions. The app fetches recipes from the Spoonacular API, allowing users to view detailed instructions. No user accounts are required, and no data is stored after the session ends.

# Smart Recipe Generator

The Smart Recipe Generator is a web application that helps users create recipes instantly by analyzing uploaded images of ingredients. With a focus on simplicity and privacy, this app does not require user accounts or retain any data after the session ends.

## Key Features

### Image-Based Ingredient Recognition
Upload or drag-and-drop images of ingredients, and the app will identify them using the Google Vision API.

### Dietary Preferences and Restrictions
Provide dietary preferences and restrictions through a simple form to customize recipe suggestions.

### Ingredient Editing
Review and edit the identified ingredient list to ensure accuracy.

### Recipe Suggestions
Fetch recipes based on the finalized ingredient list and user preferences from the Spoonacular API.

### Detailed Recipe View
Select a recipe from the suggestions to view detailed instructions and ingredients.

## Project Workflow

### Frontend Interaction:
- Users interact with a visually intuitive interface to upload images, specify dietary preferences, and view recipe results.

### Image Processing:
- Uploaded images are sent to the Google Vision API for ingredient recognition, which is then refined by the Gemini API for greater accuracy.

### User Adjustment:
- Recognized ingredients are displayed, allowing users to make adjustments as needed.

### Recipe Retrieval:
- The finalized list of ingredients and user preferences are sent to the Spoonacular API to fetch relevant recipe options.

### Recipe Selection and Display:
- Users select a recipe to view detailed instructions, including steps and measurements.

## Technology Stack

### Frontend
- **HTML, CSS, JavaScript**: For user interface and interactivity.

### Backend
- **JavaScript**: Core backend logic for handling API requests.
- **Python (FastAPI)**: Provides additional backend functionality through the helper API implemented in `main.py`.

### APIs
- **Google Vision API**: For image processing and ingredient detection.
- **Gemini API**: For refining ingredient recognition.
- **Spoonacular API**: To fetch recipe suggestions based on user inputs.

## Installation

### Frontend Setup
1. Clone the repository:
    ```bash
    git clone https://github.com/pushkar2112/smart-recipe-generator.git
    ```
2. Navigate to the project directory:
    ```bash
    cd smart-recipe-generator
    ```
3. Open the `index.html` file in your browser to run the app locally.

### Backend Setup (Python)
1. Ensure Python 3.9 or higher is installed.
2. Install dependencies using the `requirements.txt` file:
    ```bash
    pip install -r requirements.txt
    ```
3. Run the helper API:
    ```bash
    uvicorn main:app --reload
    ```
4. Update the upload file endpoint in the frontend code to point to the running API instance (default: `http://127.0.0.1:8000`).

## Usage
1. Start the backend server using FastAPI.
2. Open the app in your browser.
3. Upload images of ingredients and adjust the recognized list if needed.
4. Enter dietary preferences and restrictions.
5. Fetch recipe suggestions and select a recipe to view its details.

## Privacy and Data Handling
- No user accounts or login required.
- Data is processed on the fly and is not stored after the user exits the session.

## Future Enhancements
- Adding support for multiple languages.
- Allowing users to save or share recipes without compromising privacy.
- Integrating more robust dietary preference filters.

## Contributions
Contributions are welcome! If you'd like to contribute:
1. Fork the repository.
2. Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b feature-name
    ```
3. Commit your changes and push them to your fork.
4. Open a pull request on the main repository.

## License
This project is open-source and available under the MIT License.

## Contact
For questions, suggestions, or feedback, feel free to open an issue or contact the repository owner via GitHub.
