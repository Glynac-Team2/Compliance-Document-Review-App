import json
import httpx
import os

_PRECEDENT_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "doc_type": {"type": "string"},
            "masked_text": {"type": "string"},
            "decision": {
                "type": "string",
                "enum": ["approved", "rejected", "needs_revision"]
            },
            "officer_comment": {"type": "string"}
        },
        "required": ["id", "doc_type", "masked_text", "decision", "officer_comment"]
    }
}

PROMPT = """
You are generating a synthetic dataset of historical compliance reviews for a financial advisory firm.
Generate a batch of 10 highly realistic financial documents (emails, pitch decks, social media posts).

Crucial Data Constraints:
1. PII MASKING: You MUST NEVER use real names, addresses, or phone numbers. Replace all personal/entity names with [CLIENT_1], [CLIENT_2], etc. Replace account numbers with [ACCOUNT_1]. Replace dollar amounts with [AMOUNT_1]. 
2. VARIETY: Mix the 'doc_type' (e.g., marketing_email, client_text_message, quarterly_report). Mix the asset classes (equities, crypto, real estate).
3. OUTCOMES: 
   - Some should be 'approved' (perfectly compliant, balanced risk).
   - Some should be 'rejected' (blatant violations like promising guaranteed returns, ignoring risks, or high-pressure sales tactics).
   - Some should be 'needs_revision' (mostly fine, but missing a required disclaimer or minor tweak).
"""

def generate_batch():
    # Gemini API key in your environment or .env file
    api_key = os.getenv("GEMINI_API_KEY") 
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    #bundling prompt and your schema into the request payload
    payload = {
        "contents": [{"parts": [{"text": PROMPT}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _PRECEDENT_SCHEMA
        }
    }
    
    print("Calling Gemini API...")
    response = httpx.post(url, json=payload, timeout=60.0)
    
    if response.status_code == 200:
        data = response.json()
        # Navigating Gemini's response dictionary to extract just the text
        generated_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(generated_text)
    else:
        print(f"API Error: {response.text}")
        return []

if __name__ == "__main__":
    # testing with just 1 batch (10 documents) first
    results = generate_batch()
    
    if results:
        # Saving the list of dictionaries to a JSON file
        with open("seed_precedents.json", "w") as f:
            json.dump(results, f, indent=2)
        print(f"Success! Saved {len(results)} records to seed_precedents.json")