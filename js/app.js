// Helper to convert Data URL to File
function dataURLtoFile(dataUrl, filename) {
    const [header, body] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(body);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new File([array], filename, { type: mime });
  }
  
  // Elements
  const uploadBox = document.getElementById("uploadBox");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const submitBtn = document.getElementById("submitBtn");
  const responseSection = document.getElementById("responseSection");
  const dietaryPreferences = document.getElementById("dietaryPreferences");
  const allergyPreferences = document.getElementById("allergyPreferences");
  const uploadedImages = document.getElementById("uploadedImages");
  const checklistSection = document.getElementById("checklistSection");
  const finalIngredientsSection = document.getElementById("finalIngredientsSection");
  const loader = document.getElementById("loader");
  const manualIngredientInput = document.getElementById("manualIngredient");
  const addIngredientBtn = document.getElementById("addIngredientBtn");
  const finalSubmitBtn = document.getElementById("finalSubmitBtn");
  const ingredientInputBox = document.getElementById("ingredientInputBox");
  const finalIngredientsDisplay = document.getElementById("finalIngredientsDisplay");
  const recipeDisplaySection = document.getElementById("recipeDisplaySection");
  
  // Variables
  let uploadedImageFiles = JSON.parse(localStorage.getItem("uploadedImages")) || [];
  let selectedIngredients = [];
  let addedIngredients = [];
  const DIETARY = "dietary";
  const ALLERGY = "allergy";

  
  const SPOONACULAR_API_KEY = "6756d2feb04246b5b5a1e19301f63742"; //sj
  // const SPOONACULAR_API_KEY = "d35c874c481a4982b13def27755c86f7"; //pv

  function toggleLoader(show) {
    if (show) {
      loader.classList.remove("d-none");
    } else {
      toggleLoader(true);
    }
  }

  // Display images from localStorage
  uploadedImageFiles.forEach((fileData) => {
    displayImage(fileData);
  });
  
  // File upload handlers
  uploadBox.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", (event) => handleFiles(event.target.files));
  uploadBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadBox.style.borderColor = "#0073e6";
  });
  uploadBox.addEventListener("dragleave", () => {
    uploadBox.style.borderColor = "#ccc";
  });
  uploadBox.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadBox.style.borderColor = "#ccc";
    handleFiles(event.dataTransfer.files);
  });
  
  function handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileData = { name: file.name, data: e.target.result };
          uploadedImageFiles.push(fileData);
          localStorage.setItem("uploadedImages", JSON.stringify(uploadedImageFiles));
          displayImage(fileData);
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please upload only image files.");
      }
    });
  }
  
  function displayImage(fileData) {
    const imgContainer = document.createElement("div");
    imgContainer.classList.add("img-container", "position-relative", "m-2");
  
    const img = document.createElement("img");
    img.src = fileData.data;
    img.alt = "Ingredient Image";
    img.classList.add("img-thumbnail");
  
    const removeBtn = document.createElement("button");
    removeBtn.classList.add("btn", "btn-sm", "position-absolute", "top-0", "end-0", "m-2", "remove-btn");
    removeBtn.innerHTML = "&#10006;";
  
    removeBtn.addEventListener("click", () => {
      uploadedImageFiles = uploadedImageFiles.filter((f) => f !== fileData);
      localStorage.setItem("uploadedImages", JSON.stringify(uploadedImageFiles));
      imgContainer.remove();
    });
  
    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    imagePreview.appendChild(imgContainer);
  }
  
  // Save Preferences and Submit
  submitBtn.addEventListener("click", async () => {
    addedIngredients.length = 0
    selectedIngredients.length = 0
    responseSection.classList.remove("d-none");
    const dietarySelections = collectSelections(DIETARY);
    const allergySelections = collectSelections(ALLERGY);
  
    dietaryPreferences.textContent = dietarySelections.length
      ? `Dietary Preferences: ${dietarySelections.join(", ")}`
      : "No dietary preferences selected.";
    allergyPreferences.textContent = allergySelections.length
      ? `Allergy Preferences: ${allergySelections.join(", ")}`
      : "No allergies selected.";
  
    displayUploadedImages();
  
    // Remove loader here (Make sure it's not visible before processing)
    toggleLoader(false);
  
    // Trigger image upload and ingredient fetching
    await uploadImages(dietarySelections, allergySelections);
  });
  
  function collectSelections(type) {
    const selections = [];
    const options = document.querySelectorAll(`input[name="${type}"]:checked`);
    options.forEach((opt) => selections.push(opt.value));
    return selections;
  }
  
  function displayUploadedImages() {
    uploadedImages.innerHTML = "";
    uploadedImageFiles.forEach((fileData) => {
      const img = document.createElement("img");
      img.src = fileData.data;
      img.alt = "Uploaded Ingredient Image";
      img.classList.add("img-thumbnail", "m-2");
      uploadedImages.appendChild(img);
    });
  }
  
  async function uploadImages(dietarySelections, allergySelections) {
    const formData = new FormData();
    uploadedImageFiles.forEach((fileData) => {
      const file = dataURLtoFile(fileData.data, fileData.name);
      formData.append("file", file);
    });
  
    try {
      toggleLoader(true);  // Show loader during upload
  
      const response = await fetch("https://smart-recipe-generator.onrender.com/upload/", { method: "POST", body: formData });
      const result = await response.json();
      
      // Check for empty or invalid response
      if (!result || !Array.isArray(result.filtered_fruits_and_vegetables) || result.filtered_fruits_and_vegetables.length === 0) {
        alert("No recognizable ingredients found, please try again with a different image!");
        return; // Stop further execution
      }

      if (response.ok) {
        populateChecklist(result.filtered_fruits_and_vegetables);
        console.log("called");
        
        ingredientInputBox.classList.remove("d-none");
      } else {
        console.error("Error uploading images:", result.message);
        alert("Error uploading the image. Please try again!")
        toggleLoader(false);  // Hide loader after the upload process
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Error uploading the image. Please try again!")
      toggleLoader(false);  // Hide loader after the upload process
    } finally {
      toggleLoader(false);  // Hide loader after the upload process
    }
}

  
  // Populate checklist with ingredients
function populateChecklist(items) {
    checklistSection.innerHTML = "<h4>Select Ingredients:</h4>";
    items.forEach((item) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = item;
      checkbox.classList.add("form-check-input");
  
      const label = document.createElement("label");
      label.textContent = item;
      label.classList.add("form-check-label", "ms-2");
      label.prepend(checkbox);
  
      const wrapper = document.createElement("div");
      wrapper.classList.add("form-check", "mb-2");
      wrapper.appendChild(label);
      checklistSection.appendChild(wrapper);
  
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedIngredients.push(item);
        } else {
          selectedIngredients = selectedIngredients.filter((i) => i !== item);
        }
      });
    });
  
    finalSubmitBtn.classList.remove("d-none");
  }
  
  // Manual Ingredient Handling
  addIngredientBtn.addEventListener("click", () => {
    const ingredient = manualIngredientInput.value.trim();
    if (ingredient) {
      addedIngredients.push(ingredient);
    //   displayAddedIngredient(ingredient);
      addToChecklistAndSelect(ingredient);
      manualIngredientInput.value = "";
    }
  });
  
  function displayAddedIngredient(ingredient) {
    const ingredientDiv = document.createElement("div");
    ingredientDiv.classList.add("ingredient-item", "mb-2");
    ingredientDiv.textContent = ingredient;
    checklistSection.appendChild(ingredientDiv);
  }
  
  // Add manually entered ingredient to checklist and select it
  function addToChecklistAndSelect(ingredient) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = ingredient;
    checkbox.checked = true; // Automatically select the checkbox
    checkbox.classList.add("form-check-input");
  
    const label = document.createElement("label");
    label.textContent = ingredient;
    label.classList.add("form-check-label", "ms-2");
    label.prepend(checkbox);
  
    const wrapper = document.createElement("div");
    wrapper.classList.add("form-check", "mb-2");
    wrapper.appendChild(label);
    checklistSection.appendChild(wrapper);
  
    // Add the ingredient to selected ingredients array since it's selected
    selectedIngredients.push(ingredient);
  
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedIngredients.push(ingredient);
      } else {
        selectedIngredients = selectedIngredients.filter((i) => i !== ingredient);
      }
    });
  }
  
  
  // Final Save Button and Fetch Recipes
  finalSubmitBtn.addEventListener("click", async () => {
    const finalIngredients = [...selectedIngredients, ...addedIngredients];
    const dietarySelections = collectSelections(DIETARY);
    const allergySelections = collectSelections(ALLERGY);
    finalIngredientsDisplay.innerHTML = `Final Ingredients: ${finalIngredients.join(", ")}`;
  
    // Show loader while fetching recipes
    toggleLoader(true);
    await fetchRecipesFromAPI(finalIngredients, dietarySelections, allergySelections);
    toggleLoader(false);
  });
  
  // Function to fetch recipes and allow user selection
  async function fetchRecipesFromAPI(ingredients, dietaryPreferences, allergyPreferences) {
    const query = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      includeIngredients: ingredients.join(","),
      diet: dietaryPreferences.join(","),
      intolerances: allergyPreferences.join(","),
      number: 5, // Fetch 5 recipes
    });
  
    try {
      const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${query}&ignorePantry=false`);
      console.log(`https://api.spoonacular.com/recipes/complexSearch?${query}&fillIngredients=true&ignorePantry=false`);
      
      if (!response.ok) {
        alert("Unable to fetch recipes. Please try again.");
      }     

      const data = await response.json();
      console.log(data);
      
      displayRecipes(data.results);
    } catch (error) {
      console.error("Error fetching recipes:", error); 
    }
  }
  
  function displayRecipes(recipes) {
    recipeDisplaySection.classList.remove("d-none");
    recipeDisplaySection.innerHTML = "<h4>Available Recipes:</h4>";
  
    if (!recipes.length) {
      recipeDisplaySection.innerHTML += "<p>No recipes found. Try removing one or more ingredients and we might be able to help you!</p>";
      return;
    }
  
    recipes.forEach((recipe) => {
      const recipeDiv = document.createElement("div");
      recipeDiv.classList.add("recipe-item", "mb-3");
      recipeDiv.innerHTML = `
        <h5>${recipe.title}</h5>
        <img src="${recipe.image}" alt="${recipe.title}" class="img-thumbnail">
        <button class="btn btn-info mt-2" onclick="selectRecipe(${recipe.id})">View Details</button>
      `;
      recipeDisplaySection.appendChild(recipeDiv);
    });
  }
  
  // Function to fetch and display recipe details
  async function selectRecipe(recipeId) {
    toggleLoader(true);
  
    try {
      const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}`);
      
      if (!response.ok) {
        alert("Unable to fetch recipes. Please try again.");
      }     
      
      const data = await response.json();
      showRecipeDetails(data);
    } catch (error) {
      console.error("Error fetching recipe details:", error);
    } finally {
      toggleLoader(false);
    }
  }
  
  function showRecipeDetails(recipe) {
    console.log(recipe)
    const recipeDetails = document.createElement("div");
    recipeDetails.classList.add("recipe-details");

    // Create elements for each detail
    recipeDetails.innerHTML = `
      <h4>${recipe.title}</h4>
      <img src="${recipe.image}" alt="${recipe.title}" class="img-thumbnail mb-3">
      <p><strong>Ready In:</strong> ${recipe.readyInMinutes} minutes</p>
      <p><strong>Servings:</strong> ${recipe.servings}</p>
      <p><strong><a href="${recipe.sourceUrl}" target="_blank">View Full Recipe</a></strong></p>
      
      <h5>Ingredients:</h5>
      <ul>
        ${recipe.extendedIngredients.map(ingredient => `
            <li>
              <img src="https://spoonacular.com/cdn/ingredients_100x100/${ingredient.image}" alt="${ingredient.name}" class="ingredient-image">
              ${ingredient.original}
            </li>
          `)
        .join('')}
      </ul>
      
      <h5>Instructions:</h5>
      <ol>
        ${recipe.analyzedInstructions.flatMap(instruction => instruction.steps.map(step => `
          <li>
            ${step.step}
          </li>
        `)).join('')}
      </ol>
    `;
    
    // Clear the previous content and append the new recipe details
    recipeDisplaySection.innerHTML = "";
    recipeDisplaySection.appendChild(recipeDetails);
}

  