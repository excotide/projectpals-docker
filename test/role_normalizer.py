"""
ProjectPals - Role Normalizer Prototype
Jalankan: python role_normalizer.py
"""

import os
from groq import Groq
from rapidfuzz import fuzz, process

# ──────────────────────────────────────────
# SIMULASI DATABASE (in-memory)
# ──────────────────────────────────────────
database: list[str] = []

# ──────────────────────────────────────────
# LAYER 1: Fuzzy DB lookup
# ──────────────────────────────────────────
def check_database(input_role: str, threshold: int = 80) -> str | None:
    if not database:
        return None
    cleaned = input_role.strip().lower()
    result = process.extractOne(cleaned, database, scorer=fuzz.token_sort_ratio)
    if result and result[1] >= threshold:
        return result[0]
    return None

# ──────────────────────────────────────────
# LAYER 2: Groq/Llama fallback
# ──────────────────────────────────────────
def ask_ai(input_role: str, api_key: str) -> str:
    client = Groq(api_key=api_key)
    prompt = (
        f"You are a role name normalizer for a team project platform. "
        f"Convert the following role input into a simple, commonly used role name in English. "
        f"Use 1-3 words only, lowercase, no special characters. "
        f"Return ONLY the normalized role name, nothing else.\n\n"
        f"Input: {input_role}"
    )
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=20,
        temperature=0.1,
    )
    return response.choices[0].message.content.strip().lower()

# ──────────────────────────────────────────
# MAIN NORMALIZE FUNCTION
# ──────────────────────────────────────────
def normalize_role(input_role: str, api_key: str) -> dict:
    print(f"\n{'─'*45}")
    print(f"  Input   : '{input_role}'")

    # Layer 1: DB fuzzy lookup
    result = check_database(input_role)
    if result:
        print(f"  Layer 1 : DB fuzzy match  → '{result}'")
        return {"canonical": result, "layer": 1, "saved": False}

    # Layer 2: AI
    print(f"  Layer 2 : tidak ada match, tanya AI...")
    ai_result = ask_ai(input_role, api_key)
    print(f"  AI raw  : '{ai_result}'")

    # Layer 2b: fuzzy check lagi setelah AI
    db_check = check_database(ai_result)
    if db_check:
        print(f"  Layer 2b: AI result mirip DB → pakai '{db_check}'")
        return {"canonical": db_check, "layer": 2, "saved": False}

    # Simpan canonical baru
    _save_to_db(ai_result)
    return {"canonical": ai_result, "layer": 2, "saved": True}

def _save_to_db(canonical: str):
    cleaned = canonical.strip().lower()
    if cleaned not in database:
        database.append(cleaned)
        print(f"  DB      : simpan canonical baru → '{cleaned}'")
    else:
        print(f"  DB      : '{cleaned}' sudah ada, skip")

# ──────────────────────────────────────────
# CLI
# ──────────────────────────────────────────
def main():
    print("╔══════════════════════════════════════════╗")
    print("║   ProjectPals - Role Normalizer CLI      ║")
    print("║   ketik 'db' untuk lihat database        ║")
    print("║   ketik 'exit' untuk keluar              ║")
    print("╚══════════════════════════════════════════╝")

    api_key = os.environ.get("GROQ_API_KEY") or input("\nMasukkan Groq API key: ").strip()

    while True:
        user_input = input("\nInput role: ").strip()
        if not user_input:
            continue
        if user_input.lower() == "exit":
            print("Bye!")
            break
        if user_input.lower() == "db":
            print(f"\nDatabase saat ini ({len(database)} canonical):")
            for i, r in enumerate(database, 1):
                print(f"  {i}. {r}")
            continue

        result = normalize_role(user_input, api_key)
        print(f"  ✓ Final : '{result['canonical']}' (via layer {result['layer']})")

if __name__ == "__main__":
    main()