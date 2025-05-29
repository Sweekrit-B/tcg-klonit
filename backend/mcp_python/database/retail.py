"""Retail database operations for MCP server."""
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP
from .common import execute_query, is_select_query, db_pool

# Create MCP instance
mcp = FastMCP("Retail Database")

@mcp.tool()
def retail_query(query: str, params: List[Any] = None) -> Dict[str, Any]:
    """Execute a query on the retail database."""
    if not is_select_query(query):
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

@mcp.tool()
def retail_insert(table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert data into a retail table."""
    columns = list(data.keys())
    values = list(data.values())
    placeholders = [f"%s" for _ in values]
    
    query = f"""
        INSERT INTO {table_name} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """
    
    result = execute_query('retail', query, tuple(values))
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    }

@mcp.tool()
def retail_update(table_name: str, data: Dict[str, Any], where: Dict[str, Any]) -> Dict[str, Any]:
    """Update data in a retail table."""
    set_items = [f"{k} = %s" for k in data.keys()]
    where_items = [f"{k} = %s" for k in where.keys()]
    
    query = f"""
        UPDATE {table_name}
        SET {', '.join(set_items)}
        WHERE {' AND '.join(where_items)}
        RETURNING *
    """
    
    values = tuple(list(data.values()) + list(where.values()))
    result = execute_query('retail', query, values)
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    }

@mcp.tool()
def retail_delete(table_name: str, where: Dict[str, Any]) -> Dict[str, Any]:
    """Delete data from a retail table."""
    where_items = [f"{k} = %s" for k in where.keys()]
    
    query = f"""
        DELETE FROM {table_name}
        WHERE {' AND '.join(where_items)}
        RETURNING *
    """
    
    values = tuple(where.values())
    result = execute_query('retail', query, values)
    return {
        "content": [{
            "type": "text",
            "text": str(result['data']) if result['success'] else f"Error: {result['error']}"
        }]
    } 