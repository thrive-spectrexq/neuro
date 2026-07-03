import requests
import json

def test():
    # Login
    print("Logging in...")
    r = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data={"username": "neuro", "password": "password"})
    if r.status_code != 200:
        print("Login failed:", r.text)
        return
    token = r.json()["access_token"]
    
    # Create note
    print("Creating note...")
    note_data = {
        "title": "API Test",
        "content": "Testing from script",
        "tags": ["test_tag1", "test_tag2"]
    }
    r = requests.post("http://127.0.0.1:8000/api/v1/notes", json=note_data, headers={"Authorization": f"Bearer {token}"})
    print(r.status_code)
    print(r.text)

if __name__ == "__main__":
    test()
