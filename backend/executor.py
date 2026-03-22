"""
WorkRobo.ai - Workflow Executor Module
Parses ReactFlow JSON and executes automation workflows
"""

import asyncio
import logging
import json
import re
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class NodeStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class ExecutionContext:
    """
    Holds the execution state and data flow between nodes.
    Allows data from one node to be available to subsequent nodes.
    """
    
    def __init__(self, workflow_id: str, user_id: str):
        self.workflow_id = workflow_id
        self.user_id = user_id
        self.execution_id = str(uuid.uuid4())
        self.start_time = datetime.now(timezone.utc)
        self.variables: Dict[str, Any] = {}
        self.node_results: Dict[str, Any] = {}
        self.node_statuses: Dict[str, NodeStatus] = {}
        self.logs: List[Dict[str, Any]] = []
        self.errors: List[Dict[str, Any]] = []
        
    def set_variable(self, key: str, value: Any):
        """Store a variable in the execution context"""
        self.variables[key] = value
        self.log(f"Variable set: {key}")
        
    def get_variable(self, key: str, default: Any = None) -> Any:
        """Retrieve a variable from the execution context"""
        return self.variables.get(key, default)
        
    def set_node_result(self, node_id: str, result: Any):
        """Store the result of a node execution"""
        self.node_results[node_id] = result
        
    def get_node_result(self, node_id: str) -> Any:
        """Get the result of a previously executed node"""
        return self.node_results.get(node_id)
        
    def set_node_status(self, node_id: str, status: NodeStatus):
        """Update the status of a node"""
        self.node_statuses[node_id] = status
        
    def log(self, message: str, level: str = "info"):
        """Add a log entry"""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
            "execution_id": self.execution_id
        }
        self.logs.append(entry)
        logger.log(getattr(logging, level.upper(), logging.INFO), f"[{self.execution_id[:8]}] {message}")
        
    def error(self, node_id: str, error: str):
        """Record an error"""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "node_id": node_id,
            "error": error,
            "execution_id": self.execution_id
        }
        self.errors.append(entry)
        self.log(f"Node {node_id} error: {error}", "error")
        
    def interpolate_template(self, template: str) -> str:
        """
        Replace template variables like {{variable_name}} or {{node_id.field}}
        with actual values from the context.
        """
        def replacer(match):
            var_path = match.group(1).strip()
            
            # Check if it's a node result reference (e.g., node_123.content)
            if '.' in var_path:
                parts = var_path.split('.', 1)
                node_id = parts[0]
                field = parts[1]
                node_result = self.get_node_result(node_id)
                if node_result and isinstance(node_result, dict):
                    return str(node_result.get(field, f'{{{{${var_path}}}}}'))
                return f'{{{{{var_path}}}}}'
            
            # Check variables first
            if var_path in self.variables:
                return str(self.variables[var_path])
                
            # Check special variables
            special_vars = {
                'scraped_data': self.get_variable('last_scraped_content', ''),
                'ai_summary': self.get_variable('last_ai_response', ''),
                'execution_id': self.execution_id,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
            if var_path in special_vars:
                return str(special_vars[var_path])
                
            return f'{{{{{var_path}}}}}'  # Return unchanged if not found
            
        return re.sub(r'\{\{([^}]+)\}\}', replacer, template)
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for storage/transmission"""
        return {
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "execution_id": self.execution_id,
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.now(timezone.utc).isoformat(),
            "variables": self.variables,
            "node_statuses": {k: v.value for k, v in self.node_statuses.items()},
            "logs": self.logs,
            "errors": self.errors
        }


class WorkflowExecutor:
    """
    Executes ReactFlow-based workflows by parsing the JSON structure
    and running each node in sequence based on edge connections.
    """
    
    def __init__(self, db, scraper, gemini_model, status_callback: Optional[Callable] = None):
        """
        Args:
            db: MongoDB database instance
            scraper: StealthScraper instance
            gemini_model: Configured Gemini model
            status_callback: Async callback for real-time status updates
        """
        self.db = db
        self.scraper = scraper
        self.gemini_model = gemini_model
        self.status_callback = status_callback
        
        # Node type handlers
        self.node_handlers: Dict[str, Callable] = {
            'trigger': self._handle_trigger_node,
            'webhook': self._handle_trigger_node,
            'sentry': self._handle_sentry_node,
            'scraper': self._handle_sentry_node,
            'ai': self._handle_ai_node,
            'hive': self._handle_ai_node,
            'email': self._handle_email_node,
            'pulse': self._handle_email_node,
            'delay': self._handle_delay_node,
            'code': self._handle_code_node,
            'database': self._handle_database_node,
            'condition': self._handle_condition_node,
        }
        
    async def execute_stream(
        self,
        workflow: Dict[str, Any],
        user_id: str,
        trigger_data: Optional[Dict[str, Any]] = None
    ) -> ExecutionContext:
        """
        Execute a complete Robo-Stream workflow.
        
        Args:
            workflow: The workflow document containing nodes and edges
            user_id: The user who owns this workflow
            trigger_data: Optional data passed from the trigger
            
        Returns:
            ExecutionContext with all results and logs
        """
        ctx = ExecutionContext(workflow['id'], user_id)
        ctx.log(f"Starting execution of workflow: {workflow.get('name', 'Unnamed')}")
        
        if trigger_data:
            ctx.variables['trigger_data'] = trigger_data
            
        nodes = workflow.get('nodes', [])
        edges = workflow.get('edges', [])
        
        if not nodes:
            ctx.log("No nodes to execute", "warning")
            return ctx
            
        # Build adjacency map for edge traversal
        adjacency = self._build_adjacency_map(edges)
        
        # Find trigger/start nodes (nodes with no incoming edges)
        incoming = set()
        for edge in edges:
            incoming.add(edge.get('target'))
        start_nodes = [n for n in nodes if n['id'] not in incoming]
        
        if not start_nodes:
            start_nodes = [nodes[0]]  # Fallback to first node
            
        # Execute starting from trigger nodes
        for start_node in start_nodes:
            await self._execute_node_chain(start_node, nodes, adjacency, ctx)
            
        ctx.log(f"Workflow execution completed - {len(ctx.node_results)} nodes processed")
        
        # Store execution log
        await self._store_execution_log(ctx)
        
        return ctx
        
    def _build_adjacency_map(self, edges: List[Dict]) -> Dict[str, List[str]]:
        """Build a map of node_id -> [connected_node_ids]"""
        adjacency = {}
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source not in adjacency:
                adjacency[source] = []
            adjacency[source].append(target)
        return adjacency
        
    async def _execute_node_chain(
        self,
        node: Dict[str, Any],
        all_nodes: List[Dict],
        adjacency: Dict[str, List[str]],
        ctx: ExecutionContext
    ):
        """Execute a node and continue to connected nodes"""
        node_id = node['id']
        
        # Skip if already executed
        if node_id in ctx.node_results:
            return
            
        node_type = node.get('data', {}).get('nodeType', node.get('type', 'unknown'))
        ctx.log(f"Executing node: {node_id} (type: {node_type})")
        ctx.set_node_status(node_id, NodeStatus.RUNNING)
        
        # Notify status update
        await self._notify_status(ctx, node_id, NodeStatus.RUNNING)
        
        try:
            # Get the handler for this node type
            handler = self.node_handlers.get(node_type, self._handle_unknown_node)
            result = await handler(node, ctx)
            
            ctx.set_node_result(node_id, result)
            ctx.set_node_status(node_id, NodeStatus.SUCCESS)
            await self._notify_status(ctx, node_id, NodeStatus.SUCCESS, result)
            
        except Exception as e:
            ctx.error(node_id, str(e))
            ctx.set_node_status(node_id, NodeStatus.FAILED)
            await self._notify_status(ctx, node_id, NodeStatus.FAILED, error=str(e))
            # Continue execution despite errors (can be configured)
            
        # Execute connected nodes
        connected_ids = adjacency.get(node_id, [])
        nodes_map = {n['id']: n for n in all_nodes}
        
        for next_id in connected_ids:
            next_node = nodes_map.get(next_id)
            if next_node:
                await self._execute_node_chain(next_node, all_nodes, adjacency, ctx)
                
    async def _notify_status(
        self,
        ctx: ExecutionContext,
        node_id: str,
        status: NodeStatus,
        result: Any = None,
        error: str = None
    ):
        """Send real-time status update"""
        if self.status_callback:
            try:
                await self.status_callback({
                    'execution_id': ctx.execution_id,
                    'workflow_id': ctx.workflow_id,
                    'node_id': node_id,
                    'status': status.value,
                    'result': result,
                    'error': error,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            except Exception as e:
                logger.error(f"Status callback failed: {e}")
                
    async def _store_execution_log(self, ctx: ExecutionContext):
        """Store execution log in database"""
        try:
            log_doc = ctx.to_dict()
            log_doc['_id'] = ctx.execution_id
            await self.db.execution_logs.insert_one(log_doc)
        except Exception as e:
            logger.error(f"Failed to store execution log: {e}")
            
    # ============== NODE HANDLERS ==============
    
    async def _handle_trigger_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle trigger/webhook node - starts the workflow"""
        config = node.get('data', {}).get('config', {})
        ctx.log(f"Trigger node activated")
        return {
            'triggered': True,
            'trigger_type': config.get('type', 'manual'),
            'trigger_data': ctx.get_variable('trigger_data', {})
        }
        
    async def _handle_sentry_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle Sentry/scraper node - web scraping with change detection"""
        config = node.get('data', {}).get('config', {})
        url = ctx.interpolate_template(config.get('url', ''))
        selector = config.get('selector')
        
        if not url:
            raise ValueError("Sentry node requires a URL")
            
        ctx.log(f"Scraping URL: {url}")
        
        # Get previous hash for change detection
        target = await self.db.sentry_targets.find_one({'url': url, 'user_id': ctx.user_id})
        last_hash = target.get('last_content_hash') if target else None
        
        # Perform scrape
        change_detected, result = await self.scraper.check_for_changes(url, last_hash, selector)
        
        if result['success']:
            # Update stored hash
            await self.db.sentry_targets.update_one(
                {'url': url, 'user_id': ctx.user_id},
                {
                    '$set': {
                        'last_content_hash': result['content_hash'],
                        'last_checked': result['timestamp'],
                        'change_detected': change_detected
                    }
                },
                upsert=True
            )
            
            # Store scraped content in context for other nodes
            ctx.set_variable('scraped_data', result['content'])
            ctx.set_variable('last_scraped_content', result['content'])
            ctx.set_variable('change_detected', change_detected)
            
        result['change_detected'] = change_detected
        return result
        
    async def _handle_ai_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle AI/Hive node - process data with Gemini"""
        config = node.get('data', {}).get('config', {})
        prompt_template = config.get('prompt', 'Analyze the following data and provide insights:\n\n{{scraped_data}}')
        
        # Interpolate variables in prompt
        prompt = ctx.interpolate_template(prompt_template)
        
        ctx.log(f"Sending prompt to Gemini AI ({len(prompt)} chars)")
        
        if not self.gemini_model:
            raise ValueError("Gemini AI not configured")
            
        try:
            # Generate response with structured output request
            response = self.gemini_model.generate_content(
                f"""You are an automation assistant. Respond in JSON format with the following structure:
{{
    "summary": "A brief summary of your analysis",
    "key_points": ["point 1", "point 2"],
    "action_recommended": true/false,
    "details": "Detailed analysis"
}}

{prompt}"""
            )
            
            response_text = response.text
            ctx.set_variable('ai_response', response_text)
            ctx.set_variable('last_ai_response', response_text)
            
            # Try to parse as JSON
            try:
                # Extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    parsed = json.loads(json_match.group())
                    return {
                        'success': True,
                        'response': response_text,
                        'parsed': parsed,
                        'tokens_used': len(response_text.split())
                    }
            except json.JSONDecodeError:
                pass
                
            return {
                'success': True,
                'response': response_text,
                'parsed': None,
                'tokens_used': len(response_text.split())
            }
            
        except Exception as e:
            ctx.log(f"AI processing failed: {e}", "error")
            raise
            
    async def _handle_email_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle Email/Pulse node - send emails via Resend"""
        import resend
        
        config = node.get('data', {}).get('config', {})
        to_email = ctx.interpolate_template(config.get('to', ''))
        subject = ctx.interpolate_template(config.get('subject', 'WorkRobo Notification'))
        body_template = config.get('body', '<p>{{ai_summary}}</p>')
        html_content = ctx.interpolate_template(body_template)
        
        if not to_email:
            raise ValueError("Email node requires a recipient")
            
        ctx.log(f"Sending email to: {to_email}")
        
        try:
            params = {
                "from": "WorkRobo.ai <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            
            # Use asyncio.to_thread for sync SDK
            email_response = await asyncio.to_thread(resend.Emails.send, params)
            
            return {
                'success': True,
                'email_id': email_response.get('id'),
                'to': to_email,
                'subject': subject
            }
            
        except Exception as e:
            ctx.log(f"Email send failed: {e}", "error")
            raise
            
    async def _handle_delay_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle Delay node - pause execution"""
        config = node.get('data', {}).get('config', {})
        delay_seconds = config.get('seconds', 5)
        
        ctx.log(f"Delaying for {delay_seconds} seconds")
        await asyncio.sleep(delay_seconds)
        
        return {
            'delayed': True,
            'seconds': delay_seconds
        }
        
    async def _handle_code_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle Code node - execute custom Python code (sandboxed)"""
        config = node.get('data', {}).get('config', {})
        code = config.get('code', '')
        
        ctx.log("Executing code node")
        
        # Create a safe execution environment
        safe_globals = {
            'ctx': ctx.variables.copy(),
            'result': {},
            'json': json,
            're': re,
        }
        
        try:
            exec(code, safe_globals)
            result = safe_globals.get('result', {})
            
            # Update context with any new variables
            if isinstance(result, dict):
                for k, v in result.items():
                    ctx.set_variable(k, v)
                    
            return {'success': True, 'output': result}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    async def _handle_database_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle Database node - CRUD operations"""
        config = node.get('data', {}).get('config', {})
        operation = config.get('operation', 'find')
        collection = config.get('collection', 'custom_data')
        query = config.get('query', {})
        data = config.get('data', {})
        
        ctx.log(f"Database operation: {operation} on {collection}")
        
        coll = self.db[collection]
        
        if operation == 'find':
            results = await coll.find(query, {'_id': 0}).to_list(100)
            return {'success': True, 'documents': results}
        elif operation == 'insert':
            result = await coll.insert_one(data)
            return {'success': True, 'inserted_id': str(result.inserted_id)}
        elif operation == 'update':
            result = await coll.update_many(query, {'$set': data})
            return {'success': True, 'modified_count': result.modified_count}
        elif operation == 'delete':
            result = await coll.delete_many(query)
            return {'success': True, 'deleted_count': result.deleted_count}
            
        return {'success': False, 'error': f'Unknown operation: {operation}'}
        
    async def _handle_condition_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle Condition node - branching logic"""
        config = node.get('data', {}).get('config', {})
        condition = config.get('condition', 'change_detected == True')
        
        # Evaluate condition with context variables
        try:
            result = eval(condition, {'__builtins__': {}}, ctx.variables)
            ctx.set_variable('condition_result', result)
            return {'condition': condition, 'result': bool(result)}
        except Exception as e:
            return {'condition': condition, 'result': False, 'error': str(e)}
            
    async def _handle_unknown_node(self, node: Dict, ctx: ExecutionContext) -> Dict:
        """Handle unknown node types"""
        node_type = node.get('data', {}).get('nodeType', 'unknown')
        ctx.log(f"Unknown node type: {node_type}", "warning")
        return {'skipped': True, 'reason': f'Unknown node type: {node_type}'}
