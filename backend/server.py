import asyncio
import json
import os
from typing import Any, Dict, List, Optional, Union
import asyncpg
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseConfig(BaseModel):
    host: str = Field(default_factory=lambda: os.getenv("PGHOST", "localhost"))
    port: int = Field(default_factory=lambda: int(os.getenv("PGPORT", "5432")))
    user: str = Field(default_factory=lambda: os.getenv("PGUSER", "mcp_user"))
    password: str = Field(default_factory=lambda: os.getenv("PGPASSWORD", "mcp_password"))
    database: str = Field(default_factory=lambda: os.getenv("PGDATABASE", "mcp_demo"))

class SqlServer:
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self.pool: Optional[asyncpg.Pool] = None
        self.valid_tables = ['physicians', 'patients', 'appointments', 'treatments']
    
    async def initialize_db(self) -> None:
        """Initialize database connection and create tables with sample data"""
        try:
            # Create connection pool
            self.pool = await asyncpg.create_pool(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                min_size=1,
                max_size=20
            )
            
            print("Successfully connected to PostgreSQL database")
            
            async with self.pool.acquire() as conn:
                # Drop existing tables
                await conn.execute("""
                    DROP TABLE IF EXISTS appointments;
                    DROP TABLE IF EXISTS treatments;
                    DROP TABLE IF EXISTS patients;
                    DROP TABLE IF EXISTS physicians;
                    DROP TABLE IF EXISTS users;
                    DROP TABLE IF EXISTS products;
                """)
                
                # Create new schema tables
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS physicians (
                        physician_id SERIAL PRIMARY KEY,
                        first_name VARCHAR(255),
                        last_name VARCHAR(255),
                        specialty VARCHAR(255),
                        label TEXT DEFAULT 'Physician Information'
                    );

                    CREATE TABLE IF NOT EXISTS patients (
                        patient_id SERIAL PRIMARY KEY,
                        email VARCHAR(255) UNIQUE,
                        first_name VARCHAR(255),
                        last_name VARCHAR(255),
                        phone_number VARCHAR(20),
                        date_of_birth DATE,
                        pin VARCHAR(8),
                        label TEXT DEFAULT 'Patient Information'
                    );

                    CREATE TABLE IF NOT EXISTS appointments (
                        appointment_id SERIAL PRIMARY KEY,
                        patient_id INT REFERENCES patients(patient_id),
                        physician_id INT REFERENCES physicians(physician_id),
                        appointment_datetime TIMESTAMP,
                        appointment_type VARCHAR(255),
                        notes TEXT,
                        google_calendar_event_id VARCHAR(255),
                        label TEXT DEFAULT 'Appointments Information'
                    );

                    CREATE TABLE IF NOT EXISTS treatments (
                        treatment_id SERIAL PRIMARY KEY,
                        patient_id INT REFERENCES patients(patient_id),
                        problem VARCHAR(255),
                        treatment TEXT,
                        physician_id INT REFERENCES physicians(physician_id),
                        label TEXT DEFAULT 'Treatments Information'
                    );
                """)
                
                # Insert sample data
                await self._insert_sample_data(conn)
                
            print("Database initialization completed successfully")
            
        except Exception as error:
            print(f"Error connecting to the database: {error}")
            raise error
    
    async def _insert_sample_data(self, conn: asyncpg.Connection) -> None:
        """Insert sample data into tables"""
        
        # Insert physicians
        physicians_data = [
            ('Alice', 'Smith', 'Cardiology', 'Physician Information'),
            ('Bob', 'Jones', 'Dermatology', 'Physician Information'),
            ('Carol', 'Taylor', 'Pediatrics', 'Physician Information'),
            ('David', 'Brown', 'Neurology', 'Physician Information')
        ]
        
        # Check if physicians table is empty
        count = await conn.fetchval("SELECT COUNT(*) FROM physicians")
        if count == 0:
            await conn.executemany(
                "INSERT INTO physicians (first_name, last_name, specialty, label) VALUES ($1, $2, $3, $4)",
                physicians_data
            )
        
        # Insert patients
        patients_data = [
            ('patient1@example.com', 'John', 'Doe', '555-0001', '1980-01-01', '12345678', 'Patient Information'),
            ('patient2@example.com', 'Jane', 'Smith', '555-0002', '1985-02-02', '23456789', 'Patient Information'),
            ('patient3@example.com', 'Jim', 'Brown', '555-0003', '1990-03-03', '34567890', 'Patient Information'),
            ('patient4@example.com', 'Jill', 'White', '555-0004', '1975-04-04', '45678901', 'Patient Information'),
            ('patient5@example.com', 'Jack', 'Black', '555-0005', '2000-05-05', '56789012', 'Patient Information'),
            ('patient6@example.com', 'Jenny', 'Green', '555-0006', '1995-06-06', '67890123', 'Patient Information'),
            ('patient7@example.com', 'Joe', 'Blue', '555-0007', '1988-07-07', '78901234', 'Patient Information'),
            ('patient8@example.com', 'Jess', 'Red', '555-0008', '1992-08-08', '89012345', 'Patient Information'),
            ('patient9@example.com', 'Jerry', 'Yellow', '555-0009', '1983-09-09', '90123456', 'Patient Information'),
            ('patient10@example.com', 'Jordan', 'Purple', '555-0010', '1978-10-10', '01234567', 'Patient Information')
        ]
        
        count = await conn.fetchval("SELECT COUNT(*) FROM patients")
        if count == 0:
            await conn.executemany(
                "INSERT INTO patients (email, first_name, last_name, phone_number, date_of_birth, pin, label) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                patients_data
            )
        
        # Insert appointments
        appointments_data = [
            (1, 1, '2024-05-01 09:00:00', 'Checkup', 'Routine checkup', 'evt1', 'Appointments Information'),
            (2, 2, '2024-05-02 10:00:00', 'Consultation', 'Discuss symptoms', 'evt2', 'Appointments Information'),
            (3, 3, '2024-05-03 11:00:00', 'Follow-up', 'Review test results', 'evt3', 'Appointments Information'),
            (4, 4, '2024-05-04 12:00:00', 'Checkup', 'Annual physical', 'evt4', 'Appointments Information'),
            (5, 1, '2024-05-05 13:00:00', 'Consultation', 'New issue', 'evt5', 'Appointments Information'),
            (6, 2, '2024-05-06 14:00:00', 'Checkup', 'Routine checkup', 'evt6', 'Appointments Information'),
            (7, 3, '2024-05-07 15:00:00', 'Consultation', 'Discuss medication', 'evt7', 'Appointments Information'),
            (8, 4, '2024-05-08 16:00:00', 'Follow-up', 'Post-surgery', 'evt8', 'Appointments Information'),
            (9, 1, '2024-05-09 17:00:00', 'Checkup', 'Routine checkup', 'evt9', 'Appointments Information'),
            (10, 2, '2024-05-10 18:00:00', 'Consultation', 'Discuss results', 'evt10', 'Appointments Information')
        ]
        
        count = await conn.fetchval("SELECT COUNT(*) FROM appointments")
        if count == 0:
            await conn.executemany(
                "INSERT INTO appointments (patient_id, physician_id, appointment_datetime, appointment_type, notes, google_calendar_event_id, label) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                appointments_data
            )
        
        # Insert treatments
        treatments_data = [
            (1, 'Hypertension', 'Medication A', 1, 'Treatments Information'),
            (2, 'Diabetes', 'Medication B', 2, 'Treatments Information'),
            (3, 'Asthma', 'Inhaler', 3, 'Treatments Information'),
            (4, 'Migraine', 'Painkillers', 4, 'Treatments Information'),
            (5, 'Allergy', 'Antihistamines', 1, 'Treatments Information'),
            (6, 'Flu', 'Rest and fluids', 2, 'Treatments Information'),
            (7, 'Back Pain', 'Physical therapy', 3, 'Treatments Information'),
            (8, 'Depression', 'Therapy', 4, 'Treatments Information'),
            (9, 'High Cholesterol', 'Diet change', 1, 'Treatments Information'),
            (10, 'Anxiety', 'Counseling', 2, 'Treatments Information')
        ]
        
        count = await conn.fetchval("SELECT COUNT(*) FROM treatments")
        if count == 0:
            await conn.executemany(
                "INSERT INTO treatments (patient_id, problem, treatment, physician_id, label) VALUES ($1, $2, $3, $4, $5)",
                treatments_data
            )
    
    async def sql_query(self, query: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Execute SQL SELECT query with parameters"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            # Security check - only allow SELECT and WITH queries
            normalized_query = query.strip().lower()
            first_word = normalized_query.split()[0] if normalized_query.split() else ""
            
            if first_word not in ["select", "with"]:
                return {
                    "content": [{
                        "type": "text",
                        "text": "Error: Only SELECT queries are allowed for security reasons"
                    }]
                }
            
            async with self.pool.acquire() as conn:
                if params:
                    rows = await conn.fetch(query, *params)
                else:
                    rows = await conn.fetch(query)
                
                # Convert rows to list of dictionaries
                result = [dict(row) for row in rows]
                
                return {
                    "content": [{
                        "type": "text",
                        "text": json.dumps(result, indent=2, default=str)
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error executing SQL query: {str(error)}"
                }]
            }
    
    async def insert_data(self, table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert data into specified table"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            if table_name not in self.valid_tables:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error: Invalid table name. Must be one of: {', '.join(self.valid_tables)}"
                    }]
                }
            
            columns = list(data.keys())
            values = list(data.values())
            placeholders = [f"${i+1}" for i in range(len(values))]
            
            query = f"""
                INSERT INTO {table_name} ({', '.join(columns)})
                VALUES ({', '.join(placeholders)})
                RETURNING *
            """
            
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, *values)
                result = dict(row) if row else {}
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Successfully inserted data into {table_name}:\n{json.dumps(result, indent=2, default=str)}"
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error inserting data: {str(error)}"
                }]
            }
    
    async def update_data(self, table_name: str, data: Dict[str, Any], where: Dict[str, Any]) -> Dict[str, Any]:
        """Update data in specified table"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            if table_name not in self.valid_tables:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error: Invalid table name. Must be one of: {', '.join(self.valid_tables)}"
                    }]
                }
            
            set_clauses = [f"{key} = ${i+1}" for i, key in enumerate(data.keys())]
            where_clauses = [f"{key} = ${i+len(data)+1}" for i, key in enumerate(where.keys())]
            
            query = f"""
                UPDATE {table_name}
                SET {', '.join(set_clauses)}
                WHERE {' AND '.join(where_clauses)}
                RETURNING *
            """
            
            values = list(data.values()) + list(where.values())
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *values)
                result = [dict(row) for row in rows]
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Successfully updated data in {table_name}:\n{json.dumps(result, indent=2, default=str)}"
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error updating data: {str(error)}"
                }]
            }
    
    async def delete_data(self, table_name: str, where: Dict[str, Any]) -> Dict[str, Any]:
        """Delete data from specified table"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            if table_name not in self.valid_tables:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error: Invalid table name. Must be one of: {', '.join(self.valid_tables)}"
                    }]
                }
            
            where_clauses = [f"{key} = ${i+1}" for i, key in enumerate(where.keys())]
            
            query = f"""
                DELETE FROM {table_name}
                WHERE {' AND '.join(where_clauses)}
                RETURNING *
            """
            
            values = list(where.values())
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *values)
                result = [dict(row) for row in rows]
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Successfully deleted data from {table_name}:\n{json.dumps(result, indent=2, default=str)}"
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error deleting data: {str(error)}"
                }]
            }
    
    async def list_tables(self) -> Dict[str, Any]:
        """List all tables in the database"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                table_names = [row['table_name'] for row in rows]
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Available tables:\n{chr(10).join(table_names)}" if table_names else "No tables found in the public schema."
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error listing tables: {str(error)}"
                }]
            }
    
    async def table_schema(self, table_name: str) -> Dict[str, Any]:
        """Get schema information for a specific table"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            query = """
                SELECT 
                    column_name, 
                    data_type, 
                    character_maximum_length,
                    column_default,
                    is_nullable
                FROM 
                    information_schema.columns
                WHERE 
                    table_schema = 'public' AND 
                    table_name = $1
                ORDER BY 
                    ordinal_position
            """
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, table_name)
                
                if not rows:
                    return {
                        "content": [{
                            "type": "text",
                            "text": f"Table '{table_name}' not found in the public schema"
                        }]
                    }
                
                result = [dict(row) for row in rows]
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Schema for table '{table_name}':\n{json.dumps(result, indent=2, default=str)}"
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error getting schema: {str(error)}"
                }]
            }
    
    async def get_labels(self) -> Dict[str, Any]:
        """Get current labels for all tables"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            labels = []
            
            async with self.pool.acquire() as conn:
                for table_name in self.valid_tables:
                    try:
                        query = f"SELECT '{table_name}' as table_name, label FROM {table_name} LIMIT 1"
                        row = await conn.fetchrow(query)
                        if row:
                            labels.append(dict(row))
                    except Exception:
                        # Skip tables that don't exist or have issues
                        continue
            
            return {
                "content": [{
                    "type": "text",
                    "text": f"Current labels:\n{json.dumps(labels, indent=2)}"
                }]
            }
            
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error fetching labels: {str(error)}"
                }]
            }
    
    async def update_label(self, table_name: str, new_label: str) -> Dict[str, Any]:
        """Update label for a specific table"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            if table_name not in self.valid_tables:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error: Invalid table name. Must be one of: {', '.join(self.valid_tables)}"
                    }]
                }
            
            query = f"UPDATE {table_name} SET label = $1"
            
            async with self.pool.acquire() as conn:
                await conn.execute(query, new_label)
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Successfully updated label for {table_name} to \"{new_label}\""
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error updating label: {str(error)}"
                }]
            }
    
    async def get_table_label(self, table_name: str) -> Dict[str, Any]:
        """Get current label for a specific table"""
        try:
            if not self.pool:
                await self.initialize_db()
            
            if table_name not in self.valid_tables:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error: Invalid table name. Must be one of: {', '.join(self.valid_tables)}"
                    }]
                }
            
            query = f"SELECT label FROM {table_name} LIMIT 1"
            
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query)
                
                if not row:
                    return {
                        "content": [{
                            "type": "text",
                            "text": f"No records found in {table_name}"
                        }]
                    }
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Current label for {table_name}: \"{row['label']}\""
                    }]
                }
                
        except Exception as error:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error getting label: {str(error)}"
                }]
            }
    
    async def close(self) -> None:
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            print("Database connection pool closed")