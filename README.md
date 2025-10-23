# 🚀 ZENCHAT - Real-Time Chat Application

A modern, responsive real-time chat application built with React, TypeScript, and WebSocket technology. ZENCHAT provides instant messaging capabilities with a beautiful, responsive design.

## 🌐 Live URLs

| Service | URL |
|----------|-----|
| **Frontend (React)** | [https://zen-chat-gamma.vercel.app/](https://zen-chat-gamma.vercel.app/) |
| **Backend (Web Socket)** | [https://ws-zen-be.onrender.com](https://ws-zen-be.onrender.com) |

---

## ✨ Features

### 🎯 Core Functionality
- **Real-time messaging** with WebSocket connections
- **Room-based chat** system with unique room IDs
- **User authentication** with custom usernames
- **Live user count** and member tracking
- **Instant notifications** with sound alerts
- **Message timestamps** for conversation history

### 🎨 User Experience
- **Mobile-responsive design** that works on all devices
- **Dark/Light mode** support with system preference detection
- **User avatars** with consistent color coding
- **Message bubbles** with different colors for each user
- **System messages** for user join/leave notifications

### 📱 Mobile Features
- **Touch-optimized** interface for mobile devices
- **Slide-out members sidebar** on mobile
- **Responsive typography** and spacing
- **Thumb-friendly** button placement
- **Full-screen mobile experience**

### 🔧 Technical Features
- **TypeScript** for type safety and better development experience
- **Tailwind CSS** for utility-first styling
- **React Hooks** for state management
- **WebSocket** for real-time communication
- **Toast notifications** for user feedback
- **Error handling** and connection management

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - UI framework
- **TypeScript 5.3.3** - Type safety
- **Vite 5.1.0** - Build tool and dev server
- **Tailwind CSS 4.1.10** - Utility-first CSS framework
- **React Avatar** - User avatar generation
- **Date-fns** - Date formatting utilities
- **Lucide React** - Icon library
- **React Toastify** - Toast notifications

### Backend
- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **WebSocket (ws)** - Real-time communication
- **Express** - Web framework (if needed for future expansion)

## 🚀 Quick Start

### Prerequisites
- Node.js 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ZENCHAT
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   # Server will start on port 8080 (or PORT environment variable)
   ```

5. **Start the frontend development server**
   ```bash
   cd ../frontend
   npm run dev
   # Frontend will start on http://localhost:3000
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to start chatting!

## 📦 Deployment

### Frontend (Vercel)
The frontend is configured for deployment on Vercel.

### Backend (Render/Railway)
The backend is optimized for deployment on:
- **Render.com** - Free tier available


## 🎯 Usage Guide

### Creating a Room
1. Enter your username
2. Click "Create a new room" to generate a random room ID
3. Share the room ID with others to join

### Joining a Room
1. Enter your username
2. Enter the room ID provided by the room creator
3. Click "Join" to enter the chat

### Chat Features
- **Send messages** by typing and pressing Enter or clicking Send
- **View members** by clicking the Members button
- **Copy room ID** to share with others
- **Leave room** when finished chatting
- **Toggle sound notifications** on/off

## 🔮 Future Improvements

### 🚀 Enhanced Features
- **File sharing** - Upload and share images, documents
- **Voice messages** - Record and send audio clips
- **Message reactions** - Emoji reactions to messages
- **Message editing/deletion** - Modify sent messages
- **Message search** - Find specific messages in chat history

### 👥 User Management
- **User profiles** - Customizable profiles with avatars
- **User status** - Online, away, busy, invisible
- **Friend system** - Add and manage contacts


### 🎨 UI/UX Improvements
- **Custom themes** - Multiple color schemes
- **Message formatting** - Bold, italic, code blocks
- **Emoji picker** - Built-in emoji selection
- **Message preview** - Preview links and media
- **Typing indicators** - Show when users are typing
- **Read receipts** - Message read status

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Made with ❤️ by ZIAUL**