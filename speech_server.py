from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from deep_translator import GoogleTranslator
from gtts import gTTS
import tempfile
import os
from google import genai
from google.genai import types
from PIL import Image
import json

app = Flask(__name__)
CORS(app)

# ---------- Initialize Google GenAI SDK ----------
# Your verified active API key is preserved exactly:
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBhyHy6X8VGzFo_RSfjNI8TVMhDx_SQOA8")
client = genai.Client(api_key=GEMINI_API_KEY)

# ---------- TRANSLATION ----------
@app.route("/translate", methods=["POST"])
def translate_text():
    try:
        data = request.get_json()
        text = data.get("text", "")
        target = data.get("target", "en")
        if not text:
            return jsonify({"error": "No text provided"}), 400

        translated = GoogleTranslator(source='auto', target=target).translate(text)
        return jsonify({"translatedText": translated})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- TEXT TO SPEECH ----------
@app.route("/speak", methods=["POST"])
def speak():
    try:
        data = request.get_json()
        text = data.get("text", "")
        lang = data.get("lang", "en")

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Use gTTS to speak in given language
        tts = gTTS(text=text, lang=lang)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tts.save(temp_file.name)

        # Send file and delete after sending
        response = send_file(temp_file.name, mimetype="audio/mpeg")
        
        @response.call_on_close
        def cleanup():
            if os.path.exists(temp_file.name):
                os.remove(temp_file.name)

        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- OCR (IMAGE TO TEXT & AI PARSING) ----------
@app.route("/ocr", methods=["POST"])
def ocr():
    try:
        if "file" in request.files:
            image_file = request.files["file"]
        elif "image" in request.files:
            image_file = request.files["image"]
        else:
            return jsonify({"error": "No file uploaded in request"}), 400

        if image_file.filename == "":
            return jsonify({"error": "Empty filename uploaded"}), 400

        img = Image.open(image_file)

        prompt = """
        Analyze this receipt, bill, or invoice image. It may contain printed text, tables, or messy human handwriting.
        Extract the following data points and return them strictly in the JSON format requested.

        Field Constraints:
        1. "name": The primary product name, item description, or medication name. Avoid store names, billing metadata, or tax terms.
        2. "purchaseDate": The transaction date. Format strictly as YYYY-MM-DD. If not visible, return empty string "".
        3. "quantity": The numeric value of the quantity purchased. If not visible, default to 1.
        4. "unit": Must strictly be mapped to one of these five options: "kg", "liter", "packet", "piece", "tablet". (Map variations like 'g' or 'grams' to 'kg', 'ml' to 'liter', 'tabs' to 'tablet', 'pcs' to 'piece').
        5. "warrantyPeriod": An integer representing warranty length in months. Convert year values to months (e.g. "1 year" should be 12). If not visible, return null.
        6. "expiryDate": The expiration date of the item. Format strictly as YYYY-MM-DD. If not visible, return empty string "".
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[img, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        if not response.text:
            return jsonify({"error": "AI returned an empty response"}), 500

        parsed_data = json.loads(response.text.strip())
        return jsonify(parsed_data)

    except Exception as e:
        return jsonify({"error": f"AI Parsing failed: {str(e)}"}), 500


# ---------- RECIPE GENERATOR ----------
@app.route("/recipes", methods=["POST"])
def get_recipes():
    try:
        data = request.get_json()
        item_name = data.get("itemName", "")
        
        if not item_name:
            return jsonify({"error": "Item name is required"}), 400

        prompt = f"""
        You are a helpful recipe assistant. Suggest 4 recipes using "{item_name}". 
        Return strictly valid JSON in this format:

        [
          {{
            "name": "Recipe Name",
            "ingredients": ["ingredient1", "ingredient2"],
            "cookingTime": "XX minutes",
            "procedure": ["Step 1", "Step 2", "Step 3"]
          }}
        ]

        Make sure each recipe has cookingTime, ingredients, and procedure as arrays. Do not include extra text outside the JSON.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        if not response.text:
            return jsonify({"error": "AI returned empty recipe text"}), 500

        recipes_array = json.loads(response.text.strip())
        return jsonify({"recipes": recipes_array})

    except Exception as e:
        return jsonify({"error": f"Failed to generate recipes: {str(e)}"}), 500


# ---------- MEDICINE INFORMATION ----------
@app.route("/medicine-info", methods=["POST"])
def get_medicine_info():
    try:
        data = request.get_json()
        medicine_name = data.get("medicineName", "")
        
        if not medicine_name:
            return jsonify({"error": "Medicine name is required"}), 400

        prompt = f"""
        Provide clear, structured, and easy-to-read medical information about the medicine "{medicine_name}" in exactly four distinct points.
        
        Format your response as four separate paragraphs. You must separate each paragraph using EXACTLY two newlines (a blank line) so the frontend code can split them into individual layout cards.
        
        Use this exact structure for the four points:
        
        📌 WHAT IT IS / USES: [Provide a brief, clear explanation of what this medicine is and its primary medical uses.]
        
        ⚙️ TYPICAL DOSAGE: [Explain standard dosage guidelines and how it is typically administered.]
        
        ⚠️ COMMON SIDE EFFECTS: [List the most common side effects or adverse reactions clearly and concisely.]
        
        🛡️ CRITICAL PRECAUTIONS: [State crucial warnings, drug interactions, or safety guidelines regarding who should avoid it.]
        
        Strict formatting rules:
        - Do not use markdown headers (like # or ##).
        - Ensure there is a blank line (double newline) between each of the four points.
        - Keep every description safe, simplified, and easy to understand for a layperson.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt]
        )

        if not response.text:
            return jsonify({"error": "AI returned empty medicine text"}), 500

        return jsonify({"info": response.text.strip()})

    except Exception as e:
        return jsonify({"error": f"Failed to fetch medicine info: {str(e)}"}), 500


# ---------- CARBON FOOTPRINT SUGGESTIONS (NEW ENDPOINT) ----------
@app.route("/suggestions", methods=["POST"])
def get_carbon_suggestions():
    try:
        data = request.get_json()
        entries = data.get("entries", [])

        if not entries:
            return jsonify({"suggestions": []})

        # Filter out empty entries and sort them by totalEmission descending
        valid_entries = []
        for e in entries:
            name = e.get("itemName", e.get("name", ""))
            emission = e.get("totalEmission", 0)
            try:
                emission_val = float(emission)
            except (ValueError, TypeError):
                emission_val = 0.0

            if name and emission_val > 0:
                valid_entries.append({"name": name, "emission": emission_val})

        # Sort descending and isolate the top 3 highest emitters
        valid_entries.sort(key=lambda x: x["emission"], reverse=True)
        top_entries = valid_entries[:3]

        if not top_entries:
            return jsonify({"suggestions": []})

        # Format items to present to Gemini
        items_description = ", ".join([f"{item['name']} ({item['emission']:.2f} kg CO2e)" for item in top_entries])

        # Prompt specifying the exact structured JSON schema required by Dashboard.js
        prompt = f"""
        Analyze these high carbon-emission household items: {items_description}.
        Provide intelligent, practical environmental suggestions strictly in this JSON format (array of objects):

        [
          {{
            "item": "Item Name",
            "causes": "Brief explanation of why this item has high carbon emissions (production, electricity, transport, etc.).",
            "effects": "Brief explanation of its environmental impact (greenhouse effect, climate change, etc.).",
            "tips": [
              "Actionable tip 1 to reduce this item's specific footprint",
              "Actionable tip 2 to reduce footprint"
            ],
            "replacements": [
              "Eco-friendly alternative 1",
              "Eco-friendly alternative 2"
            ]
          }}
        ]

        Strict constraints:
        - Maintain exact matching of the JSON keys: "item", "causes", "effects", "tips", and "replacements".
        - Do not use markdown backticks (do not include ```json ... ```).
        - Keep details concise, simple, and scientifically accurate.
        """

        # Call Gemini using JSON schema enforcement
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        if not response.text:
            return jsonify({"error": "AI returned empty suggestion text"}), 500

        suggestions_array = json.loads(response.text.strip())
        return jsonify({"suggestions": suggestions_array})

    except Exception as e:
        return jsonify({"error": f"Failed to generate carbon suggestions: {str(e)}"}), 500


# ---------- MAIN ----------
if __name__ == "__main__":
    app.run(port=5001, debug=True)