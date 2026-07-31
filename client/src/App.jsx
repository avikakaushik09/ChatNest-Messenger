import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

import Auth from "./Auth";

import {
  getCurrentUser,
  getUsers,
  getMessages,
  sendMessage,
  getGroups,
  createGroup,
} from "./api";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function App() {
  // ============================================
  // AUTH
  // ============================================

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ============================================
  // USERS
  // ============================================

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ============================================
  // GROUPS
  // ============================================

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  // ============================================
  // PRIVATE CHAT
  // ============================================

  const [selectedUser, setSelectedUser] = useState(null);

  // ============================================
  // MESSAGES
  // ============================================

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // ============================================
  // ONLINE USERS
  // ============================================

  const [onlineUsers, setOnlineUsers] = useState([]);

  // ============================================
  // TYPING
  // ============================================

  const [typing, setTyping] = useState(false);

  // ============================================
  // SEARCH
  // ============================================

  const [search, setSearch] = useState("");

  // ============================================
  // REFS
  // ============================================

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ============================================
  // STEP 1: REQUEST NOTIFICATION PERMISSION
  // ============================================

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // ============================================
  // CHECK LOGIN
  // ============================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    async function checkLogin() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.log(err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkLogin();
  }, []);

  // ============================================
  // LOAD USERS
  // ============================================

  useEffect(() => {
    if (!user) return;

    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const data = await getUsers();
        const filtered = data.filter(
          (u) => String(u._id) !== String(user._id)
        );
        setUsers(filtered);
      } catch (err) {
        console.log(err);
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, [user]);

  // ============================================
  // LOAD GROUPS
  // ============================================

  useEffect(() => {
    if (!user) return;

    async function loadGroups() {
      try {
        const data = await getGroups();
        setGroups(data);
      } catch (err) {
        console.log(err);
      }
    }

    loadGroups();
  }, [user]);

  // ============================================
  // AUTO SCROLL
  // ============================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ============================================
  // HELPER: TRIGGER DESKTOP NOTIFICATION & SOUND
  // (STEPS 2 - 6)
  // ============================================

  const triggerNotification = (newMessage) => {
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.visibilityState !== "visible"
    ) {
      // Step 6: Play audio
      try {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {}); // catch tab autoplay policy restrictions
      } catch (e) {
        console.log("Audio play error:", e);
      }

      // Step 4: Sender name
      const senderName =
        typeof newMessage.sender === "object"
          ? newMessage.sender.name
          : "New Message";

      // Step 5: Notification text body (file vs text)
      const bodyText =
        newMessage.messageType === "file"
          ? "📎 Sent a file"
          : newMessage.content || newMessage.text || "Sent a message";

      // Steps 2 & 3: Create Notification and add click listener
      const notification = new Notification(senderName, {
        body: bodyText,
        icon: "/logo.png",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // ============================================
  // SOCKET CONNECTION
  // ============================================

  useEffect(() => {
    if (!user) return;

    socket.connect();

    socket.on("connect", () => {
      console.log("Socket Connected:", socket.id);
      socket.emit("user_online", String(user._id));

      if (selectedGroup) {
        socket.emit("join_group", selectedGroup._id);
      }
    });

    // ONLINE USERS
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    // RECEIVE PRIVATE MESSAGE
    socket.on("receive_message", (newMessage) => {
      // Trigger notification if applicable
      triggerNotification(newMessage);

      if (!selectedUser) return;

      const sender =
        typeof newMessage.sender === "object"
          ? newMessage.sender._id
          : newMessage.sender;

      const receiver =
        typeof newMessage.receiver === "object"
          ? newMessage.receiver._id
          : newMessage.receiver;

      const myId = String(user._id);

      const belongsToCurrentChat =
        (String(sender) === myId &&
          String(receiver) === String(selectedUser.id)) ||
        (String(receiver) === myId &&
          String(sender) === String(selectedUser.id));

      if (!belongsToCurrentChat) return;

      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m._id &&
            newMessage._id &&
            String(m._id) === String(newMessage._id)
        );

        if (exists) return prev;
        return [...prev, newMessage];
      });

      socket.emit("messages_seen", {
        senderId: selectedUser.id,
      });
    });

    // MESSAGE DELIVERED
    socket.on("message_delivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId)
            ? { ...m, status: "delivered" }
            : m
        )
      );
    });

    // MESSAGES SEEN
    socket.on("messages_seen", ({ senderId }) => {
      if (selectedUser && String(selectedUser.id) === String(senderId)) {
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            status: "seen",
          }))
        );
      }
    });

    // RECEIVE GROUP MESSAGE
    socket.on("receive_group_message", (newMessage) => {
      // Trigger notification if applicable
      triggerNotification(newMessage);

      if (!selectedGroup) return;

      const msgGroupId =
        typeof newMessage.group === "object"
          ? newMessage.group._id
          : newMessage.group;

      if (String(msgGroupId) !== String(selectedGroup._id)) return;

      setMessages((prev) => {
        const exists = prev.some(
          (m) => String(m._id) === String(newMessage._id)
        );
        if (exists) return prev;
        return [...prev, newMessage];
      });
    });

    // TYPING
    socket.on("typing", ({ sender }) => {
      if (selectedUser && String(sender) === String(selectedUser.id)) {
        setTyping(true);
      }
    });

    socket.on("stop_typing", ({ sender }) => {
      if (selectedUser && String(sender) === String(selectedUser.id)) {
        setTyping(false);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("message_delivered");
      socket.off("messages_seen");
      socket.off("receive_group_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.disconnect();
    };
  }, [user, selectedUser, selectedGroup]);

  // ============================================
  // LOAD MESSAGES (PRIVATE & GROUP)
  // ============================================

  useEffect(() => {
    setMessages([]);

    if (selectedUser) {
      async function loadPrivateMessages() {
        try {
          const data = await getMessages(selectedUser.id);
          setMessages(data);

          socket.emit("messages_seen", {
            senderId: selectedUser.id,
          });
        } catch (err) {
          console.log(err);
        }
      }

      loadPrivateMessages();
    } else if (selectedGroup) {
      async function loadGroupMessages() {
        try {
          const data = await getMessages(selectedGroup._id);
          setMessages(data);

          socket.emit("join_group", selectedGroup._id);
        } catch (err) {
          console.log(err);
        }
      }

      loadGroupMessages();
    }
  }, [selectedUser, selectedGroup]);

  // ============================================
  // SELECT USER / GROUP
  // ============================================

  const selectUser = (person) => {
    setSelectedGroup(null);
    setSelectedUser({
      id: person._id,
      name: person.name,
      email: person.email,
      initial: person.name?.charAt(0).toUpperCase(),
    });
  };

  const selectGroup = (group) => {
    setSelectedUser(null);
    setSelectedGroup(group);
  };

  // ============================================
  // SEND TEXT MESSAGE
  // ============================================

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      if (selectedUser) {
        const savedMessage = await sendMessage({
          receiver: selectedUser.id,
          content: message.trim(),
          messageType: "text",
        });

        setMessages((prev) => [...prev, savedMessage]);
        socket.emit("send_message", savedMessage);
      } else if (selectedGroup) {
        const savedMessage = await sendMessage({
          group: selectedGroup._id,
          content: message.trim(),
          messageType: "text",
        });

        setMessages((prev) => [...prev, savedMessage]);
        socket.emit("send_group_message", savedMessage);
      }

      setMessage("");
    } catch (err) {
      console.log(err);
      alert("Unable to send message");
    }
  };

  // ============================================
  // HANDLE FILE UPLOAD
  // ============================================

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload",
        formData
      );

      console.log("Uploaded file:", res.data);

      if (selectedUser) {
        const savedMessage = await sendMessage({
          receiver: selectedUser.id,
          content: res.data.url,
          fileName: res.data.fileName || file.name,
          messageType: "file",
        });

        setMessages((prev) => [...prev, savedMessage]);
        socket.emit("send_message", savedMessage);
      } else if (selectedGroup) {
        const savedMessage = await sendMessage({
          group: selectedGroup._id,
          content: res.data.url,
          fileName: res.data.fileName || file.name,
          messageType: "file",
        });

        setMessages((prev) => [...prev, savedMessage]);
        socket.emit("send_group_message", savedMessage);
      }
    } catch (err) {
      console.log("File upload failed:", err);
      alert("Failed to upload file");
    } finally {
      e.target.value = "";
    }
  };

  // ============================================
  // CREATE GROUP HANDLERS
  // ============================================

  const handleCloseModal = () => {
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedMembers([]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Enter group name");
      return;
    }

    if (selectedMembers.length === 0) {
      alert("Select members");
      return;
    }

    try {
      const group = await createGroup({
        name: groupName,
        members: selectedMembers,
      });

      setGroups((prev) => [group, ...prev]);
      handleCloseModal();
    } catch (err) {
      console.log(err);
      alert("Unable to create group");
    }
  };

  // ============================================
  // SEARCH USERS & GROUPS
  // ============================================

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  // ============================================
  // LOGOUT
  // ============================================

  const logout = () => {
    socket.disconnect();
    localStorage.removeItem("token");
    setUser(null);
    setUsers([]);
    setGroups([]);
    setMessages([]);
    setSelectedUser(null);
    setSelectedGroup(null);
  };

  // ============================================
  // LOADING SCREEN
  // ============================================

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-5"></div>
          <h2 className="text-2xl font-bold">ChatNest Messenger</h2>
          <p className="text-slate-400 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // LOGIN SCREEN
  // ============================================

  if (!user) {
    return <Auth onLogin={(currentUser) => setUser(currentUser)} />;
  }

  // ============================================
  // MAIN UI
  // ============================================

  return (
    <div className="h-screen flex bg-slate-950 text-white overflow-hidden">
      {/* ============================================
          SIDEBAR
      ============================================ */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="h-20 border-b border-slate-800 flex items-center px-6">
          <div>
            <h1 className="text-2xl font-bold">ChatNest</h1>
            <p className="text-sm text-slate-400">Messenger</p>
          </div>
        </div>

        {/* Current User */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Search users or groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 outline-none focus:border-emerald-500 text-white placeholder-slate-400"
          />
        </div>

        {/* Chats Header */}
        <div className="px-5 flex justify-between items-center">
          <h2 className="font-semibold text-slate-300">Chats & Groups</h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-3 py-1 rounded font-bold transition-colors"
            title="Create Group"
          >
            +
          </button>
        </div>

        {/* Sidebar Chat & Group List */}
        <div className="flex-1 overflow-y-auto mt-3">
          {loadingUsers ? (
            <p className="text-center text-slate-400 mt-8">Loading...</p>
          ) : (
            <>
              {/* GROUPS LIST */}
              {filteredGroups.length > 0 && (
                <div className="mb-2">
                  <p className="px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Groups
                  </p>
                  {filteredGroups.map((group) => {
                    const active = selectedGroup?._id === group._id;

                    return (
                      <div
                        key={group._id}
                        onClick={() => selectGroup(group)}
                        className={`cursor-pointer px-5 py-3 flex items-center border-b border-slate-800/60 hover:bg-slate-800 transition ${
                          active ? "bg-slate-800" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
                            👥
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">
                              {group.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {group.members?.length || 0} members
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DIRECT MESSAGES / USERS LIST */}
              <div>
                <p className="px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Direct Messages
                </p>
                {filteredUsers.map((person) => {
                  const online = onlineUsers.includes(String(person._id));
                  const active = selectedUser?.id === person._id;

                  return (
                    <div
                      key={person._id}
                      onClick={() => selectUser(person)}
                      className={`cursor-pointer px-5 py-4 flex justify-between items-center border-b border-slate-800/60 hover:bg-slate-800 transition ${
                        active ? "bg-slate-800" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center font-bold">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p>{person.name}</p>
                          <p className="text-xs text-slate-500">{person.email}</p>
                        </div>
                      </div>

                      {online && (
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Logout */}
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={logout}
            className="w-full bg-red-500 hover:bg-red-600 transition-colors text-white rounded-lg py-3 font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ============================================
          MAIN CHAT AREA
      ============================================ */}
      <main className="flex-1 flex flex-col bg-slate-950">
        {/* Header */}
        <div className="h-20 border-b border-slate-800 flex items-center justify-between px-6">
          {selectedUser ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg">
                {selectedUser.initial}
              </div>
              <div>
                <h2 className="font-semibold text-lg">{selectedUser.name}</h2>
                <p className="text-sm text-slate-400">
                  {onlineUsers.includes(String(selectedUser.id))
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>
          ) : selectedGroup ? (
            <div>
              <h2 className="font-semibold text-lg">
                👥 {selectedGroup.name}
              </h2>
              <p className="text-sm text-slate-400">
                {selectedGroup.members?.length || 0} Members
              </p>
            </div>
          ) : (
            <h2 className="text-slate-400">Select a chat to start messaging</h2>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-500">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId =
                typeof msg.sender === "object"
                  ? msg.sender._id
                  : msg.sender;

              const mine = String(senderId) === String(user._id);

              return (
                <div
                  key={msg._id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md rounded-2xl px-5 py-3 ${
                      mine
                        ? "bg-emerald-500 text-black"
                        : "bg-slate-800 text-white"
                    }`}
                  >
                    {/* Group sender name */}
                    {selectedGroup && !mine && msg.sender?.name && (
                      <p className="text-xs font-semibold text-emerald-400 mb-1">
                        {msg.sender.name}
                      </p>
                    )}

                    {/* Display File or Text */}
                    {msg.messageType === "file" ? (
                      <a
                        href={msg.content}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 underline flex items-center gap-2 font-medium"
                      >
                        📄 {msg.fileName || "View Attachment"}
                      </a>
                    ) : (
                      <p>{msg.text || msg.content}</p>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-[11px] opacity-70">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                      {mine && (
                        <span className="text-xs ml-1">
                          {msg.status === "seen"
                            ? "✓✓"
                            : msg.status === "delivered"
                            ? "✓✓"
                            : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Typing */}
        {typing && (
          <div className="px-6 pb-2 text-sm text-slate-400">Typing...</div>
        )}

        {/* Message & File Input Section */}
        {(selectedUser || selectedGroup) && (
          <div className="border-t border-slate-800 p-5">
            <div className="flex gap-3 items-center">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
                title="Attach File"
              >
                📎
              </button>

              {/* Text Input */}
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder={
                  selectedGroup
                    ? "Message group..."
                    : "Type a message..."
                }
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-emerald-500 text-white placeholder-slate-400"
              />

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-7 py-3 rounded-xl transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ============================================
          CREATE GROUP MODAL
      ============================================ */}
      {showCreateGroup && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-[450px] bg-slate-900 rounded-2xl p-6 border border-slate-700 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-5">Create Group</h2>

            {/* Group Name */}
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-emerald-500 mb-5 text-white placeholder-slate-400"
            />

            {/* Members List */}
            <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-lg divide-y divide-slate-800">
              {users.map((person) => {
                const checked = selectedMembers.includes(person._id);

                return (
                  <label
                    key={person._id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      className="accent-emerald-500 w-4 h-4 rounded"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers((prev) => [...prev, person._id]);
                        } else {
                          setSelectedMembers((prev) =>
                            prev.filter((id) => id !== person._id)
                          );
                        }
                      }}
                    />
                    <span className="text-slate-200">{person.name}</span>
                  </label>
                );
              })}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;