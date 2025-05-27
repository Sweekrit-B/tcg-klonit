"""Common database utilities and connection management."""
import os
from typing import Dict, Any, Optional
from psycopg2 import pool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabasePool:
    """Manages database connection pools."""
    
    def __init__(self):
        self.pools: Dict[str, Optional[pool.SimpleConnectionPool]] = {
            'medical': None,
            'retail': None
        }
        
        # Database configurations
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
        """Initialize a specific database pool."""
        if db_type not in self.pools:
            raise ValueError(f"Unknown database type: {db_type}")
            
        if self.pools[db_type] is None:
            self.pools[db_type] = pool.SimpleConnectionPool(
                1, 20, **self.configs[db_type]
            )

    def get_conn(self, db_type: str):
        """Get a connection from the specified pool."""
        if self.pools[db_type] is None:
            self.initialize_pool(db_type)
        return self.pools[db_type].getconn()

    def put_conn(self, db_type: str, conn):
        """Return a connection to the specified pool."""
        if self.pools[db_type] is not None:
            self.pools[db_type].putconn(conn)

    def close_all(self):
        """Close all database pools."""
        for db_type, pool_instance in self.pools.items():
            if pool_instance is not None:
                pool_instance.closeall()
                self.pools[db_type] = None

# Global database pool instance
db_pool = DatabasePool()

def execute_query(db_type: str, query: str, params: tuple = None) -> Dict[str, Any]:
    """Execute a query and return results as a dictionary."""
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
                return {"success": True, "message": "Operation completed successfully"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db_pool.put_conn(db_type, conn)

def is_select_query(query: str) -> bool:
    """Check if a query is a SELECT query."""
    return query.lower().strip().startswith(('select', 'with')) 