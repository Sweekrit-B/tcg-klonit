import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testSqlMCP() {
  console.log("Starting SQL Connector MCP test...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.js"],
  });

  const client = new Client({
    name: "SQL Test Client",
    version: "1.0.0",
  });

  // Unique test identifiers
  const testPatientEmail = "testuser+integration@example.com";
  const testAppointmentEventId = "evt-integration-test";
  const testTreatmentProblem = "IntegrationTestProblem";
  const testPhysicianLastName = "IntegrationTestPhysician";

  try {
    console.log("Connecting to MCP server...");
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // List Tables
    console.log("\nTest 1: List Tables");
    try {
      const response = await client.callTool({
        name: "listTables",
        arguments: {},
      });
      console.log("✅ Tables:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ List Tables Error:", error.message);
    }

    // Clean up any leftover test objects from previous runs
    await client.callTool({
      name: "deleteData",
      arguments: { tableName: "patients", where: { email: testPatientEmail } },
    });
    await client.callTool({
      name: "deleteData",
      arguments: {
        tableName: "appointments",
        where: { google_calendar_event_id: testAppointmentEventId },
      },
    });
    await client.callTool({
      name: "deleteData",
      arguments: {
        tableName: "treatments",
        where: { problem: testTreatmentProblem },
      },
    });
    await client.callTool({
      name: "deleteData",
      arguments: {
        tableName: "physicians",
        where: { last_name: testPhysicianLastName },
      },
    });

    // CRUD for patients (test object only)
    // Insert
    console.log("\nTest: Insert new patient");
    try {
      const response = await client.callTool({
        name: "insertData",
        arguments: {
          tableName: "patients",
          data: {
            email: testPatientEmail,
            first_name: "Integration",
            last_name: "Test",
            phone_number: "555-1234",
            date_of_birth: "2001-01-01",
            pin: "11112222",
          },
        },
      });
      console.log("✅ Insert Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Insert Patient Error:", error.message);
    }
    // Update
    console.log("\nTest: Update patient");
    try {
      const response = await client.callTool({
        name: "updateData",
        arguments: {
          tableName: "patients",
          data: {
            phone_number: "555-5678",
          },
          where: {
            email: testPatientEmail,
          },
        },
      });
      console.log("✅ Update Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Update Patient Error:", error.message);
    }
    // Delete
    console.log("\nTest: Delete patient");
    try {
      const response = await client.callTool({
        name: "deleteData",
        arguments: {
          tableName: "patients",
          where: {
            email: testPatientEmail,
          },
        },
      });
      console.log("✅ Delete Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Delete Patient Error:", error.message);
    }

    // CRUD for appointments (test object only)
    // Insert
    console.log("\nTest: Insert new appointment");
    try {
      const response = await client.callTool({
        name: "insertData",
        arguments: {
          tableName: "appointments",
          data: {
            patient_id: 1,
            physician_id: 1,
            appointment_datetime: "2024-07-01 10:00:00",
            appointment_type: "IntegrationTest",
            notes: "Integration test appointment",
            google_calendar_event_id: testAppointmentEventId,
          },
        },
      });
      console.log("✅ Insert Appointment Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Insert Appointment Error:", error.message);
    }
    // Update
    console.log("\nTest: Update appointment");
    try {
      const response = await client.callTool({
        name: "updateData",
        arguments: {
          tableName: "appointments",
          data: {
            notes: "Updated integration test appointment",
          },
          where: {
            google_calendar_event_id: testAppointmentEventId,
          },
        },
      });
      console.log("✅ Update Appointment Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Update Appointment Error:", error.message);
    }
    // Delete
    console.log("\nTest: Delete appointment");
    try {
      const response = await client.callTool({
        name: "deleteData",
        arguments: {
          tableName: "appointments",
          where: {
            google_calendar_event_id: testAppointmentEventId,
          },
        },
      });
      console.log("✅ Delete Appointment Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Delete Appointment Error:", error.message);
    }

    // CRUD for treatments (test object only)
    // Insert
    console.log("\nTest: Insert new treatment");
    try {
      const response = await client.callTool({
        name: "insertData",
        arguments: {
          tableName: "treatments",
          data: {
            patient_id: 1,
            problem: testTreatmentProblem,
            treatment: "IntegrationTestTreatment",
            physician_id: 1,
          },
        },
      });
      console.log("✅ Insert Treatment Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Insert Treatment Error:", error.message);
    }
    // Update
    console.log("\nTest: Update treatment");
    try {
      const response = await client.callTool({
        name: "updateData",
        arguments: {
          tableName: "treatments",
          data: {
            treatment: "Updated IntegrationTestTreatment",
          },
          where: {
            problem: testTreatmentProblem,
          },
        },
      });
      console.log("✅ Update Treatment Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Update Treatment Error:", error.message);
    }
    // Delete
    console.log("\nTest: Delete treatment");
    try {
      const response = await client.callTool({
        name: "deleteData",
        arguments: {
          tableName: "treatments",
          where: {
            problem: testTreatmentProblem,
          },
        },
      });
      console.log("✅ Delete Treatment Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Delete Treatment Error:", error.message);
    }

    // CRUD for physicians (test object only)
    // Insert
    console.log("\nTest: Insert new physician");
    try {
      const response = await client.callTool({
        name: "insertData",
        arguments: {
          tableName: "physicians",
          data: {
            first_name: "Integration",
            last_name: testPhysicianLastName,
            specialty: "IntegrationTestSpecialty",
          },
        },
      });
      console.log("✅ Insert Physician Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Insert Physician Error:", error.message);
    }
    // Update
    console.log("\nTest: Update physician");
    try {
      const response = await client.callTool({
        name: "updateData",
        arguments: {
          tableName: "physicians",
          data: {
            specialty: "UpdatedIntegrationTestSpecialty",
          },
          where: {
            last_name: testPhysicianLastName,
          },
        },
      });
      console.log("✅ Update Physician Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Update Physician Error:", error.message);
    }
    // Delete
    console.log("\nTest: Delete physician");
    try {
      const response = await client.callTool({
        name: "deleteData",
        arguments: {
          tableName: "physicians",
          where: {
            last_name: testPhysicianLastName,
          },
        },
      });
      console.log("✅ Delete Physician Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Delete Physician Error:", error.message);
    }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error connecting to MCP server:", error.message);
  }
}

testSqlMCP();
