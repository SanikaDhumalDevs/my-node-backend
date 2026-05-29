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
GEMINI_API_KEY = "AIzaSyDm6HYtfYmG8vYFD-eitChuafTCuO-3EYM"
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
        Analyze this receipt, bill, or invoice image. It may contain printed text, tables, messy human handwriting, or be written in regional Indian languages (especially Marathi).
        
        Strict Translation Rule:
        - If any text, product name, or unit is in Marathi (or any other language), you MUST translate it accurately to English. 
        - Clean up messy handwriting into clear English text.

        Extract all individual purchased items from the bill and return them strictly as a JSON array of objects. 
        Even if there is only 1 item, return it as an array with 1 object.

        JSON Schema per item:
        [
          {
            "name": "The primary product name translated strictly to English. Avoid store names.",
            "purchaseDate": "The transaction date as YYYY-MM-DD. If not visible, return empty string.",
            "quantity": 1,
            "unit": "Must strictly be mapped to one of: 'kg', 'liter', 'packet', 'piece', 'tablet'. Translate Marathi units (like 'नग' to 'piece', 'पैकेट' to 'packet', etc.).",
            "warrantyPeriod": 12,
            "expiryDate": "The expiration date of the item as YYYY-MM-DD. If not visible, return empty string."
          }
        ]
        
        Return ONLY valid JSON. Do not include markdown backticks or any wrapper text.
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
        Provide clear, structured, and easy-to-read medical information about the medicine "{medicine_name}" in exactly five distinct points.
        
        Format your response as five separate paragraphs. You must separate each paragraph using EXACTLY two newlines (a blank line) so the frontend code can split them into individual layout cards.
        
        Use this exact structure for the five points:
        
        📌 WHAT IT IS / USES: [Provide a brief, clear explanation of what this medicine is and its primary medical uses.]
        
        ⚙️ TYPICAL DOSAGE: [Explain standard dosage guidelines and how it is typically administered.]
        
        ⚠️ COMMON SIDE EFFECTS: [List the most common side effects clearly and concisely.]
        
        🛡️ CRITICAL PRECAUTIONS: [State crucial warnings or safety guidelines.]
        
        ♻️ SAFE ECO-DISPOSAL & DONATION: [Provide instructions on how to safely dispose of this specific medicine if expired (avoiding flushing or trash throwing to prevent chemical water pollution), or if it can be donated to a local charitable free clinic if unopened with more than 30 days remaining.]
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