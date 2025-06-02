import requests
import json

BASE_URL = "http://localhost:5015"

def test_medical_endpoints():
    print("\n=== Testing Medical Database Endpoints ===")
    
    # Test listing tables
    print("\nTesting /medical/tables:")
    response = requests.get(f"{BASE_URL}/medical/tables")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test getting schema
    print("\nTesting /medical/schema/physicians:")
    response = requests.get(f"{BASE_URL}/medical/schema/physicians")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test query
    print("\nTesting /medical/query:")
    response = requests.post(
        f"{BASE_URL}/medical/query",
        json={
            "query": "SELECT * FROM physicians",
            "params": []
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_retail_endpoints():
    print("\n=== Testing Retail Database Endpoints ===")
    
    # Test listing tables
    print("\nTesting /retail/tables:")
    response = requests.get(f"{BASE_URL}/retail/tables")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test getting schema
    print("\nTesting /retail/schema/products:")
    response = requests.get(f"{BASE_URL}/retail/schema/products")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Test query
    print("\nTesting /retail/query:")
    response = requests.post(
        f"{BASE_URL}/retail/query",
        json={
            "query": "SELECT * FROM products",
            "params": []
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_security():
    print("\n=== Testing Security Measures ===")
    
    # Test non-SELECT query
    print("\nTesting non-SELECT query:")
    response = requests.post(
        f"{BASE_URL}/medical/query",
        json={
            "query": "DELETE FROM physicians",
            "params": []
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    # Run all tests
    test_medical_endpoints()
    test_retail_endpoints()
    test_security()
