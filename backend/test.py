"""Test file for database operations."""
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Database Test Server")

@mcp.tool()
def test_medical_query() -> dict:
    """Test medical database query."""
    query = "SELECT * FROM physicians LIMIT 1"
    return {
        "content": [{
            "type": "text",
            "text": f"Testing medical query: {query}"
        }]
    }

@mcp.tool()
def test_retail_query() -> dict:
    """Test retail database query."""
    query = "SELECT * FROM products LIMIT 1"
    return {
        "content": [{
            "type": "text",
            "text": f"Testing retail query: {query}"
        }]
    }

if __name__ == "__main__":
    mcp.run() 