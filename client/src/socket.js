import { io } from "socket.io-client";

const socket = io("https://chatnest-messenger.onrender.com", {
  transports: ["websocket"],
  autoConnect: true,
});
socket.on("join_group", (groupId)=>{
    socket.join(groupId);
});

socket.on("group_message",(message)=>{
    io.to(message.group).emit("receive_group_message",message);
});
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chat-nest-messenger.vercel.app",
    ],
    credentials: true,
  },
});

export default socket;