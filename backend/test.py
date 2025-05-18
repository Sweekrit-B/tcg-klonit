from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Demo")

@mcp.tool()
def add(a: int, b: int) -> dict:
    return {"content": [{"type": "text", "text": str(a + b)}]}

if __name__ == "__main__":
    mcp.run()