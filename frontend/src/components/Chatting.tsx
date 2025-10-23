import { useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Copy, Send, Users, MessageSquare, LogOut, X, Smile, Search } from 'lucide-react';
import Avatar from 'react-avatar';
import { format } from 'date-fns';
import "react-toastify/dist/ReactToastify.css";


interface User {
  name: string;
  icon: string;
  status?: 'online' | 'away' | 'busy';
  lastSeen?: Date;
}

interface Message {
  name: string;
  message: string;
  icon: string;
  timestamp?: Date;
  id?: string;
  reactions?: { [emoji: string]: string[] };
}

interface SystemMessage {
  message: string;
  userCount: number;
  users: User[];
  timestamp?: Date;
}

// Generate consistent colors for users
const userColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
  'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
];

function getUserColor(username: string): string {
  const index = username.charCodeAt(0) % userColors.length;
  return userColors[index];
}

// Audio notification - using data URI for reliability
const notificationSound = new Audio('src/assets/audio/notification-audio.mp3');
notificationSound.volume = 0.3;

export const Chatting = () => {
    const webSocketRef = useRef<WebSocket | null>(null);
    const usernameRef = useRef<string>("");
    const [messages, setMessages] = useState<(Message | SystemMessage)[]>([]);
    const [username, setUsername] = useState<string>("");
    const [currMsg, setCurrMsg] = useState<string>("");
    const [connected, setCon] = useState(false);
    const [roomid, setRoomid] = useState<string>("");
    const [userCount, setUserCount] = useState<number>(0);
    const [roomUsers, setRoomUsers] = useState<User[]>([]);
    const [showMembers, setShowMembers] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy'>('online');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const maxReconnectAttempts = 5;

    const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯'];

    // Update ref whenever username changes
    useEffect(() => {
        usernameRef.current = username;
    }, [username]);

    // Enable audio playback after user interaction
    useEffect(() => {
        const enableAudio = () => {
            notificationSound.load();
        };
        
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        return () => {
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
    }, []);


    const connectWebSocket = () => {
        if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setConnectionStatus('connecting');
        console.log("Setting up WebSocket connection...");
        
        //wss://zenchat-1-esw7.onrender.com
        const ws = new WebSocket("https://ws-zen-be.onrender.com");
        webSocketRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected");
            setConnectionStatus('connected');
            setReconnectAttempts(0);
            toast.success("Connected to chat server");
        };

        ws.onmessage = (event) => {
            try {
                console.log("Received message:", event.data);
                const data = JSON.parse(event.data);
                
                if (data.type === "system") {
                    console.log("System message received:", data.payload);
                    setUserCount(data.payload.userCount);
                    setRoomUsers(data.payload.users);
                    const systemMsg: SystemMessage = {
                        message: data.payload.message,
                        userCount: data.payload.userCount,
                        users: data.payload.users,
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, systemMsg]);
                } else if (data.type === "chat") {
                    console.log("Chat message received:", data.payload);
                    const chatMsg: Message = {
                        name: data.payload.name,
                        message: data.payload.message,
                        icon: data.payload.icon,
                        timestamp: data.payload.timestamp ? new Date(data.payload.timestamp) : new Date(),
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                    };
                    setMessages(prev => [...prev, chatMsg]);
                    
                    // Play notification sound for new messages (not from self)
                    if (data.payload.name !== usernameRef.current && notificationsEnabled) {
                        try {
                            notificationSound.currentTime = 0; // Reset to beginning
                            notificationSound.play().catch((error) => {
                                console.log('Audio play failed:', error);
                                // Fallback: try to play again after user interaction
                                document.addEventListener('click', () => {
                                    notificationSound.play().catch(() => {});
                                }, { once: true });
                            });
                        } catch (error) {
                            console.log('Audio error:', error);
                        }
                    }
                } else if (data.type === "typing") {
                    console.log("Typing indicator received:", data.payload);
                    setTypingUsers(prev => {
                        if (data.payload.isTyping) {
                            return prev.includes(data.payload.name) ? prev : [...prev, data.payload.name];
                        } else {
                            return prev.filter(name => name !== data.payload.name);
                        }
                    });
                } else if (data.type === "reaction") {
                    console.log("Reaction received:", data.payload);
                    setMessages(prev => prev.map(msg => {
                        if ('id' in msg && msg.id === data.payload.messageId) {
                            const currentReactions = msg.reactions || {};
                            const emojiReactions = currentReactions[data.payload.emoji] || [];
                            
                            let updatedReactions;
                            if (data.payload.action === 'toggle') {
                                if (emojiReactions.includes(data.payload.username)) {
                                    // Remove reaction
                                    updatedReactions = {
                                        ...currentReactions,
                                        [data.payload.emoji]: emojiReactions.filter((u: string) => u !== data.payload.username)
                                    };
                                } else {
                                    // Add reaction
                                    updatedReactions = {
                                        ...currentReactions,
                                        [data.payload.emoji]: [...emojiReactions, data.payload.username]
                                    };
                                }
                            } else {
                                updatedReactions = currentReactions;
                            }
                            
                            return {
                                ...msg,
                                reactions: updatedReactions
                            };
                        }
                        return msg;
                    }));
                }
            } catch (e) {
                console.error("Error parsing message:", e);
                toast.error("Error parsing message");
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            setConnectionStatus('error');
            toast.error("Connection error occurred");
        };

        ws.onclose = (event) => {
            console.log("WebSocket connection closed", event.code, event.reason);
            setConnectionStatus('disconnected');
            
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                toast.warning(`Connection lost. Reconnecting... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
                setReconnectAttempts(prev => prev + 1);
                
                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connectWebSocket();
                }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)); // Exponential backoff with max 30s
            } else if (reconnectAttempts >= maxReconnectAttempts) {
                toast.error("Failed to reconnect. Please refresh the page.");
            } else {
                toast.info("Disconnected from chat server");
            }
        };
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMsg = () => {
        if (!webSocketRef.current) {
          console.error("WebSocket not connected");
          return;
        }
    
        if (currMsg.trim() === "") {
          toast.warning("Message cannot be empty");
          return;
        }
    
        console.log("Sending message:", currMsg);
        webSocketRef.current.send(
          JSON.stringify({
            type: "chat",
            payload: {
              message: currMsg,
            },
          })
        );
        setCurrMsg("");
    };

    const leaveRoom = () => {
        if (webSocketRef.current) {
            webSocketRef.current.close();
        }
        setCon(false);
        setMessages([]);
        setRoomUsers([]);
        setUserCount(0);
        setShowMembers(false);
        toast.info("Left the room");
    };

    // this function creates a random room id and joins the room
    function createRoom() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let id = "";
    
        for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            id += chars[randomIndex];
        }
        joinRoom(id);
    }

    useEffect(() => {
        connectWebSocket();
        
        return () => {
          console.log("Cleaning up WebSocket connection...");
          if (webSocketRef.current) {
            webSocketRef.current.close();
          }
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };
    }, [notificationsEnabled]);
    
      const joinRoom = (roommid?: string) => {
        if (!webSocketRef.current) {
          console.error("WebSocket not connected");
          toast.error("WebSocket not connected");
          return;
        }
    
        if (!username.trim()) {
          toast.warning("Please enter a username");
          return;
        }
    
        const roomToJoin = roommid || roomid;
    
        if (!roomToJoin.trim()) {
          toast.warning("Please enter a Room ID");
          return;
        }
    
        console.log("Joining room:", roomToJoin, "as user:", username);
        const message = JSON.stringify({
          type: "join",
          payload: {
            roomId: roomToJoin,
            name: username
          },
        });
    
        setCon(true);
        setRoomid(roomToJoin);
        webSocketRef.current.send(message);
        toast.success(`Joined Room: ${roomToJoin}`);
      };
    
      function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && currMsg.trim() !== "") {
          sendMsg();
        }
      }

      const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrMsg(e.target.value);
        
        if (!isTyping && e.target.value.trim() !== "") {
          setIsTyping(true);
          if (webSocketRef.current) {
            webSocketRef.current.send(JSON.stringify({
              type: "typing",
              payload: { isTyping: true }
            }));
          }
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = window.setTimeout(() => {
          setIsTyping(false);
          if (webSocketRef.current) {
            webSocketRef.current.send(JSON.stringify({
              type: "typing",
              payload: { isTyping: false }
            }));
          }
        }, 1000);
      };

      const addEmojiToMessage = (emoji: string) => {
        setCurrMsg(prev => prev + emoji);
        setShowEmojiPicker(false);
      };

      const addReaction = (messageId: string, emoji: string) => {
        if (!webSocketRef.current) return;
        
        webSocketRef.current.send(JSON.stringify({
          type: "reaction",
          payload: {
            messageId: messageId,
            emoji: emoji,
            username: username
          }
        }));
      };


      const hasUserReacted = (message: Message, emoji: string) => {
        return message.reactions?.[emoji]?.includes(username) || false;
      };

      const updateUserStatus = (status: 'online' | 'away' | 'busy') => {
        setUserStatus(status);
        if (webSocketRef.current) {
          webSocketRef.current.send(JSON.stringify({
            type: "status",
            payload: { status: status }
          }));
        }
      };

      const getStatusColor = (status: string) => {
        switch (status) {
          case 'online': return 'text-green-500';
          case 'away': return 'text-yellow-500';
          case 'busy': return 'text-red-500';
          default: return 'text-gray-500';
        }
      };

      const getStatusText = (status: string) => {
        switch (status) {
          case 'online': return '● Online';
          case 'away': return '● Away';
          case 'busy': return '● Busy';
          default: return '● Offline';
        }
      };

      const searchMessages = (query: string) => {
        if (!query.trim()) {
          setSearchResults([]);
          setCurrentSearchIndex(0);
          return;
        }

        const results = messages.filter((msg): msg is Message => 
          'message' in msg && 
          msg.message.toLowerCase().includes(query.toLowerCase())
        );
        
        setSearchResults(results);
        setCurrentSearchIndex(0);
      };

      const highlightSearchTerm = (text: string, query: string) => {
        if (!query.trim()) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 px-1 rounded">
              {part}
            </mark>
          ) : part
        );
      };

      const scrollToSearchResult = (index: number) => {
        if (searchResults.length === 0) return;
        
        const targetIndex = Math.max(0, Math.min(index, searchResults.length - 1));
        setCurrentSearchIndex(targetIndex);
        
        // Find the message element and scroll to it
        const messageElement = document.querySelector(`[data-message-id="${searchResults[targetIndex].id}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
    
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <ToastContainer
            position="top-left"
            autoClose={3500}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
    
          {!connected ? (
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">ZENCHAT</h1>
                  <p className="text-sm sm:text-base text-gray-600">Connect and chat in real-time</p>
              </div>

                <div className="space-y-4 sm:space-y-6">
                <button
                  onClick={createRoom}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 font-medium text-sm sm:text-base"
                >
                    <MessageSquare className="w-5 h-5" />
                    Create a new room
                </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs sm:text-sm">
                      <span className="px-2 bg-white text-gray-500">or join existing</span>
              </div>
              </div>
    
                  <div className="space-y-3 sm:space-y-4">
                  <input
                    onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-sm sm:text-base"
                    type="text"
                    placeholder="Enter your name"
                  />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      onChange={(e) => setRoomid(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-sm sm:text-base"
                      type="text"
                      placeholder="Enter room ID"
                    />
                    <button
                      onClick={() => joinRoom()}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 font-medium text-sm sm:text-base"
                    >
                      Join
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-2 sm:p-4 h-screen">
              <div className="w-full max-w-6xl h-full bg-white rounded-2xl shadow-lg flex flex-col lg:flex-row">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-700 text-sm sm:text-base truncate">
                        Room: {roomid} • {userCount} {userCount === 1 ? 'user' : 'users'}
                      </span>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} title={`Connection: ${connectionStatus}`}></div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Search</span>
                      </button>
                      <button
                        onClick={() => setShowMembers(!showMembers)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Members</span>
                      </button>
                        <button
                          onClick={() => {
                          navigator.clipboard.writeText(roomid);
                          toast.success("Room ID copied!");
                        }}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                      <button
                        onClick={leaveRoom}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Leave</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  {showSearch && (
                    <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            searchMessages(e.target.value);
                          }}
                          placeholder="Search messages..."
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                        {searchResults.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{currentSearchIndex + 1} of {searchResults.length}</span>
                            <button
                              onClick={() => scrollToSearchResult(currentSearchIndex - 1)}
                              disabled={currentSearchIndex === 0}
                              className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => scrollToSearchResult(currentSearchIndex + 1)}
                              disabled={currentSearchIndex === searchResults.length - 1}
                              className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ↓
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setShowSearch(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="px-3 py-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {messages.map((msg, index) => (
                      'userCount' in msg ? (
                        // System message
                        <div key={index} className="flex justify-center">
                          <div className="px-3 sm:px-4 py-2 bg-gray-100 rounded-full text-xs sm:text-sm text-gray-600 text-center max-w-[90%] sm:max-w-none">
                            {msg.message}
                            {msg.timestamp && (
                              <span className="ml-2 text-xs opacity-75">
                                {format(msg.timestamp, 'HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Chat message
                        <div
                          key={index}
                          data-message-id={msg.id}
                          className={`flex ${msg.name === username ? 'justify-end' : 'justify-start'} items-end gap-2 ${
                            searchResults.some(result => result.id === msg.id) ? 'bg-yellow-50 rounded-lg p-2' : ''
                          }`}
                        >
                          {msg.name !== username && (
                            <Avatar
                              name={msg.name}
                              size="32"
                              round={true}
                              className="flex-shrink-0"
                            />
                          )}
                          <div
                            className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 ${
                              msg.name === username
                                ? getUserColor(msg.name) + ' text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p className="text-xs sm:text-sm font-medium mb-1">{msg.name}</p>
                            <p className="text-sm sm:text-base break-words">
                              {searchQuery ? highlightSearchTerm(msg.message, searchQuery) : msg.message}
                            </p>
                            {msg.timestamp && (
                              <p className={`text-xs mt-1 ${msg.name === username ? 'text-white/70' : 'text-gray-500'}`}>
                                {format(msg.timestamp, 'HH:mm')}
                              </p>
                            )}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => addReaction(msg.id!, emoji)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                      hasUserReacted(msg, emoji)
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {msg.name === username && (
                            <Avatar
                              name={msg.name}
                              size="32"
                              round={true}
                              className="flex-shrink-0"
                            />
                          )}
                    </div>
                      )
                    ))}
                    
                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                      <div className="flex justify-start items-center gap-2 py-2">
                        <div className="flex items-center gap-1">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-gray-500 ml-2">
                            {typingUsers.length === 1 
                              ? `${typingUsers[0]} is typing...`
                              : typingUsers.length === 2
                              ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                              : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 sm:p-4 border-t border-gray-200">
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex flex-wrap gap-2">
                          {commonEmojis.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => addEmojiToMessage(emoji)}
                              className="text-2xl hover:bg-gray-200 rounded-lg p-2 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="px-3 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all duration-300 flex items-center justify-center"
                    >
                      <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <input
                      value={currMsg}
                        onChange={handleTyping}
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-sm sm:text-base"
                      type="text"
                        placeholder="Type a message..."
                    />
                    <button
                      onClick={sendMsg}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 flex items-center justify-center"
                    >
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={(e) => setNotificationsEnabled(e.target.checked)}
                          className="rounded"
                        />
                        <span className="hidden sm:inline">Sound notifications</span>
                        <span className="sm:hidden">Sound</span>
                      </label>
                      <button
                        onClick={() => {
                          try {
                            notificationSound.currentTime = 0;
                            notificationSound.play().catch((error) => {
                              console.log('Test audio failed:', error);
                              toast.error('Audio test failed - check browser audio settings');
                            });
                          } catch (error) {
                            console.log('Test audio error:', error);
                            toast.error('Audio test failed');
                          }
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      >
                        Test Sound
                      </button>
                    </div>
                  </div>
                </div>

                {/* Members Sidebar - Mobile Overlay / Desktop Sidebar */}
                {showMembers && (
                  <>
                    {/* Mobile overlay */}
                    <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMembers(false)} />
                    
                    {/* Sidebar */}
                    <div className={`fixed lg:relative inset-y-0 right-0 lg:inset-auto w-80 max-w-[90vw] lg:max-w-none border-l border-gray-200 bg-gray-50 z-50 transform transition-transform duration-300 ${showMembers ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm sm:text-base">Room Members</h3>
                          <p className="text-xs sm:text-sm text-gray-500">{userCount} online</p>
                        </div>
                        <button
                          onClick={() => setShowMembers(false)}
                          className="lg:hidden p-1 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)] lg:max-h-none">
                        {roomUsers.map((user, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <Avatar
                              name={user.name}
                              size="32"
                              round={true}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                              <p className={`text-xs ${getStatusColor(user.status || 'online')}`}>
                                {getStatusText(user.status || 'online')}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Status Controls for Current User */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">Your Status</p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateUserStatus('online')}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                userStatus === 'online' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              Online
                            </button>
                            <button
                              onClick={() => updateUserStatus('away')}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                userStatus === 'away' 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              Away
                            </button>
                            <button
                              onClick={() => updateUserStatus('busy')}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                userStatus === 'busy' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              Busy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      );
};