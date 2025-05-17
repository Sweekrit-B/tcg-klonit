# tools/sql_tool.py
from mcp_sdk.server import tool

@tool(name="sqlQuery", input={"query": str})
def sql_query(input):
    return {"result": f"Simulated SQL result for query: {input['query']}"}
