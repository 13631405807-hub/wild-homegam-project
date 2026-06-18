import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface OnlineUser {
  userId: string;
  nickname: string;
  onlineAt: string;
}

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>({});

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupPresence = async () => {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get user profile for nickname
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single();

      const nickname = profile?.nickname || session.user.email?.split('@')[0] || 'Unknown';

      // Subscribe to presence channel
      channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: session.user.id,
          },
        },
      });

      // Track presence state
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineUser>();
        const users: Record<string, OnlineUser> = {};

        Object.keys(state).forEach(userId => {
          const presences = state[userId];
          if (presences && presences.length > 0) {
            users[userId] = presences[0];
          }
        });

        setOnlineUsers(users);
      });

      channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          setOnlineUsers(prev => ({
            ...prev,
            [key]: newPresences[0] as OnlineUser,
          }));
        }
      });

      channel.on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      });

      // Subscribe and track presence
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: session.user.id,
            nickname,
            onlineAt: new Date().toISOString(),
          });
        }
      });
    };

    setupPresence();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return onlineUsers;
}
