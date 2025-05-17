# auth_test.py
from tools.calendar_tool import authorize

# This will trigger OAuth flow and create token.json
authorize()
print("✅ Token generated and saved to token.json")
