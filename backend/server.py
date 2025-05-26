"""Server implementation for database operations."""
from mcp.server.fastmcp import FastMCP
from typing import Dict, Any, List
import os
from psycopg2 import pool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create MCP server instance
mcp = FastMCP("Demo")

# Database configurations
MEDICAL_DB_CONFIG = {
    'host': os.getenv('MEDICAL_DB_HOST', 'localhost'),
    'port': int(os.getenv('MEDICAL_DB_PORT', 5432)),
    'user': os.getenv('MEDICAL_DB_USER', 'medical_user'),
    'password': os.getenv('MEDICAL_DB_PASSWORD', 'medical_password'),
    'database': os.getenv('MEDICAL_DB_NAME', 'medical_db')
}

RETAIL_DB_CONFIG = {
    'host': os.getenv('RETAIL_DB_HOST', 'localhost'),
    'port': int(os.getenv('RETAIL_DB_PORT', 5432)),
    'user': os.getenv('RETAIL_DB_USER', 'retail_user'),
    'password': os.getenv('RETAIL_DB_PASSWORD', 'retail_password'),
    'database': os.getenv('RETAIL_DB_NAME', 'retail_db')
}

# Initialize connection pools
pools = {
    'medical': pool.SimpleConnectionPool(1, 20, **MEDICAL_DB_CONFIG),
    'retail': pool.SimpleConnectionPool(1, 20, **RETAIL_DB_CONFIG)
}

def execute_query(db_type: str, query: str, params: tuple = None) -> Dict[str, Any]:
    """Execute a query and return results as a dictionary."""
    conn = pools[db_type].getconn()
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
                return {"success": True, "message": "Operation completed successfully"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        pools[db_type].putconn(conn)

# Medical Database Tools
@mcp.tool()
def medical_query(query: str, params: List[Any] = None) -> Dict[str, Any]:
    """Execute a query on the medical database."""
    if not query.lower().strip().startswith(('select', 'with')):
        return {
            "content": [{
                "type": "text",
                "text": "Error: Only SELECT queries are allowed"
            }]
        }
    
    result = execute_query('medical', query, params)
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    }

@mcp.tool()
def list_medical_tables() -> Dict[str, Any]:
    """List all tables in the medical database."""
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """
    result = execute_query('medical', query)
    tables = [row['table_name'] for row in result['data']] if result['success'] else []
    return {
        "content": [{
            "type": "text",
            "text": f"Available medical tables:\n{', '.join(tables)}" if tables else "No tables found"
        }]
    }

@mcp.tool()
def medical_table_schema(table_name: str) -> Dict[str, Any]:
    """Get schema information for a medical table."""
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
            table_name = %s
        ORDER BY 
            ordinal_position
    """
    result = execute_query('medical', query, (table_name,))
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    }

# Retail Database Tools
@mcp.tool()
def retail_query(query: str, params: List[Any] = None) -> Dict[str, Any]:
    """Execute a query on the retail database."""
    if not query.lower().strip().startswith(('select', 'with')):
        return {
            "content": [{
                "type": "text",
                "text": "Error: Only SELECT queries are allowed"
            }]
        }
    
    result = execute_query('retail', query, params)
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    }

@mcp.tool()
def list_retail_tables() -> Dict[str, Any]:
    """List all tables in the retail database."""
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """
    result = execute_query('retail', query)
    tables = [row['table_name'] for row in result['data']] if result['success'] else []
    return {
        "content": [{
            "type": "text",
            "text": f"Available retail tables:\n{', '.join(tables)}" if tables else "No tables found"
        }]
    }

@mcp.tool()
def retail_table_schema(table_name: str) -> Dict[str, Any]:
    """Get schema information for a retail table."""
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
            table_name = %s
        ORDER BY 
            ordinal_position
    """
    result = execute_query('retail', query, (table_name,))
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    }

if __name__ == "__main__":
    mcp.run()
