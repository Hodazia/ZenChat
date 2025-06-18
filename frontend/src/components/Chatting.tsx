import { useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Copy, Send, Users, MessageSquare, LogOut, X } from 'lucide-react';
import Avatar from 'react-avatar';
import { format } from 'date-fns';
import "react-toastify/dist/ReactToastify.css";

interface User {
  name: string;
  icon: string;
}

interface Message {
  name: string;
  message: string;
  icon: string;
  timestamp?: Date;
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

// Audio notification
const notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Update ref whenever username changes
    useEffect(() => {
        usernameRef.current = username;
    }, [username]);

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
        console.log("Setting up WebSocket connection...");
        const ws = new WebSocket("wss://zenchat-1-esw7.onrender.com");
        webSocketRef.current = ws;
    
        ws.onopen = () => {
          console.log("WebSocket connected");
          toast.info("Connected to WebSocket");
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
                timestamp: new Date()
              };
              setMessages(prev => [...prev, chatMsg]);
              
              // Play notification sound for new messages (not from self)
              if (data.payload.name !== usernameRef.current && notificationsEnabled) {
                notificationSound.play().catch(() => {});
              }
            }
          } catch (e) {
            console.error("Error parsing message:", e);
            toast.error("Error parsing message");
          }
        };
    
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          toast.error("WebSocket connection error");
        };
    
        ws.onclose = () => {
          console.log("WebSocket connection closed");
          toast.warning("WebSocket connection closed");
        };
    
        return () => {
          console.log("Cleaning up WebSocket connection...");
          if (webSocketRef.current) {
            webSocketRef.current.close();
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
    
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
              <div className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <div className="text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">ZENCHAT</h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Connect and chat in real-time</p>
              </div>

                <div className="space-y-4 sm:space-y-6">
                <button
                  onClick={createRoom}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl transition-all duration-300 font-medium text-sm sm:text-base"
                >
                    <MessageSquare className="w-5 h-5" />
                    Create a new room
                </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs sm:text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or join existing</span>
              </div>
              </div>
    
                  <div className="space-y-3 sm:space-y-4">
                  <input
                    onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-sm sm:text-base"
                    type="text"
                    placeholder="Enter your name"
                  />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      onChange={(e) => setRoomid(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-sm sm:text-base"
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
              <div className="w-full max-w-6xl h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col lg:flex-row">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base truncate">
                        Room: {roomid} • {userCount} {userCount === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => setShowMembers(!showMembers)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Members</span>
                      </button>
                        <button
                          onClick={() => {
                          navigator.clipboard.writeText(roomid);
                          toast.success("Room ID copied!");
                        }}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                      <button
                        onClick={leaveRoom}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Leave</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {messages.map((msg, index) => (
                      'userCount' in msg ? (
                        // System message
                        <div key={index} className="flex justify-center">
                          <div className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center max-w-[90%] sm:max-w-none">
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
                          className={`flex ${msg.name === username ? 'justify-end' : 'justify-start'} items-end gap-2`}
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
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <p className="text-xs sm:text-sm font-medium mb-1">{msg.name}</p>
                            <p className="text-sm sm:text-base break-words">{msg.message}</p>
                            {msg.timestamp && (
                              <p className={`text-xs mt-1 ${msg.name === username ? 'text-white/70' : 'text-gray-500'}`}>
                                {format(msg.timestamp, 'HH:mm')}
                              </p>
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
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                    <input
                      value={currMsg}
                        onChange={(e) => setCurrMsg(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-sm sm:text-base"
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
                      <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={(e) => setNotificationsEnabled(e.target.checked)}
                          className="rounded"
                        />
                        <span className="hidden sm:inline">Sound notifications</span>
                        <span className="sm:hidden">Sound</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Members Sidebar - Mobile Overlay / Desktop Sidebar */}
                {showMembers && (
                  <>
                    {/* Mobile overlay */}
                    <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMembers(false)} />
                    
                    {/* Sidebar */}
                    <div className={`fixed lg:relative inset-y-0 right-0 lg:inset-auto w-80 max-w-[90vw] lg:max-w-none border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 z-50 transform transition-transform duration-300 ${showMembers ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Room Members</h3>
                          <p className="text-xs sm:text-sm text-gray-500">{userCount} online</p>
                        </div>
                        <button
                          onClick={() => setShowMembers(false)}
                          className="lg:hidden p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)] lg:max-h-none">
                        {roomUsers.map((user, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Avatar
                              name={user.name}
                              size="32"
                              round={true}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
                              <p className="text-xs text-green-500">● Online</p>
                            </div>
                          </div>
                        ))}
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