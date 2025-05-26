"""Main entry point for the MCP server."""
from mcp.server.fastmcp import FastMCP
from database import medical, retail

def main():
    """Initialize and run the MCP server."""
    # Create main MCP instance
    mcp = FastMCP("Database Server")
    # The tool instances are already created in the respective modules
    # Just need to run the server to start it
    mcp.run()

if __name__ == "__main__":
    main() 