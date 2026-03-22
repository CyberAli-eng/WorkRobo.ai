import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

export const useWorkflowWebSocket = (workflowId) => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [executionLogs, setExecutionLogs] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      // Build WebSocket URL with query params
      let wsUrl = `${WS_URL}/ws`;
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      if (workflowId) params.append('workflow_id', workflowId);
      if (params.toString()) wsUrl += `?${params.toString()}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to workflow if provided
        if (workflowId) {
          wsRef.current.send(JSON.stringify({
            type: 'subscribe_workflow',
            workflow_id: workflowId
          }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Handle different message types
          switch (data.type) {
            case 'node_status':
              setNodeStatuses(prev => ({
                ...prev,
                [data.node_id]: {
                  status: data.status,
                  result: data.result,
                  error: data.error,
                  timestamp: data.timestamp
                }
              }));
              setExecutionLogs(prev => [...prev, {
                type: 'node_status',
                ...data
              }]);
              break;
              
            case 'execution_complete':
              setExecutionLogs(prev => [...prev, {
                type: 'execution_complete',
                ...data
              }]);
              break;
              
            case 'execution_error':
              setExecutionLogs(prev => [...prev, {
                type: 'error',
                ...data
              }]);
              break;
              
            case 'activity_log':
              setExecutionLogs(prev => [...prev, data]);
              break;
              
            default:
              console.log('WebSocket message:', data);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [workflowId]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);
  
  const subscribeToWorkflow = useCallback((wfId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_workflow',
        workflow_id: wfId
      }));
    }
  }, []);
  
  const unsubscribeFromWorkflow = useCallback((wfId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_workflow',
        workflow_id: wfId
      }));
    }
  }, []);
  
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);
  
  const clearStatuses = useCallback(() => {
    setNodeStatuses({});
    setExecutionLogs([]);
  }, []);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return {
    isConnected,
    nodeStatuses,
    executionLogs,
    lastMessage,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    sendPing,
    clearStatuses,
    reconnect: connect
  };
};

export default useWorkflowWebSocket;
