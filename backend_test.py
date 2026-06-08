import requests
import sys
import json
from datetime import datetime

import os

class WorkRoboAPITester:
    def __init__(self, base_url=None):
        self.base_url = base_url or os.environ.get("TEST_BASE_URL") or "http://localhost:8000"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:500]
                })

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        # Test API root
        self.run_test("API Root", "GET", "api/", 200)
        
        # Test health check
        self.run_test("Health Check", "GET", "api/health", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTH ENDPOINTS")
        print("="*50)
        
        # Test signup
        test_email = f"test.user.{datetime.now().strftime('%H%M%S')}@workrobo.ai"
        signup_data = {
            "email": test_email,
            "password": "TestPass123!",
            "full_name": "Test User"
        }
        
        success, response = self.run_test("User Signup", "POST", "api/auth/signup", 200, signup_data)
        
        # Test login
        login_data = {
            "email": test_email,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test("User Login", "POST", "api/auth/login", 200, login_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 Token acquired: {self.token[:20]}...")
        
        # Test get me (requires auth)
        if self.token:
            self.run_test("Get User Profile", "GET", "api/auth/me", 200)

    def test_streams_endpoints(self):
        """Test Robo-Streams endpoints"""
        if not self.token:
            print("\n⚠️  Skipping Streams tests - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING ROBO-STREAMS ENDPOINTS")
        print("="*50)
        
        # Get streams
        self.run_test("Get Streams", "GET", "api/streams", 200)
        
        # Create stream
        stream_data = {
            "name": "Test Stream",
            "description": "Test automation stream",
            "nodes": [],
            "edges": []
        }
        
        success, response = self.run_test("Create Stream", "POST", "api/streams", 200, stream_data)
        stream_id = response.get('id') if success else None
        
        if stream_id:
            # Get specific stream
            self.run_test("Get Stream by ID", "GET", f"api/streams/{stream_id}", 200)
            
            # Update stream
            updated_data = {
                "name": "Updated Test Stream",
                "description": "Updated description",
                "nodes": [],
                "edges": []
            }
            self.run_test("Update Stream", "PUT", f"api/streams/{stream_id}", 200, updated_data)
            
            # Toggle stream
            self.run_test("Toggle Stream", "POST", f"api/streams/{stream_id}/toggle", 200)
            
            # Delete stream
            self.run_test("Delete Stream", "DELETE", f"api/streams/{stream_id}", 200)

    def test_sentry_endpoints(self):
        """Test Sentry monitoring endpoints"""
        if not self.token:
            print("\n⚠️  Skipping Sentry tests - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING SENTRY ENDPOINTS")
        print("="*50)
        
        # Get sentry targets
        self.run_test("Get Sentry Targets", "GET", "api/sentry", 200)
        
        # Create sentry target
        target_data = {
            "name": "Test Target",
            "url": "https://example.com",
            "check_interval": 3600
        }
        
        success, response = self.run_test("Create Sentry Target", "POST", "api/sentry", 200, target_data)
        target_id = response.get('id') if success else None
        
        if target_id:
            # Check target
            self.run_test("Check Sentry Target", "POST", f"api/sentry/{target_id}/check", 200)
            
            # Delete target
            self.run_test("Delete Sentry Target", "DELETE", f"api/sentry/{target_id}", 200)

    def test_pulse_endpoints(self):
        """Test Pulse messaging endpoints"""
        if not self.token:
            print("\n⚠️  Skipping Pulse tests - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING PULSE ENDPOINTS")
        print("="*50)
        
        # Get lists
        self.run_test("Get Pulse Lists", "GET", "api/pulse/lists", 200)
        
        # Create list
        list_data = {
            "name": "Test List",
            "description": "Test contact list"
        }
        
        success, response = self.run_test("Create Pulse List", "POST", "api/pulse/lists", 200, list_data)
        list_id = response.get('id') if success else None
        
        if list_id:
            # Add contact to list
            contact_data = {
                "email": "test@example.com",
                "name": "Test Contact"
            }
            self.run_test("Add Contact to List", "POST", f"api/pulse/lists/{list_id}/contacts", 200, contact_data)
            
            # Get list contacts
            self.run_test("Get List Contacts", "GET", f"api/pulse/lists/{list_id}/contacts", 200)
        
        # Get campaigns
        self.run_test("Get Campaigns", "GET", "api/pulse/campaigns", 200)

    def test_hive_endpoints(self):
        """Test Hive WorkRobos endpoints"""
        if not self.token:
            print("\n⚠️  Skipping Hive tests - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING HIVE ENDPOINTS")
        print("="*50)
        
        # Get workrobos
        self.run_test("Get WorkRobos", "GET", "api/hive", 200)
        
        # Create workrobo
        robo_data = {
            "name": "Test WorkRobo",
            "description": "Test autonomous agent",
            "trigger_type": "webhook",
            "trigger_config": {},
            "actions": []
        }
        
        success, response = self.run_test("Create WorkRobo", "POST", "api/hive", 200, robo_data)
        robo_id = response.get('id') if success else None
        
        if robo_id:
            # Get specific workrobo
            self.run_test("Get WorkRobo by ID", "GET", f"api/hive/{robo_id}", 200)
            
            # Activate workrobo
            self.run_test("Activate WorkRobo", "POST", f"api/hive/{robo_id}/activate", 200)
            
            # Deactivate workrobo
            self.run_test("Deactivate WorkRobo", "POST", f"api/hive/{robo_id}/deactivate", 200)
            
            # Delete workrobo
            self.run_test("Delete WorkRobo", "DELETE", f"api/hive/{robo_id}", 200)

    def test_ai_endpoints(self):
        """Test AI processing endpoints"""
        if not self.token:
            print("\n⚠️  Skipping AI tests - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING AI ENDPOINTS")
        print("="*50)
        
        # Test AI processing
        ai_data = {
            "prompt": "Hello, how are you?",
            "max_tokens": 100
        }
        
        self.run_test("AI Process", "POST", "api/ai/process", 200, ai_data)

    def test_ping_endpoint(self):
        """Test new ping endpoint for engine status"""
        print("\n" + "="*50)
        print("TESTING PING ENDPOINT")
        print("="*50)
        
        # Test ping endpoint (public, no auth required)
        success, response = self.run_test("Ping Engine Status", "GET", "api/ping", 200)
        
        if success:
            # Verify response structure
            expected_fields = ['status', 'timestamp', 'engine', 'capabilities']
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ Found expected field: {field}")
                else:
                    print(f"   ❌ Missing expected field: {field}")

    def test_execution_endpoints(self):
        """Test new execution engine endpoints"""
        if not self.token:
            print("\n⚠️  Skipping Execution tests - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING EXECUTION ENDPOINTS")
        print("="*50)
        
        # Test smart scrape
        scrape_data = {
            "url": "https://example.com",
            "selector": "h1"
        }
        self.run_test("Smart Scrape", "POST", "api/execute/smart-scrape", 200, scrape_data)
        
        # Test AI process
        ai_process_data = {
            "prompt": "Analyze this text and provide a summary",
            "context": "This is test context for AI processing"
        }
        self.run_test("AI Process Execution", "POST", "api/execute/ai-process", 200, ai_process_data)
        
        # Test send email
        email_data = {
            "to": "test@example.com",
            "subject": "Test Email from WorkRobo",
            "html_content": "<p>This is a test email from the execution engine.</p>"
        }
        self.run_test("Send Email", "POST", "api/execute/send-email", 200, email_data)
        
        # Test get activity logs
        self.run_test("Get Activity Logs", "GET", "api/execute/activity", 200)

    def test_websocket_endpoint(self):
        """Test WebSocket endpoint availability"""
        print("\n" + "="*50)
        print("TESTING WEBSOCKET ENDPOINT")
        print("="*50)
        
        # We can't easily test WebSocket with requests, but we can check if the endpoint exists
        # by trying to connect and seeing if we get the right error
        import websocket
        
        try:
            ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws'
            print(f"   Attempting WebSocket connection to: {ws_url}")
            
            # Try to create a WebSocket connection
            ws = websocket.create_connection(ws_url, timeout=5)
            print("   ✅ WebSocket connection successful")
            ws.close()
            
        except Exception as e:
            print(f"   ⚠️  WebSocket connection failed: {str(e)}")
            # This might be expected if authentication is required

    def test_stats_endpoint(self):
        """Test dashboard stats endpoint"""
        if not self.token:
            print("\n⚠️  Skipping Stats test - No auth token")
            return
            
        print("\n" + "="*50)
        print("TESTING STATS ENDPOINT")
        print("="*50)
        
        self.run_test("Get Dashboard Stats", "GET", "api/stats", 200)

def main():
    print("🚀 Starting WorkRobo.ai API Tests")
    print("="*60)
    
    tester = WorkRoboAPITester()
    
    # Run all tests
    tester.test_health_endpoints()
    tester.test_ping_endpoint()  # New Phase 2 test
    tester.test_auth_endpoints()
    tester.test_streams_endpoints()
    tester.test_sentry_endpoints()
    tester.test_pulse_endpoints()
    tester.test_hive_endpoints()
    tester.test_ai_endpoints()
    tester.test_execution_endpoints()  # New Phase 2 test
    tester.test_websocket_endpoint()  # New Phase 2 test
    tester.test_stats_endpoint()
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests ({len(tester.failed_tests)}):")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"{i}. {test['name']}")
            if 'error' in test:
                print(f"   Error: {test['error']}")
            else:
                print(f"   Expected: {test['expected']}, Got: {test['actual']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())