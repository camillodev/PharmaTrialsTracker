import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket<T>() {
  const [data, setData] = useState<T[]>([]);
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const connect = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      console.log('Max retries reached, stopping reconnection attempts');
      return null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      console.log(`Connecting to WebSocket at ${protocol}//${host}`);

      const ws = new WebSocket(
        `${protocol}//${host}`,
        ['clinical-trial']
      );

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setRetryCount(0); // Reset retry count on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'outlier') {
            setData(prev => [message.data, ...prev]);
            toast({
              title: 'New Outlier Detected',
              description: message.data.message,
              variant: 'destructive',
            });
          } else if (message.type === 'connection') {
            console.log('WebSocket message:', message.data.message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setRetryCount(prev => prev + 1);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Only attempt to reconnect if we haven't reached max retries
        if (retryCount < MAX_RETRIES) {
          console.log(`Attempting to reconnect (retry ${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            connect();
          }, 2000);
        }
      };

      return ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      return null;
    }
  }, [toast, retryCount]);

  useEffect(() => {
    const ws = connect();
    return () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [connect]);

  return data;
}