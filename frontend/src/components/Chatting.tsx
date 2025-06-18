import { useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Copy, Send, Users, MessageSquare } from 'lucide-react';
import Avatar from 'react-avatar';
import "react-toastify/dist/ReactToastify.css";

interface User {
  name: string;
  icon: string;
}

interface Message {
  name: string;
  message: string;
  icon: string;
}

interface SystemMessage {
  message: string;
  userCount: number;
  users: User[];
}

export const Chatting = () => {
    const webSocketRef = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<(Message | SystemMessage)[]>([]);
    const [username, setUsername] = useState<string>("");
    const [currMsg, setCurMsg] = useState<string>("");
    const [connected, setCon] = useState(false);
    const [roomid, setRoomid] = useState<string>("");
    const [userCount, setUserCount] = useState<number>(0);
    const [roomUsers, setRoomUsers] = useState<User[]>([]);
  
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
        setCurMsg("");
    };

    useEffect(() => {
        console.log("Setting up WebSocket connection...");
        const ws = new WebSocket("wss://zenchat-1-esw7.onrender.com");
        webSocketRef.current = ws;
    
        ws.onopen = () => {
          console.log("WebSocket connected successfully");
          toast.success("Connected to WebSocket server");
        };
    
        ws.onmessage = (event) => {
          try {
            console.log("Received message:", event.data);
            const data = JSON.parse(event.data);
            
            if (data.type === "system") {
              console.log("System message received:", data.payload);
              setUserCount(data.payload.userCount);
              setRoomUsers(data.payload.users);
              setMessages(prev => [...prev, {
                message: data.payload.message,
                userCount: data.payload.userCount,
                users: data.payload.users
              }]);
            } else if (data.type === "chat") {
              console.log("Chat message received:", data.payload);
              setMessages(prev => [...prev, {
                name: data.payload.name,
                message: data.payload.message,
                icon: data.payload.icon
              }]);
            }
          } catch (e) {
            console.error("Error parsing message:", e);
            toast.error("Error parsing message");
          }
        };
    
        ws.onerror = (error) => {
          console.error("WebSocket connection error:", error);
          toast.error("Failed to connect to WebSocket server. Please check if the server is running.");
        };
    
        ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          if (event.code === 1006) {
            toast.error("Connection lost. Server might be down or not supporting WebSockets.");
          } else {
            toast.warning("WebSocket connection closed");
          }
        };
    
        return () => {
          console.log("Cleaning up WebSocket connection...");
          if (webSocketRef.current) {
            webSocketRef.current.close();
          }
        };
    }, []);
    
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
              <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">ZENCHAT</h1>
                  <p className="text-gray-600 dark:text-gray-300">Connect and chat in real-time</p>
                </div>

                <div className="space-y-6">
                  <button
                    onClick={createRoom}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl transition-all duration-300 font-medium"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Create a new room
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or join existing</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <input
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300"
                      type="text"
                      placeholder="Enter your name"
                    />
                    <div className="flex gap-2">
                      <input
                        onChange={(e) => setRoomid(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300"
                        type="text"
                        placeholder="Enter room ID"
                      />
                      <button
                        onClick={() => joinRoom()}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 font-medium"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-4">
              <div className="w-full max-w-4xl h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Room: {roomid} • {userCount} {userCount === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomid);
                      toast.success("Room ID copied!");
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Room ID
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, index) => (
                    'userCount' in msg ? (
                      // System message
                      <div key={index} className="flex justify-center">
                        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                          {msg.message}
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
                            size="40"
                            round={true}
                            className="flex-shrink-0"
                          />
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.name === username
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">{msg.name}</p>
                          <p>{msg.message}</p>
                        </div>
                        {msg.name === username && (
                          <Avatar
                            name={msg.name}
                            size="40"
                            round={true}
                            className="flex-shrink-0"
                          />
                        )}
                      </div>
                    )
                  ))}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      value={currMsg}
                      onChange={(e) => setCurMsg(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300"
                      type="text"
                      placeholder="Type a message..."
                    />
                    <button
                      onClick={sendMsg}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    );
}