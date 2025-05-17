# main.py
from mcp_sdk.server import McpServer
from agent import build_agent

def main():
    agent = build_agent()
    server = McpServer(agent=agent)
    server.serve()  # Starts listening

if __name__ == "__main__":
    main()
