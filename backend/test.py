"""Unit tests for the MCP server and database operations."""
import unittest
from unittest.mock import patch, MagicMock
from mcp.server.fastmcp import FastMCP
from mcp_python.database import medical, retail, common
from typing import Dict, Any
import sys

class TestDatabaseCommon(unittest.TestCase):
    """Test cases for common database functionality."""
    
    def setUp(self):
        """Set up test environment."""
        print("\n📦 Setting up database pool for testing...")
        self.db_pool = common.DatabasePool()
    
    def test_is_select_query(self):
        """Test SELECT query validation."""
        print("\n🔍 Testing SQL query validation:")
        print("  • Checking SELECT query recognition...")
        self.assertTrue(common.is_select_query("SELECT * FROM table"))
        print("  • Checking CTE query recognition...")
        self.assertTrue(common.is_select_query("WITH cte AS (SELECT 1) SELECT * FROM cte"))
        print("  • Verifying INSERT is not recognized as SELECT...")
        self.assertFalse(common.is_select_query("INSERT INTO table VALUES (1)"))
        print("  • Verifying UPDATE is not recognized as SELECT...")
        self.assertFalse(common.is_select_query("UPDATE table SET col = 1"))
        print("✅ All query validations passed!")
    
    @patch('psycopg2.pool.SimpleConnectionPool')
    def test_database_pool_initialization(self, mock_pool):
        """Test database pool initialization."""
        print("\n🔌 Testing database pool initialization:")
        print("  • Initializing medical database pool...")
        self.db_pool.initialize_pool('medical')
        mock_pool.assert_called_once()
        print("  ✓ Medical pool initialized successfully")
        
        print("  • Testing invalid pool type...")
        with self.assertRaises(ValueError):
            self.db_pool.initialize_pool('invalid_db')
        print("  ✓ Invalid pool type correctly rejected")
        print("✅ Pool initialization tests passed!")

class TestMedicalDatabase(unittest.TestCase):
    """Test cases for medical database operations."""
    
    def setUp(self):
        """Set up test environment."""
        print("\n🏥 Setting up medical database test environment...")
        self.mcp = FastMCP("Test Medical")
        
    @patch('mcp_python.database.medical.execute_query')
    def test_medical_query(self, mock_execute):
        """Test medical query execution."""
        print("\n💉 Testing medical database queries:")
        # Setup mock
        mock_execute.return_value = {
            "success": True,
            "data": [{"id": 1, "name": "Dr. Smith"}]
        }
        
        print("  • Testing valid SELECT query...")
        result = medical.medical_query("SELECT * FROM physicians")
        self.assertIn("content", result)
        self.assertIn("text", result["content"][0])
        print("  ✓ SELECT query processed successfully")
        
        print("  • Testing non-SELECT query protection...")
        result = medical.medical_query("INSERT INTO physicians VALUES (1)")
        self.assertEqual(
            result["content"][0]["text"],
            "Error: Only SELECT queries are allowed"
        )
        print("  ✓ INSERT query correctly rejected")
        print("✅ Medical query tests passed!")
    
    @patch('mcp_python.database.medical.execute_query')
    def test_medical_insert(self, mock_execute):
        """Test medical insert operation."""
        print("\n💊 Testing medical record insertion:")
        mock_execute.return_value = {
            "success": True,
            "data": [{"id": 1, "name": "Dr. Smith"}]
        }
        
        print("  • Attempting to insert physician record...")
        data = {"name": "Dr. Smith", "specialty": "Cardiology"}
        result = medical.medical_insert("physicians", data)
        self.assertIn("content", result)
        self.assertIn("text", result["content"][0])
        mock_execute.assert_called_once()
        print("  ✓ Insert operation processed successfully")
        print("✅ Medical insert tests passed!")

class TestRetailDatabase(unittest.TestCase):
    """Test cases for retail database operations."""
    
    def setUp(self):
        """Set up test environment."""
        print("\n🛍️  Setting up retail database test environment...")
        self.mcp = FastMCP("Test Retail")
    
    @patch('mcp_python.database.retail.execute_query')
    def test_retail_query(self, mock_execute):
        """Test retail query execution."""
        print("\n🏪 Testing retail database queries:")
        # Setup mock
        mock_execute.return_value = {
            "success": True,
            "data": [{"id": 1, "name": "Product 1"}]
        }
        
        print("  • Testing valid SELECT query...")
        result = retail.retail_query("SELECT * FROM products")
        self.assertIn("content", result)
        self.assertIn("text", result["content"][0])
        print("  ✓ SELECT query processed successfully")
        
        print("  • Testing non-SELECT query protection...")
        result = retail.retail_query("INSERT INTO products VALUES (1)")
        self.assertEqual(
            result["content"][0]["text"],
            "Error: Only SELECT queries are allowed"
        )
        print("  ✓ INSERT query correctly rejected")
        print("✅ Retail query tests passed!")
    
    @patch('mcp_python.database.retail.execute_query')
    def test_retail_table_schema(self, mock_execute):
        """Test retail table schema retrieval."""
        print("\n📋 Testing retail schema retrieval:")
        mock_execute.return_value = {
            "success": True,
            "data": [{"column_name": "id", "data_type": "integer"}]
        }
        
        print("  • Retrieving schema for products table...")
        result = retail.retail_table_schema("products")
        self.assertIn("content", result)
        self.assertIn("text", result["content"][0])
        mock_execute.assert_called_once()
        print("  ✓ Schema retrieved successfully")
        print("✅ Retail schema tests passed!")

def main():
    """Run the test suite."""
    print("\n🚀 Starting MCP Database Integration Tests")
    print("==========================================")
    print("Note: All database operations are mocked - no real databases are modified")
    print("==========================================\n")
    
    # Create a test runner with increased verbosity
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    
    # Create a test suite and run it
    suite = unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    runner.run(suite)
    
    print("\n==========================================")
    print("✨ All tests completed!")
    print("==========================================")

if __name__ == "__main__":
    main() 