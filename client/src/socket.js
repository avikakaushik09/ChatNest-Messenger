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

export default socket;