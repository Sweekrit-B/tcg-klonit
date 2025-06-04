import asyncio
from server import SqlServer

async def run_label_edit_test():
    db = SqlServer()

    # Step 1: Initialize DB
    print("Initializing database...")
    await db.initialize_db()

    # Step 2: Show original patient labels
    print("\n[Original Patient Labels]")
    labels = await db.get_labels()
    print(labels["content"][0]["text"])

    # Step 3: First table-level update
    print("\n[Editing Label: patients → 'Patient Details']")
    update1 = await db.update_label("patients", "Patient Details")
    print(update1["content"][0]["text"])

    # Step 4: Second table-level update
    print("\n[Editing Label Again: patients → 'Patient Overview']")
    update2 = await db.update_label("patients", "Patient Overview")
    print(update2["content"][0]["text"])

    # Step 5: View updated labels
    print("\n[Labels After Second Update]")
    updated_labels = await db.get_labels()
    print(updated_labels["content"][0]["text"])

    # Step 6: Revert patient table label
    print("\n[Reverting Label to 'Patient Information']")
    await db.update_label("patients", "Patient Information")

    # Step 7: Update label for one patient
    print("\n[Editing Label for Patient ID 3 → 'Hello World']")
    patient_update = await db.update_patient_label(3, "Hello World")
    print(patient_update["content"][0]["text"])

    # Step 8: Confirm patient label update
    print("\n[Patient Labels After Patient Update]")
    patient_labels = await db.get_patient_labels()
    print(patient_labels["content"][0]["text"])

    # Step 9: Update label for one appointment
    print("\n[Editing Label for Appointment ID 2 → 'Follow-up Session']")
    appointment_update = await db.update_appointment_label(2, "Follow-up Session")
    print(appointment_update["content"][0]["text"])

    # Step 10: Confirm appointment label update
    print("\n[Appointment Labels After Update]")
    appointment_labels = await db.get_appointment_labels()
    print(appointment_labels["content"][0]["text"])

    # Step 11: Update label for one treatment
    print("\n[Editing Label for Treatment ID 1 → 'Updated Treatment Plan']")
    treatment_update = await db.update_treatment_label(1, "Updated Treatment Plan")
    print(treatment_update["content"][0]["text"])

    # Step 12: Confirm treatment label update
    print("\n[Treatment Labels After Update]")
    treatment_labels = await db.get_treatment_labels()
    print(treatment_labels["content"][0]["text"])

    # Step 13: Update label for one physician
    print("\n[Editing Label for Physician ID 2 → 'Primary Consultant']")
    physician_update = await db.update_physician_label(2, "Primary Consultant")
    print(physician_update["content"][0]["text"])

    # Step 14: Confirm physician label updates
    print("\n[Physician Labels After Update]")
    physician_labels = await db.get_physician_labels()
    print(physician_labels["content"][0]["text"])

    await db.close()

if __name__ == "__main__":
    asyncio.run(run_label_edit_test())
