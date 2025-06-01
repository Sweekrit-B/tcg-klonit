# tools/sql_tool.py

"""
This module bridges the medical and retail SQL tools into a unified format 
that can be exposed to Gemini via tool_registry.

It imports wrapped MCP tools and registers them 
in a dictionary for Gemini routing.
"""

from typing import Dict, Any, List
from auth import authorize_google

from googleapiclient.discovery import build

from psycopg2 import pool
import os
from dotenv import load_dotenv
import json
from datetime import datetime

# === Load environment variables ===
load_dotenv()

# === Connection Pool Management ===
class DatabasePool:
    def __init__(self):
        self.pools = {
            'medical': None,
            'retail': None
        }
        self.configs = {
            'medical': {
                'host': os.getenv('MEDICAL_DB_HOST', 'localhost'),
                'port': int(os.getenv('MEDICAL_DB_PORT', 5432)),
                'user': os.getenv('MEDICAL_DB_USER', 'medical_user'),
                'password': os.getenv('MEDICAL_DB_PASSWORD', 'medical_password'),
                'database': os.getenv('MEDICAL_DB_NAME', 'medical_db')
            },
            'retail': {
                'host': os.getenv('RETAIL_DB_HOST', 'localhost'),
                'port': int(os.getenv('RETAIL_DB_PORT', 5432)),
                'user': os.getenv('RETAIL_DB_USER', 'retail_user'),
                'password': os.getenv('RETAIL_DB_PASSWORD', 'retail_password'),
                'database': os.getenv('RETAIL_DB_NAME', 'retail_db')
            }
        }

    def initialize_pool(self, db_type: str) -> None:
        if self.pools[db_type] is None:
            self.pools[db_type] = pool.SimpleConnectionPool(1, 20, **self.configs[db_type])

    def get_conn(self, db_type: str):
        if self.pools[db_type] is None:
            self.initialize_pool(db_type)
        return self.pools[db_type].getconn()

    def put_conn(self, db_type: str, conn):
        if self.pools[db_type] is not None:
            self.pools[db_type].putconn(conn)

    def close_all(self):
        for db_type, p in self.pools.items():
            if p is not None:
                p.closeall()
                self.pools[db_type] = None

# Global pool instance
db_pool = DatabasePool()

# === Utility Query Functions ===
def execute_query(db_type: str, query: str, params: tuple = None) -> Dict[str, Any]:
    conn = db_pool.get_conn(db_type)
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if query.lower().strip().startswith(('select', 'with')):
                results = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]
                return {
                    "success": True,
                    "data": [dict(zip(colnames, row)) for row in results]
                }
            else:
                conn.commit()
                return {"success": True, "data": [{"message": "Operation completed successfully"}]}
    except Exception as e:
        conn.rollback()
        print("\nDEBUG - Database Error:", str(e))  # Add debug output
        return {"success": False, "data": [{"error": str(e)}]}
    finally:
        db_pool.put_conn(db_type, conn)

def is_select_query(query: str) -> bool:
    return query.lower().strip().startswith(('select', 'with'))

# === Medical SQL Tools ===
def medical_query(query: str, params: List[Any] = None) -> Dict[str, Any]:
    if not is_select_query(query):
        return {"content": [{"type": "text", "text": "Error: Only SELECT queries are allowed"}]}
    result = execute_query('medical', query, params)
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['data'][0]['error']}"}]}

def list_medical_tables() -> Dict[str, Any]:
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """
    result = execute_query('medical', query)
    tables = [row['table_name'] for row in result['data']] if result['success'] else []
    return {"content": [{"type": "text", "text": f"Available medical tables:\n{', '.join(tables)}" if tables else "No tables found"}]}

def medical_table_schema(table_name: str) -> Dict[str, Any]:
    query = """
        SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """
    result = execute_query('medical', query, (table_name,))
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

def medical_insert(table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new row into a medical database table."""
    try:
        # Validate input
        if not table_name:
            raise ValueError("table_name is required")
        if not data or not isinstance(data, dict):
            raise ValueError("data must be a non-empty dictionary")
            
        # Convert appointment_date to string if it's a datetime
        if 'appointment_date' in data and isinstance(data['appointment_date'], (str, datetime)):
            if isinstance(data['appointment_date'], datetime):
                data['appointment_date'] = data['appointment_date'].strftime('%Y-%m-%d %H:%M:%S')
            
        # Build query
        columns = list(data.keys())
        values = list(data.values())
        placeholders = ["%s"] * len(values)
        query = f"""
            INSERT INTO {table_name} 
            ({', '.join(columns)}) 
            VALUES ({', '.join(placeholders)}) 
            RETURNING *
        """
        
        # Execute query
        conn = db_pool.get_conn('medical')
        try:
            with conn.cursor() as cur:
                cur.execute(query, tuple(values))
                result = cur.fetchone()
                conn.commit()
                
                if result:
                    colnames = [desc[0] for desc in cur.description]
                    inserted_data = dict(zip(colnames, result))
                    # Convert datetime objects to strings for JSON serialization
                    for key, value in inserted_data.items():
                        if isinstance(value, datetime):
                            inserted_data[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    return {
                        "content": [{
                            "type": "text",
                            "text": f"Successfully scheduled appointment: {json.dumps(inserted_data, indent=2)}"
                        }]
                    }
                else:
                    return {
                        "content": [{
                            "type": "text",
                            "text": "Insert succeeded but no data was returned"
                        }]
                    }
                    
        except Exception as db_error:
            conn.rollback()
            error_msg = f"Database error: {str(db_error)}"
            return {
                "content": [{
                    "type": "text",
                    "text": error_msg
                }]
            }
        finally:
            db_pool.put_conn('medical', conn)
            
    except Exception as e:
        error_msg = f"Error in medical_insert: {str(e)}"
        return {
            "content": [{
                "type": "text",
                "text": error_msg
            }]
        }

def medical_update(table_name: str, data: Dict[str, Any], where: Dict[str, Any]) -> Dict[str, Any]:
    set_items = [f"{k} = %s" for k in data.keys()]
    where_items = [f"{k} = %s" for k in where.keys()]
    values = tuple(list(data.values()) + list(where.values()))
    query = f"UPDATE {table_name} SET {', '.join(set_items)} WHERE {' AND '.join(where_items)} RETURNING *"
    result = execute_query('medical', query, values)
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

def medical_delete(table_name: str, where: Dict[str, Any]) -> Dict[str, Any]:
    where_items = [f"{k} = %s" for k in where.keys()]
    values = tuple(where.values())
    query = f"DELETE FROM {table_name} WHERE {' AND '.join(where_items)} RETURNING *"
    result = execute_query('medical', query, values)
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

# === Retail SQL Tools ===
def retail_query(query: str, params: List[Any] = None) -> Dict[str, Any]:
    if not is_select_query(query):
        return {"content": [{"type": "text", "text": "Error: Only SELECT queries are allowed"}]}
    result = execute_query('retail', query, params)
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

def list_retail_tables() -> Dict[str, Any]:
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """
    result = execute_query('retail', query)
    tables = [row['table_name'] for row in result['data']] if result['success'] else []
    return {"content": [{"type": "text", "text": f"Available retail tables:\n{', '.join(tables)}" if tables else "No tables found"}]}

def retail_table_schema(table_name: str) -> Dict[str, Any]:
    query = """
        SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """
    result = execute_query('retail', query, (table_name,))
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

def retail_insert(table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    columns = list(data.keys())
    values = list(data.values())
    placeholders = ["%s"] * len(values)
    query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
    result = execute_query('retail', query, tuple(values))
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

def retail_update(table_name: str, data: Dict[str, Any], where: Dict[str, Any]) -> Dict[str, Any]:
    set_items = [f"{k} = %s" for k in data.keys()]
    where_items = [f"{k} = %s" for k in where.keys()]
    values = tuple(list(data.values()) + list(where.values()))
    query = f"UPDATE {table_name} SET {', '.join(set_items)} WHERE {' AND '.join(where_items)} RETURNING *"
    result = execute_query('retail', query, values)
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

def retail_delete(table_name: str, where: Dict[str, Any]) -> Dict[str, Any]:
    where_items = [f"{k} = %s" for k in where.keys()]
    values = tuple(where.values())
    query = f"DELETE FROM {table_name} WHERE {' AND '.join(where_items)} RETURNING *"
    result = execute_query('retail', query, values)
    return {"content": [{"type": "text", "text": str(result['data']) if result['success'] else f"Error: {result['error']}"}]}

# === Registry for Gemini ===
sql_tools = {
    "medical_query": medical_query,
    "list_medical_tables": list_medical_tables,
    "medical_table_schema": medical_table_schema,
    "medical_insert": medical_insert,
    "medical_update": medical_update,
    "medical_delete": medical_delete,

    "retail_query": retail_query,
    "list_retail_tables": list_retail_tables,
    "retail_table_schema": retail_table_schema,
    "retail_insert": retail_insert,
    "retail_update": retail_update,
    "retail_delete": retail_delete,
}
