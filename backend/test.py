import asyncio
from server import SqlServer

async def run_label_edit_test():
    db = SqlServer()
    
    # Step 1: Initialize DB
    print("Initializing database...")
    await db.initialize_db()

    # Step 2: Get original labels
    print("\n[Original Labels]")
    labels = await db.get_labels()
    print(labels["content"][0]["text"])

    # Step 3: Simulate editing a label
    print("\n[Editing Label: patients → 'Patient Details']")
    update = await db.update_label("patients", "Patient Details")
    print(update["content"][0]["text"])

    # Step 4: Confirm update
    print("\n[Labels After Update]")
    updated_labels = await db.get_labels()
    print(updated_labels["content"][0]["text"])

    # Step 5: Revert for safety (optional)
    print("\n[Reverting Label]")
    await db.update_label("patients", "Patient Information")

    await db.close()

if __name__ == "__main__":
    asyncio.run(run_label_edit_test())
