import requests

BASE = "http://localhost:8000/api/v1"
EMAIL = "test@marche-ia.cm"
PASSWORD = "Password123!"

# Login
token = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}).json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Question
question = input("Ta question : ")
reponse = requests.post(f"{BASE}/chat", json={"question": question}, headers=headers).json()

print("\n--- REPONSE ---")
print(reponse["answer"])
print("\n--- SOURCES ---")
for s in reponse["sources"]:
    print(f"  - {s['source_name']} {s['article_ref']}")
