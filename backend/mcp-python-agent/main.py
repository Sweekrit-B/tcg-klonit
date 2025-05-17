import os
import dotenv
import google.generativeai as genai

# Load your Gemini API key
dotenv.load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Basic prompt, no tools
def run_agent(prompt):
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(prompt)
    return response.text

if __name__ == "__main__":
    result = run_agent("Write a SQL query to list upcoming appointments for tomorrow.")
    print(result)
