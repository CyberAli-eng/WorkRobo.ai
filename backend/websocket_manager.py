"""
WorkRobo.ai - WebSocket Manager for Real-time Updates
Handles real-time communication between backend and frontend
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
import uuid

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates.
    Supports broadcasting to all clients or specific users/workflows.
    """
    
    def __init__(self):
        # Active connections: connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # User subscriptions: user_id -> set of connection_ids
        self.user_connections: Dict[str, Set[str]] = {}
        # Workflow subscriptions: workflow_id -> set of connection_ids  
        self.workflow_subscriptions: Dict[str, Set[str]] = {}
        # Connection metadata
        self.connection_meta: Dict[str, Dict] = {}
        
    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
        workflow_id: Optional[str] = None
    ) -> str:
        """Accept a new WebSocket connection"""
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        
        self.active_connections[connection_id] = websocket
        self.connection_meta[connection_id] = {
            'user_id': user_id,
            'workflow_id': workflow_id,
            'connected_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Add to user connections
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
            
        # Subscribe to workflow
        if workflow_id:
            if workflow_id not in self.workflow_subscriptions:
                self.workflow_subscriptions[workflow_id] = set()
            self.workflow_subscriptions[workflow_id].add(connection_id)
            
        logger.info(f"WebSocket connected: {connection_id} (user: {user_id}, workflow: {workflow_id})")
        
        # Send welcome message
        await self.send_personal(connection_id, {
            'type': 'connected',
            'connection_id': connection_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        return connection_id
        
    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            
        meta = self.connection_meta.pop(connection_id, {})
        user_id = meta.get('user_id')
        workflow_id = meta.get('workflow_id')
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                
        # Remove from workflow subscriptions
        if workflow_id and workflow_id in self.workflow_subscriptions:
            self.workflow_subscriptions[workflow_id].discard(connection_id)
            if not self.workflow_subscriptions[workflow_id]:
                del self.workflow_subscriptions[workflow_id]
                
        logger.info(f"WebSocket disconnected: {connection_id}")
        
    async def subscribe_to_workflow(self, connection_id: str, workflow_id: str):
        """Subscribe a connection to workflow updates"""
        if workflow_id not in self.workflow_subscriptions:
            self.workflow_subscriptions[workflow_id] = set()
        self.workflow_subscriptions[workflow_id].add(connection_id)
        
        # Update connection meta
        if connection_id in self.connection_meta:
            self.connection_meta[connection_id]['workflow_id'] = workflow_id
            
    async def unsubscribe_from_workflow(self, connection_id: str, workflow_id: str):
        """Unsubscribe a connection from workflow updates"""
        if workflow_id in self.workflow_subscriptions:
            self.workflow_subscriptions[workflow_id].discard(connection_id)
            
    async def send_personal(self, connection_id: str, message: Dict[str, Any]):
        """Send a message to a specific connection"""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to {connection_id}: {e}")
                self.disconnect(connection_id)
                
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send a message to all connections of a specific user"""
        if user_id in self.user_connections:
            for conn_id in list(self.user_connections[user_id]):
                await self.send_personal(conn_id, message)
                
    async def send_to_workflow(self, workflow_id: str, message: Dict[str, Any]):
        """Send a message to all connections subscribed to a workflow"""
        if workflow_id in self.workflow_subscriptions:
            for conn_id in list(self.workflow_subscriptions[workflow_id]):
                await self.send_personal(conn_id, message)
                
    async def broadcast(self, message: Dict[str, Any]):
        """Send a message to all connected clients"""
        for conn_id in list(self.active_connections.keys()):
            await self.send_personal(conn_id, message)
            
    async def send_node_status(
        self,
        workflow_id: str,
        execution_id: str,
        node_id: str,
        status: str,
        result: Any = None,
        error: str = None
    ):
        """Send a node status update to workflow subscribers"""
        message = {
            'type': 'node_status',
            'workflow_id': workflow_id,
            'execution_id': execution_id,
            'node_id': node_id,
            'status': status,
            'result': result,
            'error': error,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        await self.send_to_workflow(workflow_id, message)
        
    async def send_execution_complete(
        self,
        workflow_id: str,
        execution_id: str,
        success: bool,
        summary: Dict[str, Any]
    ):
        """Send execution completion notification"""
        message = {
            'type': 'execution_complete',
            'workflow_id': workflow_id,
            'execution_id': execution_id,
            'success': success,
            'summary': summary,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        await self.send_to_workflow(workflow_id, message)
        
    async def send_activity_log(self, user_id: str, log_entry: Dict[str, Any]):
        """Send an activity log entry to a user"""
        message = {
            'type': 'activity_log',
            **log_entry,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        await self.send_to_user(user_id, message)
        
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)
        
    def get_user_connection_count(self, user_id: str) -> int:
        """Get the number of connections for a specific user"""
        return len(self.user_connections.get(user_id, set()))


# Global connection manager instance
ws_manager = ConnectionManager()
